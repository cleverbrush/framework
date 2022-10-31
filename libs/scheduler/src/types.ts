import { InferType, SchemaRegistry } from '@cleverbrush/schema';

import { IJobRepository } from './jobRepository.js';

const registry = new SchemaRegistry()
    .addPreprocessor('StringToDate', (value) => {
        if (typeof value === 'undefined') return value;
        if (typeof value === 'string') {
            const time = Date.parse(value);
            if (Number.isNaN(time)) return value;
            return new Date(time);
        }
        return value;
    })
    .addSchema('Common.Date', ({ object }) =>
        object()
            .mapToType<Date>()
            .addValidator((value) =>
                value instanceof Date && !Number.isNaN(value)
                    ? {
                          valid: true
                      }
                    : {
                          valid: false,
                          errors: ['should be a valid Date object']
                      }
            )
    )
    .addSchema('Templates.Schedule', ({ object, number, alias }) =>
        object({
            /** Number of days between repeats */
            interval: number().min(1).max(356),
            /** Hour (0-23) */
            hour: number().min(0).max(23).optional(),
            /** Minute (0-59) */
            minute: number().min(0).max(59).optional(),
            /** Do not start earlier than this date */
            startsOn: alias('Common.Date').optional(),
            /** Do not repeat after this date */
            endsOn: alias('Common.Date').optional(),
            /** Max number of repeats (min 1) */
            maxOccurences: number().min(1).optional(),
            /** Skip this number of repeats - 1. Min value is 1.  */
            startingFromIndex: number().min(1).optional()
        })
            .setPropPreprocessor('endsOn', 'StringToDate')
            .addValidator((val) => {
                if (
                    'endsOn' in val &&
                    'maxOccurences' in val &&
                    // TODO: remove this clause when object validator is fixed in a new version
                    typeof val.endsOf !== 'undefined'
                ) {
                    return {
                        valid: false,
                        errors: ['either endsOn or maxOccurences is required']
                    };
                }
                return { valid: true };
            })
    )
    .addSchemaFrom(
        'Templates.Schedule',
        'Models.TaskScheduleMinute',
        ({ string, schema }) =>
            schema
                .removeProp('hour')
                .removeProp('minute')
                .addProps({
                    /** Repeat every minute */
                    every: string('minute')
                })
    )
    .addSchemaFrom(
        'Templates.Schedule',
        'Models.TaskScheduleDay',
        ({ string, schema }) =>
            schema.addProps({
                /** Repeat every day */
                every: string('day')
            })
    )
    .addSchemaFrom(
        'Templates.Schedule',
        'Models.TaskScheduleWeek',
        ({ schema, number, string, array }) =>
            schema.addProps({
                /** Repeat every week */
                every: string('week'),
                /** Day of week: array of no more than 7 numbers numbers (from 1 to 7 where 1 is Monday). */
                dayOfWeek: array()
                    .ofType(number().min(1).max(7))
                    .minLength(1)
                    .maxLength(7)
                    .addValidator((val) => {
                        const map = {};
                        for (let i = 0; i < val.length; i++) {
                            if (map[val[i]]) {
                                return {
                                    valid: false,
                                    errors: ['no duplicates allowed']
                                };
                            }
                            map[val[i]] = true;
                        }
                        return {
                            valid: true
                        };
                    })
            })
    )
    .addSchemaFrom(
        'Templates.Schedule',
        'Models.TaskScheduleMonth',
        ({ schema, string, number, union }) =>
            schema.addProps({
                /** Repeat every month */
                every: string('month'),
                /** Day - 'last' or number from 1 to 28 */
                day: union(string('last'), number().min(1).max(28))
            })
    )
    .addSchemaFrom(
        'Templates.Schedule',
        'Models.TaskScheduleYear',
        ({ schema, string, number, union }) =>
            schema.addProps({
                /** Repeat every year */
                every: string('year'),
                /** Day - 'last' or number from 1 to 28 */
                day: union(string('last')).or(number().min(1).max(28)),
                /** Month - number from 1 to 12 */
                month: number().min(1).max(12)
            })
    );

export const schemaRegistry = registry
    .addSchema('Models.Schedule', ({ alias, union }) =>
        union(
            alias('Models.TaskScheduleMinute'),
            alias('Models.TaskScheduleDay'),
            alias('Models.TaskScheduleWeek'),
            alias('Models.TaskScheduleMonth'),
            alias('Models.TaskScheduleYear')
        )
    )
    .addSchema(
        'Models.CreateJobRequest',
        ({ object, number, string, alias, union, func }) =>
            object({
                /** Id of job, must be uniq */
                id: string(),
                /** Path to js file (relative to root folder) */
                path: string().minLength(1),
                /** Job's schedule */
                schedule: alias('Models.Schedule'),
                /** Timeout for job (in milliseconds) */
                timeout: number().min(0).optional(),
                /** Arbitrary props for job (can be a callback returning props or Promise<props>) */
                props: union(object().canHaveUnknownProps(), func()).optional(),
                /** Job will be considered as disabled when more than that count of runs fails consequently */
                maxConsequentFails: number().min(0).optional()
            })
    );

export type Schedule = InferType<
    typeof schemaRegistry.schemas.Models.Schedule.schema
>;

export type CreateJobRequest = InferType<
    typeof schemaRegistry.schemas.Models.CreateJobRequest.schema
>;

export const Schemas = schemaRegistry;

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
