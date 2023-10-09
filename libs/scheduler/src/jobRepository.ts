import { Job, JobInstance, JobInstanceStatus, JobStatus } from './types.js';

type AddJobRequest = Omit<Job, 'status'>;
type AddJobInstanceRequest = Omit<JobInstance, 'id' | 'jobId'>;

export interface IJobRepository {
    getJobs(): Promise<Job[]>;
    getJobById(jobId: string): Promise<Job>;
    createJob(item: AddJobRequest): Promise<Job>;
    removeJob(jobId: string): Promise<void>;

    saveJob(job: Job): Promise<Job>;

    getInstancesWithStatus(
        jobId: string,
        status: JobInstanceStatus
    ): Promise<JobInstance[]>;

    addInstance(
        jobId: string,
        instance: AddJobInstanceRequest
    ): Promise<JobInstance>;

    saveInstance(instance: JobInstance): Promise<JobInstance>;
}

export class InMemoryJobRepository implements IJobRepository {
    private _jobs: Array<Job> = [];
    private _jobInstances: Array<JobInstance> = [];
    private _instanceId = 1;

    async getJobs(): Promise<Job[]> {
        return this._jobs;
    }

    async removeJob(jobId: string) {
        const job = this.getJobById(jobId);
        if (!job) throw new Error(`job with id ${jobId} doesn't exist`);
        this._jobs = this._jobs.filter((j) => j.id !== jobId);
    }

    async createJob(item: AddJobRequest): Promise<Job> {
        const job: Job = {
            ...item,
            status: 'active'
        };
        this._jobs.push(job);
        return job;
    }

    async getInstances(jobId: string): Promise<JobInstance[]> {
        return this._jobInstances.filter((ji) => ji.jobId === jobId);
    }

    async addInstance(
        jobId: string,
        instance: AddJobInstanceRequest
    ): Promise<JobInstance> {
        const newInstance = {
            ...instance,
            id: this._instanceId++,
            jobId
        };

        this._jobInstances.push(newInstance);

        return newInstance;
    }

    async getJobById(jobId: string): Promise<Job> {
        return this._jobs.find((j) => j.id === jobId);
    }

    async setJobStatus(jobId: string, status: JobStatus): Promise<Job> {
        const job = await this.getJobById(jobId);
        if (!job) return null;
        job.status = status;
        return job;
    }

    async saveJob(job: Job): Promise<Job> {
        const index = this._jobs.findIndex((j) => j.id === job.id);
        if (index !== -1) {
            this._jobs[index] = {
                ...job
            };
            return this._jobs[index];
        }

        const result = {
            ...job
        };

        this._jobs.push(result);
        return result;
    }

    async getInstancesWithStatus(
        jobId: string,
        status: JobInstanceStatus
    ): Promise<JobInstance[]> {
        return (await this.getInstances(jobId)).filter(
            (i) => i.status === status
        );
    }

    async getInstanceById(id: number): Promise<JobInstance> {
        return this._jobInstances.find((ji) => ji.id === id);
    }

    async saveInstance(instance: JobInstance): Promise<JobInstance> {
        const oldIndex = this._jobInstances.findIndex(
            (ji) => ji.id === instance.id
        );
        if (oldIndex !== -1) {
            this._jobInstances[oldIndex] = {
                ...instance
            };
            return this._jobInstances[oldIndex];
        }

        const result = {
            ...instance,
            id: this._instanceId++
        };

        this._jobInstances.push(result);
        return result;
    }
}
