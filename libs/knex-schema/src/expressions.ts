import {
    type InferType,
    type PropertyDescriptor,
    type SchemaTypeBrand,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from '@cleverbrush/schema';
import type { Knex } from 'knex';

/** A synchronous schema parser. Framework schemas implement this interface. */
export interface OutputSchema<T> {
    /**
     * Synchronously validate/convert a raw driver value, including null; throw to reject the query.
     */
    parse(value: unknown): T;
}

/** A supplied schema replaces default decoding and receives the raw SQL value. */
export interface AggregateOptions<
    S extends OutputSchema<any> | undefined = undefined
> {
    /**
     * Replace the default decoder with this parser; its output type becomes the aggregate result type.
     */
    output?: S;
}

/** Schema brands retain nullable/optional output modifiers unlike parse() alone. */
export type AggregateResult<S, Fallback> =
    S extends OutputSchema<any>
        ? S extends { readonly [K in SchemaTypeBrand]: unknown }
            ? InferType<S>
            : ReturnType<S['parse']>
        : Fallback;

export const COLUMN = Symbol('query-column');
export const EXPRESSION = Symbol('query-expression');

/** A schema-backed SQL column belonging to one explicit table alias. */
export interface AliasedColumn<T> {
    readonly [COLUMN]: {
        alias: string;
        column: string;
        schema: any;
    };
    /**
     * Type-only marker carrying column nullability and value type; not a runtime row value.
     */
    readonly __value?: T;
}

export type SelectableColumn =
    | PropertyDescriptor<any, any, any>
    | AliasedColumn<any>;

export type ColumnValue<C> =
    C extends AliasedColumn<infer T>
        ? T
        : C extends PropertyDescriptor<any, infer S, any>
          ? InferType<S>
          : never;

/** Numeric SQL overrides can return exact strings rather than JS numbers. */
export type ExtremumValue<C> = ExtremumResult<ColumnValue<C>>;

/** Widen numeric extrema for SQL overrides; all other columns retain their type. */
export type ExtremumResult<T> =
    | (NonNullable<T> extends number ? number | string : NonNullable<T>)
    | null;

export type AggregateKind =
    | 'count'
    | 'countDistinct'
    | 'sum'
    | 'avg'
    | 'min'
    | 'max';

/** An aggregate description; evaluated by SQL, never once per application row. */
export interface AggregateExpression<T> {
    readonly [EXPRESSION]: {
        kind: AggregateKind;
        column?: SelectableColumn;
        output?: OutputSchema<unknown>;
    };
    /**
     * Type-only marker describing the decoded result of this SQL expression.
     */
    readonly __result?: T;
}

export function isAggregate(value: unknown): value is AggregateExpression<any> {
    return !!value && typeof value === 'object' && EXPRESSION in value;
}

export function isColumn(value: unknown): value is SelectableColumn {
    return (
        !!value &&
        typeof value === 'object' &&
        (COLUMN in value || SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR in value)
    );
}

export function createAggregate<T>(
    kind: AggregateKind,
    column?: SelectableColumn,
    options?: AggregateOptions<any>
): AggregateExpression<T> {
    if (column !== undefined && !isColumn(column)) {
        throw new TypeError(`${kind}: expected a schema property descriptor`);
    }
    if (kind !== 'count' && !column) {
        throw new TypeError(`${kind}: a column is required`);
    }
    return Object.freeze({
        [EXPRESSION]: { kind, column, output: options?.output }
    });
}

/** Typed aggregate expressions for scalar or grouped object projections. */
export const aggregate = {
    /**
     * Describe COUNT(*) or COUNT(column) for a typed projection or HAVING clause.
     * @param column - Omit to count rows; supply a column to count its non-null values.
     * @param options - Optional raw-value parser; use undefined as column for custom COUNT(*).
     * @returns An expression decoded as a safe number unless a parser is supplied.
     * @throws During execution if the default result exceeds the safe integer range.
     */
    count<S extends OutputSchema<any> | undefined = undefined>(
        column?: SelectableColumn,
        options?: AggregateOptions<S>
    ) {
        return createAggregate<AggregateResult<S, number>>(
            'count',
            column,
            options
        );
    },
    /**
     * Describe COUNT(DISTINCT column), excluding nulls.
     * @param options - Optional parser replacing checked safe-integer decoding.
     * @returns A typed aggregate expression, not an executed query.
     */
    countDistinct<S extends OutputSchema<any> | undefined = undefined>(
        column: SelectableColumn,
        options?: AggregateOptions<S>
    ) {
        return createAggregate<AggregateResult<S, number>>(
            'countDistinct',
            column,
            options
        );
    },
    /**
     * Describe SUM(column) with exact database numeric text as the default result.
     * Empty/all-null inputs produce null. An output parser receives the raw driver
     * value and takes responsibility for precision and null handling.
     */
    sum<S extends OutputSchema<any> | undefined = undefined>(
        column: SelectableColumn,
        options?: AggregateOptions<S>
    ) {
        return createAggregate<AggregateResult<S, string | null>>(
            'sum',
            column,
            options
        );
    },
    /**
     * Describe AVG(column), preserving database numeric text or null by default.
     * An output parser can explicitly convert it to a number or domain decimal type.
     * Text output cannot recover precision already lost in floating-point storage.
     */
    avg<S extends OutputSchema<any> | undefined = undefined>(
        column: SelectableColumn,
        options?: AggregateOptions<S>
    ) {
        return createAggregate<AggregateResult<S, string | null>>(
            'avg',
            column,
            options
        );
    },
    /**
     * Describe MIN(column), returning the column representation or null.
     * Numeric/decimal/bigint SQL overrides preserve exact strings; dates return Date.
     * An optional output parser replaces this decoding policy.
     */
    min<
        C extends SelectableColumn,
        S extends OutputSchema<any> | undefined = undefined
    >(column: C, options?: AggregateOptions<S>) {
        return createAggregate<AggregateResult<S, ExtremumValue<C>>>(
            'min',
            column,
            options
        );
    },
    /**
     * Describe MAX(column), returning the column representation or null.
     * Numeric/decimal/bigint SQL overrides preserve exact strings; dates return Date.
     * An optional output parser replaces this decoding policy.
     */
    max<
        C extends SelectableColumn,
        S extends OutputSchema<any> | undefined = undefined
    >(column: C, options?: AggregateOptions<S>) {
        return createAggregate<AggregateResult<S, ExtremumValue<C>>>(
            'max',
            column,
            options
        );
    }
};

export function columnSchema(column: SelectableColumn): any {
    return COLUMN in column
        ? column[COLUMN].schema
        : column[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR].getSchema();
}

export function compileAggregate(
    knex: Knex,
    value: AggregateExpression<any>,
    resolve: (column: SelectableColumn) => string | Knex.Raw
): { sql: Knex.Raw; native: Knex.Raw; decode: (value: unknown) => unknown } {
    const { kind, column, output } = value[EXPRESSION];
    const argument = column ? knex.raw('??', [resolve(column)]) : knex.raw('*');
    const call =
        kind === 'countDistinct'
            ? knex.raw('count(distinct ?)', [argument])
            : knex.raw(`${kind}(?)`, [argument]);
    // PostgreSQL numeric/int8 results stay exact even with custom pg parsers.
    const schema = column ? columnSchema(column).introspect() : undefined;
    const sqlType: string = schema?.extensions?.columnType ?? '';
    const exactExtremum =
        /^(numeric|decimal|bigint|int8|bigserial)(\b|\()/i.test(sqlType);
    const textResult =
        !output &&
        (kind === 'sum' ||
            kind === 'avg' ||
            kind === 'count' ||
            kind === 'countDistinct' ||
            exactExtremum);
    return {
        native: call,
        sql: textResult ? knex.raw('cast(? as text)', [call]) : call,
        decode(raw) {
            if (output) return output.parse(raw);
            if (kind === 'count' || kind === 'countDistinct') {
                if (
                    (typeof raw !== 'string' &&
                        typeof raw !== 'number' &&
                        typeof raw !== 'bigint') ||
                    !/^\d+$/.test(String(raw))
                ) {
                    throw new TypeError('Invalid SQL count result');
                }
                const count = Number(raw);
                if (!Number.isSafeInteger(count) || count < 0) {
                    throw new RangeError(
                        'SQL count exceeds the safe integer range; supply an output schema'
                    );
                }
                return count;
            }
            if (raw === null) return null;
            if (textResult) return String(raw);
            if (schema?.type === 'date') {
                const date =
                    raw instanceof Date ? raw : new Date(raw as string);
                if (!Number.isFinite(date.getTime()))
                    throw new TypeError('Invalid SQL date result');
                return date;
            }
            return raw;
        }
    };
}
