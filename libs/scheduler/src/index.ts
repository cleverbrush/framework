import fs from 'fs';
import { EventEmitter } from 'events';
import { Readable, PassThrough } from 'stream';
import { access as fsAccess } from 'fs/promises';
import { join as pathJoin } from 'path';
import { Worker } from 'worker_threads';

import {
    JobSchedulerProps,
    CreateJobRequest,
    SchedulerStatus,
    Schedule,
    Job,
    JobInstance,
    JobInstanceStatus,
    Schemas
} from './types.js';

import { ScheduleCalculator } from './ScheduleCalculator.js';

import { IJobRepository, InMemoryJobRepository } from './jobRepository.js';

export { ScheduleCalculator, Schedule as TaskSchedule, Schemas };

type WorkerResult = {
    status: JobInstanceStatus;
    exitCode: number;
    error?: Error;
};

const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB
const CHECK_INTERVAL = 1000 * 10; // every 10 seconds
const SCHEDULE_JOB_SPAN = 1000 * 60; // 1 minute
const DEFAULT_JOB_TIMEOUT = 1000 * 20; // 20 seconds
const DEFAULT_MAX_CONSEQUENT_FAILS = 3;
const DEFAULT_MAX_RETRIES = 2;

type JobStartItem = {
    jobId: string;
    instanceId: number;
    stdout: Readable;
    stderr: Readable;
    startDate: Date;
};

type JobEndItem = JobStartItem & {
    endDate: Date;
};

type JobErrorItem = JobStartItem & {
    endDate: Date;
    error?: Error;
};

type JobMessageItem = Omit<JobStartItem, 'stdout' | 'stderr'> & {
    value: any;
};

type Events = {
    'job:start': (job: JobStartItem) => any;
    'job:end': (job: JobEndItem) => any;
    'job:error': (job: JobErrorItem) => any;
    'job:timeout': (job: JobErrorItem) => any;
    'job:message': (msg: JobMessageItem) => any;
};

interface IJobScheduler {
    on<T extends keyof Events>(name: T, callback: Events[T]): this;
    addJob(job: CreateJobRequest): Promise<void>;
    removeJob(id: string): Promise<void>;
}

/**
 * Job scheduler class that handles all the scheduling and running of jobs.
 */
export class JobScheduler extends EventEmitter implements IJobScheduler {
    protected _rootFolder: string;
    protected _status: SchedulerStatus = 'stopped';
    protected _defaultTimezone: string;

    protected _checkTimer;

    protected _jobsRepository: IJobRepository = new InMemoryJobRepository();

    protected _jobProps: Map<string, any> = new Map<string, any>();

    /**
     * Status of the scheduler.
     */
    public get status() {
        return this._status;
    }

    protected set status(val: SchedulerStatus) {
        if (val === this._status) return;
        this._status = val;
    }

    private scheduleCalculatorCache = new Map<string, ScheduleCalculator>();

    /**
     * Get the schedule calculator for a job by its id.
     * @param {Job} job
     * @returns {Promise<ScheduleCalculator>}
     */
    protected async getJobSchedule(job: Job) {
        if (this.scheduleCalculatorCache.has(job.id)) {
            return this.scheduleCalculatorCache.get(job.id);
        }

        const schedule = {
            ...job.schedule
        };

        if (typeof job.firstInstanceEndedAt !== 'undefined') {
            schedule.startsOn = job.firstInstanceEndedAt;
        }

        if (typeof job.successfullTimesRunned === 'number') {
            schedule.skipFirst = job.successfullTimesRunned - 1;
        }

        const res = new ScheduleCalculator(schedule);
        this.scheduleCalculatorCache.set(job.id, res);

        return res;
    }

    protected runWorkerWithTimeout(file: string, props: any, timeout: number) {
        const worker = new Worker(file, {
            workerData: props,
            execArgv: ['--unhandled-rejections=strict'],
            stderr: true,
            stdout: true
        });
        const promise = new Promise<WorkerResult>((resolve) => {
            let timedOut = false;
            let isFinished = false;
            let error;

            const timeoutTimer = setTimeout(() => {
                if (isFinished) return;
                timedOut = true;
                worker.terminate();
                resolve({
                    exitCode: 1,
                    status: 'timedout'
                });
            }, timeout);

            worker.on('error', (e) => {
                error = e;
            });

            worker.on('exit', (exitCode) => {
                if (isFinished) return;
                if (timedOut) return;
                clearTimeout(timeoutTimer);
                isFinished = true;
                resolve({
                    status: exitCode === 0 ? 'succeeded' : 'errored',
                    exitCode,
                    error
                });
            });
        });

        return {
            promise,
            worker
        };
    }

    private readToEnd(source: Readable): Promise<Buffer> {
        return new Promise<Buffer>((res, rej) => {
            const chunks = [];
            source.on('data', (chunk) => chunks.push(chunk));
            source.on('end', () => res(Buffer.concat(chunks)));
            source.on('error', (err) => rej(err));
        });
    }

    /**
     * Start a job instance. This will run the job and update the status of the instance.
     * @param {JobInstance} instance - The job instance to start.
     */
    protected async startJobInstance(instance: JobInstance): Promise<void> {
        const startDate = new Date();
        instance = await this._jobsRepository.saveInstance({
            ...instance,
            status: 'running',
            startDate
        });

        let status: JobInstanceStatus, exitCode: number;

        try {
            const job = await this._jobsRepository.getJobById(instance.jobId);

            const fileName = pathJoin(this._rootFolder, job.path);

            const props = this._jobProps.get(job.id);

            let finalProps = typeof props === 'function' ? props() : props;
            if (finalProps instanceof Promise) {
                finalProps = await finalProps;
            }

            instance = await this._jobsRepository.saveInstance({
                ...instance,
                status: 'running'
            });

            const { promise, worker } = this.runWorkerWithTimeout(
                fileName,
                finalProps,
                job.timeout
            );

            const stdOutPass = worker.stdout.pipe(
                new PassThrough({
                    highWaterMark: MAX_BUFFER_SIZE
                })
            );
            const stdErrPass = worker.stderr.pipe(
                new PassThrough({
                    highWaterMark: MAX_BUFFER_SIZE
                })
            );

            const stdOutForJobStart = worker.stdout.pipe(
                new PassThrough({
                    highWaterMark: MAX_BUFFER_SIZE
                })
            );
            const stdErrForJobStart = worker.stderr.pipe(
                new PassThrough({
                    highWaterMark: MAX_BUFFER_SIZE
                })
            );

            const stdOutForJobEnd = worker.stdout.pipe(
                new PassThrough({
                    highWaterMark: MAX_BUFFER_SIZE
                })
            );
            const stdErrForJobEnd = worker.stderr.pipe(
                new PassThrough({
                    highWaterMark: MAX_BUFFER_SIZE
                })
            );

            worker.on('message', (value) => {
                this.emit('job:message', {
                    instanceId: instance.id,
                    jobId: job.id,
                    startDate,
                    value
                });
            });

            this.emit('job:start', {
                instanceId: instance.id,
                jobId: job.id,
                stderr: stdErrForJobStart,
                stdout: stdOutForJobStart,
                startDate
            } as JobStartItem);

            const stdOutStr = (await this.readToEnd(stdOutPass)).toString();
            const stdErrStr = (await this.readToEnd(stdErrPass)).toString();

            const result = await promise;
            status = result.status;
            exitCode = result.exitCode;
            const { error } = result;

            const endDate = new Date();

            switch (status) {
                case 'errored':
                    this.emit('job:error', {
                        instanceId: instance.id,
                        jobId: job.id,
                        stderr: stdErrForJobEnd,
                        stdout: stdOutForJobEnd,
                        startDate,
                        endDate,
                        error
                    } as JobErrorItem);
                    break;
                case 'timedout':
                    this.emit('job:timeout', {
                        instanceId: instance.id,
                        jobId: job.id,
                        stderr: stdErrForJobEnd,
                        stdout: stdOutForJobEnd,
                        startDate,
                        endDate,
                        error
                    } as JobErrorItem);
                    break;
                default:
                    this.emit('job:end', {
                        instanceId: instance.id,
                        jobId: job.id,
                        stderr: stdErrForJobEnd,
                        stdout: stdOutForJobEnd,
                        startDate,
                        endDate
                    } as JobStartItem);
            }

            instance = await this._jobsRepository.saveInstance({
                ...instance,
                status,
                exitCode,
                stdErr: stdErrStr,
                stdOut: stdOutStr,
                endDate
            });
        } finally {
            const job = {
                ...(await this._jobsRepository.getJobById(instance.jobId))
            };

            job.timesRunned++;

            let shouldRetry = false;

            const schedule = await this.getJobSchedule(job);

            if (status !== 'succeeded') {
                if (
                    job.consequentFailsCount + 1 >= job.maxConsequentFails &&
                    job.maxConsequentFails > 0
                ) {
                    job.status = 'disabled';
                } else {
                    job.consequentFailsCount += 1;
                    shouldRetry = true;
                }
            } else {
                job.successfullTimesRunned++;
                job.consequentFailsCount = 0;
                if (!schedule.hasNext()) {
                    job.status = 'finished';
                }
            }

            await this._jobsRepository.saveJob(job);

            if (shouldRetry && instance.retryIndex < instance.maxRetries) {
                await this.startJobInstance({
                    ...instance,
                    retryIndex: instance.retryIndex + 1
                });
            }
        }
    }

    protected async scheduleJobTo(
        job: Job,
        date: Date,
        index: number
    ): Promise<JobInstance | null> {
        let timer;

        try {
            const now = new Date();
            let interval = date.getTime() - now.getTime();
            if (interval < 0) {
                interval = 0;
            }

            const instance = await this._jobsRepository.addInstance(job.id, {
                scheduledTo: date,
                status: 'scheduled',
                timeout: job.timeout,
                index,
                retryIndex: 0,
                maxRetries: job.maxRetries
            });

            timer = setTimeout(async () => {
                const actualJob = await this._jobsRepository.getJobById(job.id);

                if (!actualJob || actualJob.status !== 'active') {
                    instance.status = 'canceled';
                    await this._jobsRepository.saveInstance(instance);
                    return;
                }

                await this.startJobInstance(instance);
            }, interval);

            return instance;
        } catch (e) {
            clearTimeout(timer);
            // console.log(e);
            // console.log('task failed!');
            return null;
        }
    }

    protected async checkForUpcomingJobs(): Promise<void> {
        const jobs = await this._jobsRepository.getJobs();
        for (let i = 0; i < jobs.length; i++) {
            if (jobs[i].status !== 'active') continue;

            const schedule = await this.getJobSchedule(jobs[i]);

            if (schedule.hasNext()) {
                const scheduledInstances =
                    await this._jobsRepository.getInstancesWithStatus(
                        jobs[i].id,
                        'scheduled'
                    );

                while (schedule.hasNext(SCHEDULE_JOB_SPAN)) {
                    const { date: nextRun, index } = schedule.next();
                    if (nextRun < new Date()) continue;

                    if (jobs[i].noConcurrentRuns) {
                        const runingInstances =
                            await this._jobsRepository.getInstancesWithStatus(
                                jobs[i].id,
                                'running'
                            );

                        if (runingInstances.length > 0) {
                            return;
                        }
                    }

                    const alreadyScheduled = scheduledInstances.find(
                        (i) => i.index === index
                    );
                    if (alreadyScheduled) continue;

                    await this.scheduleJobTo(jobs[i], nextRun, index);
                }
            } else {
                jobs[i].status = 'finished';
                await this._jobsRepository.saveJob(jobs[i]);
            }
        }
    }

    /**
     * Starts the scheduler (all jobs will be scheduled and executed when it's time).
     */
    public async start() {
        if (this._status === 'started') {
            throw new Error('Scheduler is already started');
        }

        this.status = 'started';

        this._checkTimer = setInterval(
            this.checkForUpcomingJobs.bind(this),
            CHECK_INTERVAL
        );

        // TODO: add logic
    }

    /**
     * Stops the scheduler (all jobs will be stopped and no new jobs will be scheduled).
     */
    public stop() {
        if (this._status === 'stopped') {
            throw new Error('Scheduler is already stopped');
        }

        clearInterval(this._checkTimer);

        this.status = 'stopped';
        // TODO: add logic
    }

    /**
     * Checks if job exists by id
     * @param {string} jobId - id of the job
     * @returns {Promise<boolean>} - true if job exists, false otherwise
     */
    public async jobExists(jobId: string): Promise<boolean> {
        return (await this._jobsRepository.getJobById(jobId)) !== null;
    }

    /**
     * Removes job by its id
     * @param jobId {string} - id of the job
     * @returns {Promise<void>}
     */
    public async removeJob(jobId: string): Promise<void> {
        if (typeof jobId !== 'string' || !jobId) {
            throw new Error('id is required');
        }

        await this._jobsRepository.removeJob(jobId);
    }

    /**
     * Adds job to the scheduler
     * @param job {CreateJobRequest} - job to add
     */
    public async addJob(job: CreateJobRequest) {
        const validationResult =
            await Schemas.CreateJobRequestSchema.validate(job);
        if (!validationResult.valid) {
            throw new Error(
                `Invalid CreateJobRequest: ${validationResult.errors?.join(
                    '; '
                )}`
            );
        }

        const path = pathJoin(this._rootFolder, job.path);
        await fsAccess(path, fs.constants.R_OK);

        this._jobProps.set(job.id, job.props);

        await this._jobsRepository.createJob({
            id: job.id,
            createdAt: new Date(),
            schedule: job.schedule,
            timeout: job.timeout || DEFAULT_JOB_TIMEOUT,
            path: job.path,
            consequentFailsCount: 0,
            timesRunned: 0,
            successfullTimesRunned: 0,
            maxConsequentFails:
                typeof job.maxConsequentFails === 'number'
                    ? job.maxConsequentFails
                    : DEFAULT_MAX_CONSEQUENT_FAILS,
            maxRetries:
                typeof job.maxRetries === 'number'
                    ? job.maxRetries
                    : DEFAULT_MAX_RETRIES,
            noConcurrentRuns: job.noConcurrentRuns || false
        });
    }

    /**
     *
     * @param props {JobSchedulerProps} - scheduler properties
     */
    constructor(props: JobSchedulerProps) {
        super();
        if (typeof props.rootFolder !== 'string') {
            throw new Error('rootFolder must be a string');
        }
        if (typeof props.defaultTimeZone === 'string') {
            this._defaultTimezone = props.defaultTimeZone;
        }

        if (typeof props.persistRepository === 'object') {
            this._jobsRepository = props.persistRepository;
        }

        this._rootFolder = props.rootFolder;
    }

    public on<T extends keyof Events>(name: T, callback: Events[T]): this {
        super.on(name, callback);
        return this;
    }
}
