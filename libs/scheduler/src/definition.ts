import { createHash } from 'node:crypto';
import type { InferType } from '@cleverbrush/schema';
import type {
    JobDefinition,
    JobError,
    JobOptions,
    JobSchema,
    JsonValue,
    RunPolicy
} from './contracts.js';

/** Explicitly prevent retries when another execution cannot help. */
export class NonRetryableJobError extends Error {
    constructor(
        message: string,
        readonly code = 'non_retryable'
    ) {
        super(message);
        this.name = 'NonRetryableJobError';
    }
}
/** An expired, cancelled, or superseded attempt tried to write durable state. */
export class LeaseLostError extends Error {
    constructor() {
        super('The job lease is no longer owned by this attempt');
        this.name = 'LeaseLostError';
    }
}
/** The same idempotency key was submitted with different data or policy. */
export class SubmissionConflictError extends Error {
    constructor() {
        super('The idempotency key identifies a different submission');
        this.name = 'SubmissionConflictError';
    }
}
/** Validate integral configuration before creating timers. */
export function positive(
    value: number,
    label: string,
    maximum = Number.MAX_SAFE_INTEGER
): number {
    if (!Number.isSafeInteger(value) || value < 1 || value > maximum)
        throw new RangeError(label);
    return value;
}
/** Validate identities without silently trimming them. */
export function identity(value: string, label: string): string {
    if (typeof value !== 'string' || !value.trim() || value.length > 200)
        throw new TypeError(label);
    return value;
}
/** Snapshot strict JSON, rejecting getters, cycles, holes, and lossy values. */
export function jsonValue(value: unknown, maxBytes: number): JsonValue {
    const ancestors = new Set<object>();
    function visit(current: unknown): JsonValue {
        if (
            current === null ||
            typeof current === 'string' ||
            typeof current === 'boolean'
        )
            return current;
        if (typeof current === 'number' && Number.isFinite(current))
            return current;
        if (typeof current !== 'object' || current === null)
            throw new NonRetryableJobError(
                'Only JSON values are accepted',
                'invalid_payload'
            );
        if (ancestors.has(current))
            throw new NonRetryableJobError(
                'Cyclic job payload',
                'invalid_payload'
            );
        if (ancestors.size >= 100)
            throw new NonRetryableJobError(
                'Job payload nesting limit exceeded',
                'payload_limit'
            );
        if (
            !Array.isArray(current) &&
            Object.getPrototypeOf(current) !== Object.prototype &&
            Object.getPrototypeOf(current) !== null
        )
            throw new NonRetryableJobError(
                'Non-JSON object',
                'invalid_payload'
            );
        ancestors.add(current);
        let result: JsonValue;
        if (Array.isArray(current)) {
            const keys = Reflect.ownKeys(current);
            if (keys.length !== current.length + 1)
                throw new NonRetryableJobError(
                    'Unsupported JSON array properties',
                    'invalid_payload'
                );
            result = Array.from({ length: current.length }, (_, i) => {
                const descriptor = Object.getOwnPropertyDescriptor(
                    current,
                    String(i)
                );
                if (!descriptor?.enumerable || !('value' in descriptor))
                    throw new NonRetryableJobError(
                        'Unsupported JSON array property',
                        'invalid_payload'
                    );
                return visit(descriptor.value);
            });
        } else {
            result = {};
            for (const key of Reflect.ownKeys(current)) {
                const descriptor = Object.getOwnPropertyDescriptor(
                    current,
                    key
                )!;
                if (
                    typeof key !== 'string' ||
                    !descriptor.enumerable ||
                    !('value' in descriptor)
                )
                    throw new NonRetryableJobError(
                        'Unsupported JSON property',
                        'invalid_payload'
                    );
                Object.defineProperty(result, key, {
                    value: visit(descriptor.value),
                    enumerable: true,
                    writable: true,
                    configurable: true
                });
            }
        }
        ancestors.delete(current);
        return result;
    }
    const result = visit(value);
    if (Buffer.byteLength(JSON.stringify(result)) > maxBytes)
        throw new NonRetryableJobError(
            'Job payload size limit exceeded',
            'payload_limit'
        );
    return result;
}
/** Parse a boundary and reject transformations into non-JSON values. */
export function parsePayload<S extends JobSchema>(
    schema: S,
    value: unknown,
    maxBytes: number
): InferType<S> {
    const parsed = schema.validate(jsonValue(value, maxBytes));
    if (!parsed.valid)
        throw new NonRetryableJobError(
            'Job schema validation failed',
            'invalid_payload'
        );
    return jsonValue(parsed.object, maxBytes) as InferType<S>;
}
/** Canonical fingerprint independent of object property order. */
export function fingerprint(value: unknown): string {
    function ordered(item: any): any {
        if (Array.isArray(item)) return item.map(ordered);
        if (item !== null && typeof item === 'object')
            return Object.fromEntries(
                Object.keys(item)
                    .sort()
                    .map(key => [key, ordered(item[key])])
            );
        return item;
    }
    return createHash('sha256')
        .update(JSON.stringify(ordered(value)))
        .digest('hex');
}
/** Materialize a policy so future deployments cannot change accepted runs. */
export function jobPolicy(options: JobOptions = {}): RunPolicy {
    const retry = {
        maxAttempts: positive(
            options.retry?.maxAttempts ?? 1,
            'maxAttempts',
            1000
        ),
        initialDelayMs: positive(
            options.retry?.initialDelayMs ?? 1000,
            'initialDelayMs'
        ),
        maxDelayMs: positive(options.retry?.maxDelayMs ?? 60000, 'maxDelayMs')
    };
    if (retry.initialDelayMs > retry.maxDelayMs)
        throw new RangeError('initialDelayMs exceeds maxDelayMs');
    return {
        retry,
        timeoutMs: positive(
            options.timeoutMs ?? 300000,
            'timeoutMs',
            2147483647
        ),
        retentionMs: positive(
            options.retentionMs ?? 7 * 86400000,
            'retentionMs'
        ),
        maxPayloadBytes: positive(
            options.maxPayloadBytes ?? 1048576,
            'maxPayloadBytes'
        ),
        maxProgressBytes: positive(
            options.maxProgressBytes ?? 65536,
            'maxProgressBytes'
        ),
        maxProgressEvents: positive(
            options.maxProgressEvents ?? 10000,
            'maxProgressEvents'
        )
    };
}
/** Create a producer-safe definition, bindable to either execution mode. */
export function defineJob<
    I extends JobSchema,
    P extends JobSchema,
    O extends JobSchema
>(
    options: JobOptions & {
        name: string;
        version: number;
        input: I;
        progress: P;
        output: O;
    }
): JobDefinition<I, P, O> {
    const policy = jobPolicy(options);
    Object.freeze(policy.retry);
    Object.freeze(policy);
    const definition: JobDefinition<I, P, O> = {
        name: identity(options.name, 'job name'),
        version: positive(options.version, 'job version'),
        input: options.input,
        progress: options.progress,
        output: options.output,
        policy,
        handle: handler => Object.freeze({ definition, handler }),
        thread: moduleUrl => {
            if (moduleUrl.protocol !== 'file:')
                throw new TypeError('A trusted file URL is required');
            return Object.freeze({ definition, moduleUrl: moduleUrl.href });
        }
    };
    return Object.freeze(definition);
}
/** Persist bounded diagnostics without stack traces or exception properties. */
export function jobError(error: unknown): JobError {
    return {
        code:
            error instanceof NonRetryableJobError
                ? error.code
                : 'handler_error',
        message: (error instanceof Error
            ? error.message
            : 'Job execution failed'
        ).slice(0, 2000)
    };
}
