import {
    InferType,
    date,
    object,
    func,
    number,
    string,
    array,
    union
} from '@cleverbrush/schema';

import { IJobRepository } from './jobRepository.js';

const ScheduleSchemaBase = object({
    /** Number of intervals (days, months, minutes or weeks)
     * between repeats. Interval type depends of `every` value */
    interval: number().min(1).max(356),
    /** Hour (0-23) */
    hour: number().min(0).max(23).optional(),
    /** Minute (0-59) */
    minute: number().min(0).max(59).optional(),
    /** Do not start earlier than this date */
    startsOn: date().acceptJsonString().optional(),
    /** Do not repeat after this date */
    endsOn: date().acceptJsonString().optional(),
    /** Max number of repeats (min 1) */
    maxOccurences: number().min(1).optional(),
    /** Skip this number of repeats. Min value is 1.  */
    skipFirst: number().min(1).optional()
}).addValidator((val) => {
    if (
        'endsOn' in val &&
        'maxOccurences' in val &&
        typeof val.endsOn !== 'undefined'
    ) {
        return {
            valid: false,
            errors: [{ message: 'either endsOn or maxOccurences is required' }]
        };
    }
    return { valid: true };
});

const ScheduleMinuteSchema = ScheduleSchemaBase.omit('hour')
    .omit('minute')
    .addProps({
        /** Repeat every minute */
        every: string('minute')
    });

const ScheduleDaySchema = ScheduleSchemaBase.addProps({
    /** Repeat every day */
    every: string('day')
});

const ScheduleWeekSchema = ScheduleSchemaBase.addProps({
    /** Repeat every week */
    every: string('week'),
    /** Days of week for schedule */
    dayOfWeek: array()
        .of(number().min(1).max(7))
        .minLength(1)
        .maxLength(7)
        .addValidator((val) => {
            const map = {};
            for (let i = 0; i < val.length; i++) {
                if (map[val[i]]) {
                    return {
                        valid: false,
                        errors: [{ message: 'no duplicates allowed' }]
                    };
                }
                map[val[i]] = true;
            }
            return {
                valid: true
            };
        })
});

const ScheduleMonthSchema = ScheduleSchemaBase.addProps({
    /** Repeat every month */
    every: string('month'),
    /** Day - 'last' or number from 1 to 28 */
    day: union(string('last')).or(number().min(1).max(28))
});

const ScheduleYearSchema = ScheduleSchemaBase.addProps({
    /** Repeat every year */
    every: string('year'),
    /** Day - 'last' or number from 1 to 28 */
    day: union(string('last')).or(number().min(1).max(28)),
    /** Month - number from 1 to 12 */
    month: number().min(1).max(12)
});

const ScheduleSchema = union(ScheduleMinuteSchema)
    .or(ScheduleDaySchema)
    .or(ScheduleWeekSchema)
    .or(ScheduleMonthSchema)
    .or(ScheduleYearSchema);

const CreateJobRequestSchema = object({
    /** Id of job, must be uniq */
    id: string(),
    /** Path to js file (relative to root folder) */
    path: string().minLength(1),
    /** Job's schedule */
    schedule: ScheduleSchema,
    /** Timeout for job (in milliseconds) */
    timeout: number().min(0).optional(),
    /** Arbitrary props for job (can be a callback returning props or Promise<props>) */
    props: union(object().acceptUnknownProps()).or(func()).optional(),
    /** Job will be considered as disabled when more than that count of runs fails consequently
     * unlimited if negative
     */
    maxConsequentFails: number().optional(),
    /**
     * Job will be retried right away this times. Job will be retried on next schedule run if this number is exceeded.
     */
    maxRetries: number().optional().min(1)
});

/**
 * Schedule for job. Can be one of:
 * - every N minutes
 * - every N days
 * - every N weeks
 * - every N months
 * - every N years
 * - every N days of week
 * - every N months on N day
 * - every N years on N day of N month
 * - every N years on last day of N month
 */
export type Schedule = InferType<typeof ScheduleSchema>;

/**
 * Object used to create new job.
 */
export type CreateJobRequest = InferType<typeof CreateJobRequestSchema>;

export type Job = {
    /** Id of job */
    id: string;
    /** Job status */
    status: JobStatus;
    /** Job's schedule */
    schedule: Schedule;
    /** Path to the job's file (relative to the `rootFolder`) */
    path: string;
    /** Timeout for job (in milliseconds) */
    timeout: number;
    /** Date when job was created */
    createdAt: Date;
    /**
     * Date when job was started for the first time
     */
    startedAt?: Date;
    /**
     * Date when job was ended for the first time
     */
    firstInstanceEndedAt?: Date;
    /**
     * Number of times job was runned
     */
    timesRunned?: number;
    /**
     * Number of times job was runned successfully
     */
    successfullTimesRunned?: number;
    /**
     * Current number of consequent fails, resets to 0 when
     * job is runned successfully. If this number is greater than
     * `maxConsequentFails` job will be disabled.
     */
    consequentFailsCount: number;
    /**
     * Job will be considered as disabled when more than that count of runs fails consequently
     */
    maxConsequentFails: number;
    /**
     * Job will be retried right away this times. Job will be retried on
     * next schedule run if this number is exceeded.
     */
    maxRetries: number;
};

export type JobInstance = {
    /** Id of job instance */
    id: number;
    /** Id of job */
    jobId: string;
    /** Index of job instance in the schedule sequence */
    index: number;
    /** Status of the job instance */
    status: JobInstanceStatus;
    /** Timeout value for job */
    timeout: number;
    scheduledTo: Date;
    /** Date when job instance was started */
    startDate?: Date;
    /** Date when job instance was ended */
    endDate?: Date;
    /** Stdout of the job saved to string */
    stdOut?: string;
    /** Stderr of the job saved to string */
    stdErr?: string;
    /** Exit code of the job */
    exitCode?: number;
    /** Count of unsucessfull job retries in row*/
    retryIndex: number;
    /** Max number of retries */
    maxRetries: number;
};

export type JobSchedulerProps = {
    /**
     * Path to the folder where job files are located.
     */
    rootFolder: string;
    /**
     * Timezone for scheduling. Default is 'UTC'.
     */
    defaultTimeZone?: string;
    /**
     * Repository for persisting jobs.
     * @experimental
     */
    persistRepository?: IJobRepository;
};

export type JobStatus = 'active' | 'disabled' | 'finished';
export type SchedulerStatus = 'started' | 'stopped';
export type JobInstanceStatus =
    | 'running'
    | 'errored'
    | 'succeeded'
    | 'scheduled'
    | 'timedout'
    | 'canceled';

export const Schemas = {
    ScheduleSchemaBase,
    ScheduleSchema,
    CreateJobRequestSchema,
    ScheduleMinuteSchema,
    ScheduleDaySchema,
    ScheduleWeekSchema,
    ScheduleMonthSchema,
    ScheduleYearSchema
};
