import {
    type ArraySchemaBuilder,
    array,
    boolean,
    date,
    type InferExtensionMetadata,
    type InferType,
    number,
    type ObjectSchemaBuilder,
    object,
    type SchemaBuilder,
    string,
    union
} from '@cleverbrush/schema';
import type { Knex } from 'knex';
import { buildColumnMap } from './columns.js';
import { assertJsonValue } from './json-validation.js';

/** A schema builder accepted by the database-read schema compiler. */
export type ReadSchema = SchemaBuilder<any, any, any, any, any>;
/** A table/object schema accepted by schema-aware read queries. */
export type ReadObject = ObjectSchemaBuilder<any, any, any, any, any, any, any>;
/** Reconstruct structural schema types without discarding nested property schemas. */
export type SchemaForValue<T> = 0 extends 1 & T
    ? ReadSchema
    : NonNullable<T> extends Date
      ? SchemaBuilder<
            Date,
            undefined extends T ? false : true,
            null extends T ? true : false
        >
      : NonNullable<T> extends readonly (infer E)[]
        ? ArraySchemaBuilder<
              SchemaForValue<E>,
              undefined extends T ? false : true,
              null extends T ? true : false,
              undefined,
              false,
              {},
              NonNullable<T>
          >
        : NonNullable<T> extends object
          ? ObjectSchemaBuilder<
                {
                    [K in keyof NonNullable<T> & string]-?: SchemaForValue<
                        NonNullable<T>[K]
                    >;
                },
                undefined extends T ? false : true,
                null extends T ? true : false
            >
          : SchemaBuilder<
                NonNullable<T>,
                undefined extends T ? false : true,
                null extends T ? true : false
            >;

type StorageValue<S> =
    InferExtensionMetadata<S> extends {
        columnType: infer SQL extends string;
    }
        ? string extends SQL
            ? string | NonNullable<InferType<S>>
            : Lowercase<SQL> extends
                    | 'bigint'
                    | 'bigserial'
                    | 'int8'
                    | `decimal${string}`
                    | `numeric${string}`
              ? string
              : NonNullable<InferType<S>>
        : NonNullable<InferType<S>>;
/** Database columns are present; optional persisted values are represented by SQL null. */
export type ReadValue<S> =
    | StorageValue<S>
    | (undefined extends InferType<S> ? null : never)
    | (null extends InferType<S> ? null : never);
/** Structural schema for one decoded database column. */
export type ColumnReadSchema<S> = SchemaForValue<ReadValue<S>>;
/** Derive a row's scalar properties, excluding explicitly declared navigation keys. */
export type ObjectReadSchema<S, Relations extends PropertyKey = never> =
    S extends ObjectSchemaBuilder<infer P, any, any, any, any, any, any>
        ? ObjectSchemaBuilder<{
              [K in Exclude<keyof P, Relations> & string]: ColumnReadSchema<
                  P[K]
              >;
          }>
        : never;

/** Invalid or opaque query shapes are rejected instead of receiving invented schemas. */
export class ReadSchemaError extends Error {
    /** Describe an unsupported read shape or a decoded-value contract violation. */
    constructor(message: string) {
        super(message);
        this.name = 'ReadSchemaError';
    }
}

/** @internal One shared description drives SQL projection, decoding and row metadata. */
export interface ReadNode {
    schema: ReadSchema;
    exact: boolean;
    decode(value: unknown, path: string): any;
}

const exactSql = /^(numeric|decimal|bigint|bigserial|int8)(\b|\()/i;
const allowedSql: Record<string, RegExp> = {
    string: /^(text|varchar|character varying|char|character|uuid|citext)(\b|\()/i,
    number: /^(numeric|decimal|bigint|bigserial|int8|smallint|int2|integer|int|int4|serial|smallserial|real|float|float4|float8|double precision)(\b|\()/i,
    boolean: /^(boolean|bool)$/i,
    date: /^(date|timestamp|timestamptz)(\b|\()/i,
    object: /^jsonb?$/i,
    array: /^jsonb?$/i
};

/** @internal Compile output-only metadata, never replaying input preprocessors/defaults. */
export function compileReadSchema(source: ReadSchema, column = true): ReadNode {
    const info = source.introspect() as any;
    // default() can promote the inferred input/output requirement without changing
    // the underlying optional storage flag. That erased distinction cannot safely
    // describe a read where input defaults are intentionally not replayed.
    if (info.hasDefault && info.isRequired === false)
        throw new ReadSchemaError(
            'Defaulted optional schemas have ambiguous read nullability; declare storage without input defaults'
        );
    const sqlType = info.extensions?.columnType as string | undefined;
    if (sqlType && !allowedSql[info.type]?.test(sqlType))
        throw new ReadSchemaError(
            `Unsupported SQL type "${sqlType}" for ${info.type}`
        );
    const nullable = info.isNullable || (column && info.isRequired === false);
    const optional = !column && info.isRequired === false;
    const exact = column && !!sqlType && exactSql.test(sqlType);
    if (!column && sqlType && exactSql.test(sqlType))
        throw new ReadSchemaError(
            'Exact SQL numeric hints inside stored JSON cannot preserve precision; model those JSON values as strings'
        );
    let schema: any;
    let convert: (value: any, path: string) => any;
    switch (info.type) {
        case 'string':
            schema =
                info.equalsTo === undefined ? string() : string(info.equalsTo);
            convert = value => value;
            break;
        case 'number':
            schema = exact
                ? string()
                : info.equalsTo === undefined
                  ? number().isFloat()
                  : number(info.equalsTo);
            convert = (value, path) => {
                if (exact) {
                    if (typeof value !== 'string')
                        throw new ReadSchemaError(
                            `${path}: exact numeric text was not preserved by SQL`
                        );
                    return value;
                }
                if (typeof value !== 'number' || !Number.isFinite(value))
                    throw new ReadSchemaError(
                        `${path}: expected a finite database number`
                    );
                return value;
            };
            break;
        case 'boolean':
            schema = boolean();
            convert = value => value;
            break;
        case 'date':
            schema = date();
            convert = (value, path) => {
                // Native dates/timestamps are projected as text at every SQL depth.
                // Interpret timezone-less persisted values as UTC consistently;
                // explicit offsets retain their meaning and input Date objects
                // keep their instant. Do not depend on the driver's local timezone.
                const text =
                    typeof value === 'string' &&
                    /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?)?$/.test(
                        value
                    )
                        ? `${value.length === 10 ? `${value}T00:00:00` : value.replace(' ', 'T')}Z`
                        : value;
                const result =
                    value instanceof Date
                        ? value
                        : typeof text === 'string'
                          ? new Date(text)
                          : null;
                if (!result || !Number.isFinite(result.getTime()))
                    throw new ReadSchemaError(`${path}: invalid database date`);
                return result;
            };
            break;
        case 'object': {
            const children = Object.fromEntries(
                Object.entries(info.properties ?? {}).map(([key, child]) => [
                    key,
                    compileReadSchema(child as ReadSchema, false)
                ])
            );
            schema = object(
                Object.fromEntries(
                    Object.entries(children).map(([key, child]) => [
                        key,
                        child.schema
                    ])
                )
            );
            if (info.acceptUnknownProps) schema = schema.acceptUnknownProps();
            convert = (value, path) =>
                decodeObject(
                    children,
                    value,
                    path,
                    info.acceptUnknownProps === true
                );
            break;
        }
        case 'array': {
            if (!info.elementSchema)
                throw new ReadSchemaError(
                    'Array read schema requires an element schema'
                );
            const child = compileReadSchema(info.elementSchema, false);
            schema = array(child.schema);
            convert = (value, path) => {
                if (!Array.isArray(value))
                    throw new ReadSchemaError(`${path}: expected an array`);
                return value.map((item, index) =>
                    child.decode(item, `${path}[${index}]`)
                );
            };
            break;
        }
        case 'union': {
            const children: ReadNode[] = info.options.map(
                (option: ReadSchema) => compileReadSchema(option, column)
            );
            schema = children
                .slice(1)
                .reduce(
                    (s: any, child) => s.or(child.schema),
                    union(children[0].schema)
                );
            convert = (value, path) => {
                for (const child of children) {
                    try {
                        return child.decode(value, path);
                    } catch (error) {
                        if (!(error instanceof ReadSchemaError)) throw error;
                    }
                }
                throw new ReadSchemaError(
                    `${path}: no matching database union member`
                );
            };
            break;
        }
        default:
            throw new ReadSchemaError(
                `Cannot derive a database read schema for ${info.type}`
            );
    }
    if (nullable) schema = schema.nullable();
    if (optional) schema = schema.optional();
    return {
        schema,
        exact,
        decode(value, path) {
            if (value === null && nullable) return null;
            if (value === undefined && optional) return undefined;
            const converted = convert(value, path);
            if (!schema.validate(converted).valid)
                throw new ReadSchemaError(
                    `${path}: database value does not match the read schema`
                );
            return converted;
        }
    };
}

/** @internal Decode exactly the described fields, excluding internal or unselected columns. */
export function decodeObject(
    children: Record<string, ReadNode>,
    value: any,
    path: string,
    preserveUnknown = false
): Record<string, any> {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new ReadSchemaError(`${path}: expected a database object`);
    const result: Record<string, any> = {};
    if (preserveUnknown) {
        for (const [key, extra] of Object.entries(value)) {
            if (Object.hasOwn(children, key)) continue;
            try {
                assertJsonValue(extra);
            } catch (error) {
                throw new ReadSchemaError(`${path}.${key}: ${String(error)}`);
            }
            Object.defineProperty(result, key, {
                value: extra,
                enumerable: true,
                configurable: true,
                writable: true
            });
        }
    }
    for (const [key, child] of Object.entries(children)) {
        const decoded = child.decode(value[key], `${path}.${key}`);
        if (decoded !== undefined)
            Object.defineProperty(result, key, {
                value: decoded,
                enumerable: true,
                configurable: true,
                writable: true
            });
    }
    return result;
}

/** @internal Cast exact values before PostgreSQL/JSON parsing can round them. */
export function readExpression(
    knex: Knex,
    node: ReadNode,
    column: string | Knex.Raw
): Knex.Raw {
    return node.exact || node.schema.introspect().type === 'date'
        ? knex.raw('cast(?? as text)', [column])
        : knex.raw('??', [column]);
}

/** @internal Preserve exact numerics and dates before driver parsing of write-returning rows. */
export function returningReadColumns(
    knex: Knex,
    source: ReadObject
): Knex.Raw[] {
    const info = source.introspect();
    const excluded = new Set(
        ((info.extensions?.relations ?? []) as { name: string }[]).map(
            relation => relation.name
        )
    );
    const { propToCol } = buildColumnMap(source);
    return Object.entries(info.properties)
        .filter(([key]) => !excluded.has(key))
        .map(([key, schema]) => {
            const column = propToCol.get(key) ?? key;
            return knex.raw('? as ??', [
                readExpression(
                    knex,
                    compileReadSchema(schema as ReadSchema),
                    column
                ),
                column
            ]);
        });
}
