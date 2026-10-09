import type { Knex } from 'knex';
import { assertJsonValue } from './json-validation.js';
import { type ReadSchema, ReadSchemaError } from './read-schema.js';

const PARAMETER = Symbol('query-parameter');

/** A named value placeholder. Its value type is inferred where it is used. */
export class QueryParameter<Name extends string = string> {
    /** @internal Opaque placeholder identity. */
    readonly [PARAMETER] = true;
    /** @internal Create placeholders with parameter(). */
    constructor(
        /** Stable name used to share one positional argument across predicates. */
        readonly name: Name
    ) {
        Object.freeze(this);
    }
}

type IsUnion<T, Whole = T> = T extends Whole
    ? [Whole] extends [T]
        ? false
        : true
    : never;

/**
 * Mark a caller-supplied value in a schema-backed predicate.
 * Distinct names become positional arguments in first-appearance order;
 * repeating a name reuses its argument. No SQL is executed here.
 * @example query(db, User).where(t => t.id, parameter('id'))(42)
 */
export function parameter<const Name extends string>(
    name: Name &
        (string extends Name
            ? never
            : IsUnion<Name> extends true
              ? never
              : Name extends ''
                ? never
                : unknown)
): QueryParameter<Name> {
    if (typeof name !== 'string' || !name.length)
        throw new ReadSchemaError('Parameter names must be non-empty strings');
    return new QueryParameter(name);
}

/** @internal */
export function isParameter(value: unknown): value is QueryParameter {
    return value instanceof QueryParameter;
}

/** @internal One schema constraint at one occurrence of a named argument. */
export interface ParameterUse {
    name: string;
    schema: ReadSchema;
}

/** @internal Values already validated and snapshotted for one invocation. */
export type ParameterValues = ReadonlyMap<string, unknown>;

/** @internal Native SQL bindings retain these objects until template compilation. */
export class ParameterSlot {
    constructor(
        readonly name: string,
        readonly mode: 'value' | 'isNull' | 'json' = 'value'
    ) {
        Object.freeze(this);
    }
}

/** @internal Snapshot values without retaining caller-owned mutable objects. */
export function copyBinding(value: any): any {
    if (value instanceof Date) return new Date(value.getTime());
    if (Buffer.isBuffer(value)) return Buffer.from(value);
    if (Array.isArray(value)) return value.map(copyBinding);
    if (value && typeof value === 'object') {
        const prototype = Object.getPrototypeOf(value);
        if (prototype === Object.prototype || prototype === null)
            return Object.fromEntries(
                Object.entries(value).map(([key, item]) => [
                    key,
                    copyBinding(item)
                ])
            );
    }
    return value;
}

/** @internal Reject placeholders in APIs without schema-derived argument types. */
export function assertNoParameters(
    value: unknown,
    seen = new Set<object>()
): void {
    if (isParameter(value) || value instanceof ParameterSlot)
        throw new ReadSchemaError(
            'Parameters require a schema-typed predicate; bind the query before using raw APIs'
        );
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
        for (const item of value) assertNoParameters(item, seen);
    } else if (
        Object.getPrototypeOf(value) === Object.prototype ||
        Object.getPrototypeOf(value) === null
    ) {
        for (const item of Object.values(value)) assertNoParameters(item, seen);
    }
}

/** @internal Compatible storage types can share an argument, including nullability narrowing. */
export function validateParameterUses(uses: readonly ParameterUse[]): void {
    const types = new Map<string, { type: string; literal: unknown }>();
    for (const use of uses) {
        const info = use.schema.introspect();
        const type = info.type;
        const literal = 'equalsTo' in info ? info.equalsTo : undefined;
        const previous = types.get(use.name);
        if (
            previous &&
            (previous.type !== type ||
                (previous.literal !== undefined &&
                    literal !== undefined &&
                    previous.literal !== literal))
        )
            throw new ReadSchemaError(
                `Parameter "${use.name}" is used with incompatible column types`
            );
        types.set(use.name, { type, literal: previous?.literal ?? literal });
    }
}

/** @internal Validate storage values, without applying input defaults or preprocessors. */
export function validateParameterValue(
    use: ParameterUse,
    value: unknown
): void {
    const info = use.schema.introspect() as any;
    const fail = () => {
        throw new ReadSchemaError(`Invalid value for parameter "${use.name}"`);
    };
    if (value === undefined) fail();
    if (value === null) {
        if (!info.isNullable) fail();
        return;
    }
    if (info.type === 'date') {
        if (!(value instanceof Date) || !Number.isFinite(value.getTime()))
            fail();
    } else if (info.type === 'object' || info.type === 'array') {
        assertJsonValue(value, true);
        if (!use.schema.validate(value).valid) fail();
    } else if (
        typeof value !== info.type ||
        (typeof value === 'number' && !Number.isFinite(value)) ||
        (info.equalsTo !== undefined && info.equalsTo !== value)
    ) {
        fail();
    }
}

/** @internal A value or null-test binding for either compilation or a bound reader. */
export function parameterBinding(
    parameter: QueryParameter,
    values?: ParameterValues,
    mode: ParameterSlot['mode'] = 'value'
): Knex.RawBinding {
    if (!values?.has(parameter.name))
        return new ParameterSlot(parameter.name, mode) as any;
    const value = values.get(parameter.name);
    return (
        mode === 'isNull'
            ? value === null
            : mode === 'json' && value !== null
              ? JSON.stringify(copyBinding(value))
              : copyBinding(value)
    ) as any;
}
