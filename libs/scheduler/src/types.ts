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
    /** Number of days between repeats */
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
        .setItemSchema(number().min(1).max(7))
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

export type Schedule = InferType<typeof ScheduleSchema>;

export type CreateJobRequest = InferType<typeof CreateJobRequestSchema>;

export type Job = {
    id: string;
    status: JobStatus;
    schedule: Schedule;
    path: string;
    timeout: number;
    createdAt: Date;
    startedAt?: Date;
    firstInstanceEndedAt?: Date;
    timesRunned?: number;
    successfullTimesRunned?: number;
    consequentFailsCount: number;
    maxConsequentFails: number;
    maxRetries: number;
};

export type JobInstance = {
    id: number;
    jobId: string;
    index: number;
    status: JobInstanceStatus;
    timeout: number;
    scheduledTo: Date;
    startDate?: Date;
    endDate?: Date;
    stdOut?: string;
    stdErr?: string;
    exitCode?: number;
    retryIndex: number;
    maxRetries: number;
};

export type JobSchedulerProps = {
    rootFolder: string;
    defaultTimeZone?: string;
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
