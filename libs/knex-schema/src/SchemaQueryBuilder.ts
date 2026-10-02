import {
    type ArraySchemaBuilder,
    array,
    EXTRA_TYPE_BRAND,
    type InferType,
    type ObjectSchemaBuilder,
    object,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from '@cleverbrush/schema';
import type { Knex } from 'knex';
import {
    buildColumnMap,
    getPrimaryKeyColumns,
    resolvePropertyKey
} from './columns.js';
import type { RelationInfo, SchemaProps } from './entity.js';
import {
    type AggregateExpression,
    type AggregateKind,
    type AggregateOptions,
    type AggregateResult,
    type AliasedColumn,
    COLUMN,
    compileAggregate,
    createAggregate,
    isAggregate,
    type OutputSchema
} from './expressions.js';
import { getProjections, getTableName, getVariants } from './extension.js';
import { OpaqueQuery, type QueryOutput } from './OpaqueQuery.js';
import {
    type CompositeCursorOptions,
    compositeCursor
} from './operations/composite-cursor.js';
import type { ScopesOf } from './operations/helpers.js';
import { getQuerySourceCtor } from './operations/helpers.js';
import { getState } from './operations/state.js';
import { PolymorphicQueryBuilder } from './PolymorphicQueryBuilder.js';
import { QuerySource } from './QuerySource.js';
import type { ReadRelations, ReadVariantMetadata } from './read-entity.js';
import {
    captureReadRaw,
    captureValue,
    type ReadPredicate,
    type ReadPredicateContext,
    type ReadPredicateSelector,
    ReadPredicates
} from './read-predicates.js';
import { compileReadProjection, type ReadField } from './read-projection.js';
import {
    type ColumnReadSchema,
    compileReadSchema,
    decodeObject,
    type ObjectReadSchema,
    type ReadNode,
    type ReadObject,
    type ReadSchema,
    ReadSchemaError,
    readExpression,
    type SchemaForValue
} from './read-schema.js';

export { type BoundQuery, createQuery, query } from './query.js';

import type {
    ColumnRef,
    CursorPaginationResult,
    InsertType,
    JoinManySpec,
    JoinOneSpec,
    PaginationResult,
    RelationSpec
} from './types.js';

const READ_COLUMN = Symbol('schema-read-column');
const JSON_PATH = Symbol('schema-json-path');
/** @internal Nominal read-query identity used without recursively comparing fluent APIs. */
export const READ_QUERY = Symbol('schema-read-query');
/** Minimal type surface for a customizer's strongly inferred result schema. */
export interface ReadQueryShape<R extends ReadSchema = ReadSchema> {
    /** @internal Nominal marker; constructing a plain schema object is not a query. */
    readonly [READ_QUERY]: true;
    /** Decoded result schema inferred from the returned query. */
    readonly rowSchema: R;
}
let readAliasSequence = 0;
/** A typed SQL column; selectors receive descriptions, not row values. */
export interface ReadColumn<S extends ReadSchema, K extends string = string>
    extends AliasedColumn<InferType<S>, S> {
    /** @internal Decoding and projection metadata shared by the query compiler. */
    readonly [READ_COLUMN]: ReadNode;
    /** @internal Captured JSON path beneath a storage column. */
    readonly [JSON_PATH]?: readonly string[];
    /** Type-only property identity for column-list projections. */
    readonly __property?: K;
}
// Map directly over source properties and filter in `as` so TypeScript retains
// their declarations/JSDoc. Mapping a computed key union loses those origins.
// Explicit modifiers keep the existing required, mutable column slots.
/** A JSON object column also exposes its known nested properties. */
export type NestedReadColumn<S, Key extends string = string> = ReadColumn<
    ColumnReadSchema<S>,
    Key
> &
    (S extends ReadObject
        ? {
              -readonly [K in keyof SchemaProps<S> as K extends string
                  ? K
                  : never]-?: NestedReadColumn<
                  SchemaProps<S>[K],
                  `${Key}.${K & string}`
              >;
          }
        : {});
/** Columns available for typed projections and filters. */
export type ReadColumns<
    S extends ReadObject,
    Relations extends PropertyKey = never
> = {
    -readonly [K in keyof SchemaProps<S> as K extends Relations
        ? never
        : K extends string
          ? K
          : never]-?: NestedReadColumn<SchemaProps<S>[K], K & string>;
};
type SelectedValue<Columns, Selector> =
    | (Selector extends (...args: any[]) => AliasedColumn<infer Value>
          ? Value
          : Selector extends keyof Columns
            ? Columns[Selector] extends AliasedColumn<infer Value>
                ? Value
                : never
            : never)
    | null;
type Selection = Record<string, ReadColumn<any> | AggregateExpression<any>>;
// Keep each side's property origins while retaining the right side's precedence.
type MergeProps<A, B> = {
    -readonly [K in keyof Required<A> as K extends keyof B ? never : K]: A[K];
} & { -readonly [K in keyof Required<B>]: B[K] };
type NamedProjections<S> = S extends { readonly [EXTRA_TYPE_BRAND]?: infer P }
    ? P
    : {};
type NamedKeys<
    S,
    K extends keyof NamedProjections<S>
> = NamedProjections<S>[K] extends readonly (infer Key extends string)[]
    ? Key
    : never;
/** Structural schema inferred from a typed projection. */
export type ReadProjection<S extends Selection> = ObjectSchemaBuilder<{
    -readonly [K in keyof S as K extends string
        ? K
        : never]-?: S[K] extends ReadColumn<infer R>
        ? R
        : S[K] extends AggregateExpression<infer T>
          ? SchemaForValue<T>
          : never;
}>;
type AddField<
    S extends ReadObject,
    K extends string,
    F extends ReadSchema,
    Origin = SchemaProps<S>
> = ObjectSchemaBuilder<
    // Declared includes have an origin; ad-hoc join aliases may introduce a key.
    Omit<SchemaProps<S>, K> & {
        -readonly [P in keyof Pick<Origin, Extract<K, keyof Origin>>]-?: F;
    } & Record<Exclude<K, keyof Origin>, F>
>;
/** @internal Foreign schema retained by a declared relation. */
export type Related<R> = R extends RelationInfo<any, infer S> ? S : never;
/** @internal Output cardinality and nullability of a loaded relation. */
export type RelationField<R, S extends ReadSchema> =
    R extends RelationInfo<'hasMany' | 'belongsToMany', any>
        ? ArraySchemaBuilder<S>
        : R extends RelationInfo<'belongsTo', any>
          ? R extends { optional: infer O }
              ? true extends O
                  ? SchemaForValue<InferType<S> | null>
                  : S
              : S
          : SchemaForValue<InferType<S> | null>;
type AnyReadQuery =
    | SchemaQueryBuilder<any, any, any, boolean>
    | PolymorphicQueryBuilder<any, any>;
type Loaded = {
    name: string;
    query: AnyReadQuery;
    relation: RelationSpec;
    required: boolean;
};
/** Query factory result: a table query or a declared polymorphic union. */
export type SchemaAwareQuery<S extends ReadObject> =
    ReadVariantMetadata<S> extends {
        discriminator: string;
        variants: Record<string, unknown>;
    }
        ? PolymorphicQueryBuilder<S>
        : SchemaQueryBuilder<S>;
/** @internal Apply parent correlation before child selection, ordering and pagination. */
export type ReadCorrelation = (
    query: Knex.QueryBuilder,
    alias: string,
    source: ReadObject
) => void;

/**
 * Immutable table query whose row schema follows its decoded selection and relations.
 * Configuration returns independent lazy builders; metadata access never executes SQL.
 * Only unprojected table queries can write. Full ORM rows may participate in tracking.
 */
export class SchemaQueryBuilder<
    S extends ReadObject,
    Row extends ReadObject = ObjectReadSchema<S, keyof ReadRelations<S>>,
    Relations extends Record<string, RelationInfo> = ReadRelations<S>,
    Writable extends boolean = true
> extends ReadPredicates<ReadColumns<S, keyof Relations>> {
    /** @internal Nominal identity for typed child-query customizers. */
    declare readonly [READ_QUERY]: true;
    private declare readonly writable: Writable;
    private readonly alias = `__schema_read_${readAliasSequence++}`;
    private fields: Record<string, ReadField>;
    private loaded: Loaded[] = [];
    private base: Knex.QueryBuilder;
    private selected = false;
    private grouped = false;
    private distinctRows = false;
    private defaults?: Knex.QueryBuilder;
    private skipDefaults = false;
    private deleted: 'exclude' | 'include' | 'only' = 'exclude';
    private readonly columns: Record<string, ReadColumn<any>>;
    private readonly columnSet = new Set<ReadColumn<any>>();
    /** Runtime structural schema; stable across filters, pagination and transaction clones. */
    readonly rowSchema: Row;

    /** @internal Use query() or createQuery() instead of constructing directly. */
    constructor(
        private readonly knex: Knex,
        private readonly source: S,
        base: Knex.QueryBuilder,
        alias?: string
    ) {
        super();
        if (alias !== undefined) this.alias = alias;
        this.base = knex.queryBuilder().from(base.clone().as(this.alias));
        const relations = (source.introspect().extensions?.relations ??
            []) as RelationSpec[];
        const excluded = new Set(relations.map(r => r.name));
        const { propToCol } = buildColumnMap(source);
        this.fields = Object.create(null);
        this.columns = Object.create(null);
        for (const [key, schema] of Object.entries(
            source.introspect().properties ?? {}
        )) {
            if (excluded.has(key)) continue;
            const node = compileReadSchema(schema as ReadSchema);
            const column = `${this.alias}.${propToCol.get(key) ?? key}`;
            this.columns[key] = this.describeColumn(
                schema as ReadSchema,
                propToCol.get(key) ?? key
            );
            this.fields[key] = {
                node,
                expression: knex => readExpression(knex, node, column)
            };
        }
        this.rowSchema = this.schema() as Row;
        const defaultScope = source.introspect().extensions?.defaultScope;
        if (typeof defaultScope === 'function') {
            const scope = this.copy();
            scope.base = knex.queryBuilder();
            this.defaults = this.checkScope(
                scope,
                defaultScope(scope)
            ).base.clone();
        }
    }

    private describeColumn(
        schema: ReadSchema,
        column: string,
        path: readonly string[] = []
    ): ReadColumn<any> {
        const described: ReadColumn<any> = {
            [COLUMN]: {
                alias: this.alias,
                column,
                schema
            },
            [READ_COLUMN]: compileReadSchema(schema),
            [JSON_PATH]: path
        };
        this.columnSet.add(described);
        const info = schema.introspect();
        if (info.type === 'object') {
            for (const [key, child] of Object.entries((info as any).properties))
                Object.defineProperty(described, key, {
                    value: this.describeColumn(child as ReadSchema, column, [
                        ...path,
                        key
                    ]),
                    enumerable: true
                });
        }
        return described;
    }

    private schema(): ReadObject {
        return object(
            Object.fromEntries(
                Object.entries(this.fields).map(([key, field]) => [
                    key,
                    field.node.schema
                ])
            )
        );
    }

    private copy(): this {
        const copy = Object.create(Object.getPrototypeOf(this)) as this;
        Object.assign(copy, this, {
            base: this.base.clone(),
            fields: { ...this.fields },
            loaded: [...this.loaded]
        });
        return copy;
    }

    /** @internal Prevent customizers from substituting an unrelated query source. */
    sameSource(other: unknown): boolean {
        return (
            other instanceof SchemaQueryBuilder &&
            this.columns === other.columns
        );
    }

    private column(
        selector: ReadPredicateSelector<ReadColumns<S, keyof Relations>>
    ): ReadColumn<any> {
        const column =
            typeof selector === 'string'
                ? selector
                      .split('.')
                      .reduce((node: any, key) => node?.[key], this.columns)
                : selector(this.columns as ReadColumns<S, keyof Relations>);
        if (!column || !this.columnSet.has(column as ReadColumn<any>))
            throw new ReadSchemaError(
                'Column does not belong to this read query'
            );
        return column as ReadColumn<any>;
    }

    private name(
        column: ReadColumn<any>,
        alias = column[COLUMN].alias
    ): string | Knex.Raw {
        const name = `${alias}.${column[COLUMN].column}`;
        const path = column[JSON_PATH];
        if (!path?.length) return name;
        const type = column[READ_COLUMN].schema.introspect().type;
        const json = type === 'array' || type === 'object';
        const extracted = this.knex.raw(`?? ${json ? '#>' : '#>>'} ?::text[]`, [
            name,
            [...path]
        ]);
        if (type === 'number')
            return this.knex.raw('cast(? as numeric)', [extracted]);
        if (type === 'boolean')
            return this.knex.raw('cast(? as boolean)', [extracted]);
        return extracted;
    }

    private checkScope(input: this, result: unknown): this {
        if (
            !(result instanceof SchemaQueryBuilder) ||
            !input.sameSource(result) ||
            result.rowSchema !== input.rowSchema ||
            result.grouped !== input.grouped ||
            result.selected !== input.selected ||
            result.distinctRows !== input.distinctRows ||
            result.deleted !== input.deleted ||
            result.skipDefaults !== input.skipDefaults ||
            result.knex !== input.knex
        ) {
            if (result instanceof Promise) void result.catch(() => {});
            throw new ReadSchemaError(
                'Scopes must synchronously return the supplied query with filters, ordering or pagination only'
            );
        }
        // The runtime checks above preserve this query's shape; instanceof
        // alone cannot recover its schema and relation type parameters.
        return result as unknown as this;
    }

    /** Apply a named, synchronous shape-preserving scope once to an independent query. */
    scoped(name: ScopesOf<S>): this {
        const scope = (
            this.source.introspect().extensions?.scopes as
                | Record<string, Function>
                | undefined
        )?.[name];
        if (!scope) throw new ReadSchemaError(`Unknown scope: ${name}`);
        const copy = this.copy();
        return this.checkScope(copy, scope(copy));
    }

    /** Exclude only the default scope; keep explicitly configured predicates. */
    unscoped(): this {
        const copy = this.copy();
        copy.skipDefaults = true;
        return copy;
    }

    /** Include soft-deleted rows without changing the source query. */
    withDeleted(): this {
        const copy = this.copy();
        copy.deleted = 'include';
        return copy;
    }

    /** Match only soft-deleted rows. */
    onlyDeleted(): this {
        const copy = this.copy();
        copy.deleted = 'only';
        return copy;
    }

    /** True only when rows retain their complete entity shape. */
    get returnsEntityRows(): boolean {
        return !this.selected && !this.grouped && !this.distinctRows;
    }

    /** @internal Build an independent statement containing defaults and explicit filters. */
    private filtered(): Knex.QueryBuilder {
        const query = this.base.clone();
        const explicitWhere = (query as any)._statements.filter(
            (statement: any) => statement.grouping === 'where'
        );
        (query as any)._statements = (query as any)._statements.filter(
            (statement: any) => statement.grouping !== 'where'
        );
        if (this.defaults && !this.skipDefaults) {
            const defaults = this.defaults.clone() as any;
            const where = defaults._statements.filter(
                (statement: any) => statement.grouping === 'where'
            );
            (query as any)._statements = [
                ...defaults._statements.filter(
                    (statement: any) => statement.grouping !== 'where'
                ),
                ...(query as any)._statements
            ];
            (query as any)._single = {
                ...defaults._single,
                ...(query as any)._single
            };
            if (where.length)
                query.where(nested => {
                    (nested as any)._statements = [...where];
                });
        }
        if (explicitWhere.length)
            query.where(nested => {
                (nested as any)._statements = [...explicitWhere];
            });
        const softDelete = this.source.introspect().extensions?.softDelete as
            | { column: string }
            | undefined;
        if (softDelete && this.deleted !== 'include') {
            query[this.deleted === 'only' ? 'whereNotNull' : 'whereNull'](
                `${this.alias}.${softDelete.column}`
            );
        }
        return query;
    }

    private async scalar(
        kind: AggregateKind,
        selector?: ReadPredicateSelector<ReadColumns<S, keyof Relations>>,
        options?: AggregateOptions<any>
    ): Promise<any> {
        if (
            this.grouped ||
            this.distinctRows ||
            Object.values(this.fields).some(field => field.aggregate)
        )
            throw new ReadSchemaError(
                'Scalar aggregates require an ungrouped source'
            );
        const column =
            selector === undefined ? undefined : this.column(selector);
        const compiled = compileAggregate(
            this.knex,
            createAggregate(kind, column, options),
            () => this.name(column!, '__aggregate')
        );
        const source = this.compile()
            .clearSelect()
            .clearOrder()
            .clear('limit')
            .clear('offset')
            .select(this.knex.raw('??.*', [this.alias]));
        const row = await this.knex
            .from(source.as('__aggregate'))
            .select({ value: compiled.sql })
            .first();
        return compiled.decode(row?.value);
    }

    /**
     * Count matching rows, or non-null column values, without mutating this query.
     * Ignores source ordering/limits/offsets while retaining filters and transactions.
     * @param options - Optional output parser; receives the raw driver value.
     * @returns A safe integer by default, including zero for an empty source.
     * @throws If the default count overflows, the source is grouped/distinct, or parsing fails.
     */
    countValue<O extends OutputSchema<any> | undefined = undefined>(
        options?: AggregateOptions<O>
    ): Promise<AggregateResult<O, number>>;
    /**
     * Count non-null column values without mutating the source query.
     * Source paging/order is ignored; filters, scopes and transactions remain.
     * @param column - Mapped schema property to count.
     * @param options - Optional parser replacing safe-integer decoding.
     * @throws If the default result overflows or the source is grouped/distinct.
     */
    countValue<O extends OutputSchema<any> | undefined = undefined>(
        column: ReadPredicateSelector<ReadColumns<S, keyof Relations>>,
        options?: AggregateOptions<O>
    ): Promise<AggregateResult<O, number>>;
    /**
     * Count matching rows, or non-null column values, without mutating this query.
     * Ignores source ordering/limits/offsets while retaining filters and transactions.
     * @param options - Optional output parser; receives the raw driver value.
     * @returns A safe integer by default, including zero for an empty source.
     * @throws If the default count overflows, the source is grouped/distinct, or parsing fails.
     */
    countValue(
        columnOrOptions?:
            | ReadPredicateSelector<ReadColumns<S, keyof Relations>>
            | AggregateOptions<any>,
        options?: AggregateOptions<any>
    ): Promise<any> {
        const hasColumn =
            typeof columnOrOptions === 'string' ||
            typeof columnOrOptions === 'function';
        return this.scalar(
            'count',
            hasColumn ? columnOrOptions : undefined,
            hasColumn ? options : columnOrOptions
        );
    }

    /**
     * Count distinct non-null values in an unpaginated clone of this query.
     * @param column - Schema property to count; SQL nulls do not contribute.
     * @param options - Optional parser replacing default safe-integer conversion.
     * @returns A safe integer, or the parser's inferred output type.
     * @throws If the count is unsafe, the source is grouped/distinct, or parsing fails.
     */
    countDistinctValue<O extends OutputSchema<any> | undefined = undefined>(
        column: ReadPredicateSelector<ReadColumns<S, keyof Relations>>,
        options?: AggregateOptions<O>
    ): Promise<AggregateResult<O, number>> {
        return this.scalar('countDistinct', column, options);
    }

    /**
     * Sum non-null values in an unpaginated clone, preserving numeric precision.
     * @param column - Numeric schema property to sum.
     * @param options - Optional parser receiving the raw driver value, including null.
     * @returns Database numeric text, or null for empty/all-null input by default.
     * An output parser replaces default decoding and controls the result type.
     */
    sumValue<O extends OutputSchema<any> | undefined = undefined>(
        column: ReadPredicateSelector<ReadColumns<S, keyof Relations>>,
        options?: AggregateOptions<O>
    ): Promise<AggregateResult<O, string | null>> {
        return this.scalar('sum', column, options);
    }

    /**
     * Average non-null values in an unpaginated clone of this query.
     * @param column - Numeric schema property to aggregate.
     * @param options - Optional parser receiving the raw driver result, including null.
     * @returns Exact database numeric text or null by default; a parser overrides this.
     * @remarks Text preserves database precision, not precision already lost in floating-point storage.
     */
    avgValue<O extends OutputSchema<any> | undefined = undefined>(
        column: ReadPredicateSelector<ReadColumns<S, keyof Relations>>,
        options?: AggregateOptions<O>
    ): Promise<AggregateResult<O, string | null>> {
        return this.scalar('avg', column, options);
    }

    /**
     * Find the smallest non-null column value without retaining source paging.
     * @param column - Schema property to aggregate.
     * @param options - Optional parser replacing default decoding, including null handling.
     * @returns Null for empty/all-null input; otherwise the column representation.
     * Dates return Date; numeric SQL overrides may return exact strings.
     */
    minValue<
        C extends ReadPredicateSelector<ReadColumns<S, keyof Relations>>,
        O extends OutputSchema<any> | undefined = undefined
    >(
        column: C,
        options?: AggregateOptions<O>
    ): Promise<
        AggregateResult<O, SelectedValue<ReadColumns<S, keyof Relations>, C>>
    > {
        return this.scalar('min', column, options);
    }

    /**
     * Find the largest non-null column value without retaining source paging.
     * @param column - Schema property to aggregate.
     * @param options - Optional parser replacing default decoding, including null handling.
     * @returns Null for empty/all-null input; otherwise the column representation.
     * Dates return Date; numeric SQL overrides may return exact strings.
     */
    maxValue<
        C extends ReadPredicateSelector<ReadColumns<S, keyof Relations>>,
        O extends OutputSchema<any> | undefined = undefined
    >(
        column: C,
        options?: AggregateOptions<O>
    ): Promise<
        AggregateResult<O, SelectedValue<ReadColumns<S, keyof Relations>, C>>
    > {
        return this.scalar('max', column, options);
    }

    /** Select an exact flat row shape, retaining per-field runtime schemas. */
    select<K extends keyof ReadColumns<S, keyof Relations> & string>(
        ...columns: Array<
            | K
            | ((columns: ReadColumns<S, keyof Relations>) => ReadColumn<any, K>)
        >
    ): SchemaQueryBuilder<
        S,
        ObjectSchemaBuilder<Pick<SchemaProps<ObjectReadSchema<S>>, K>>,
        Relations,
        false
    >;
    /** Select named output fields and aggregates, replacing the previous scalar projection. */
    select<P extends Selection>(
        selector: (columns: ReadColumns<S, keyof Relations>) => P
    ): SchemaQueryBuilder<
        S,
        ObjectSchemaBuilder<
            MergeProps<
                SchemaProps<ReadProjection<P>>,
                Pick<
                    SchemaProps<Row>,
                    Extract<keyof SchemaProps<Row>, keyof Relations>
                >
            >
        >,
        Relations,
        false
    >;
    select(...selectors: any[]): any {
        const selections = selectors.map(selector =>
            typeof selector === 'function'
                ? selector(this.columns)
                : this.columns[selector]
        );
        const selection =
            selections.length === 1 &&
            selections[0] &&
            !(COLUMN in selections[0])
                ? selections[0]
                : Object.fromEntries(
                      selections.map(column => {
                          const key = Object.keys(this.columns).find(
                              key => this.columns[key] === column
                          );
                          if (!key)
                              throw new ReadSchemaError(
                                  'Selection must reference columns from this query'
                              );
                          return [key, column];
                      })
                  );
        if (this.loaded.length && Object.values(selection).some(isAggregate))
            throw new ReadSchemaError(
                'Aggregate projections cannot contain relations'
            );
        const copy = this.copy();
        copy.fields = compileReadProjection(
            this.knex,
            selection,
            expression => {
                if (!this.columnSet.has(expression as ReadColumn<any>))
                    throw new ReadSchemaError(
                        'Projection column does not belong to this query'
                    );
                const column = expression as ReadColumn<any>;
                return { node: column[READ_COLUMN], name: this.name(column) };
            }
        );
        copy.selected = true;
        // Included relations are independent of the scalar projection.
        for (const relation of copy.loaded)
            copy.fields[relation.name] = this.fields[relation.name];
        Object.assign(copy, { rowSchema: copy.schema() });
        return copy as any;
    }

    /** Select a typed COUNT result on a new query. */
    count(
        column?: ReadPredicateSelector<ReadColumns<S, keyof Relations>>
    ): SchemaQueryBuilder<
        S,
        ReadProjection<{ count: AggregateExpression<number> }>,
        Relations,
        false
    > {
        return this.select(() => ({
            count: createAggregate<number>(
                'count',
                column === undefined ? undefined : this.column(column)
            )
        })) as any;
    }
    /** Select a typed COUNTDISTINCT result on a new query. */
    countDistinct(
        column: ReadPredicateSelector<ReadColumns<S, keyof Relations>>
    ): SchemaQueryBuilder<
        S,
        ReadProjection<{ countDistinct: AggregateExpression<number> }>,
        Relations,
        false
    > {
        return this.select(() => ({
            countDistinct: createAggregate<number>(
                'countDistinct',
                column === undefined ? undefined : this.column(column)
            )
        })) as any;
    }
    /** Select a typed SUM result on a new query. */
    sum(
        column: ReadPredicateSelector<ReadColumns<S, keyof Relations>>
    ): SchemaQueryBuilder<
        S,
        ReadProjection<{ sum: AggregateExpression<string | null> }>,
        Relations,
        false
    > {
        return this.select(() => ({
            sum: createAggregate<string | null>(
                'sum',
                column === undefined ? undefined : this.column(column)
            )
        })) as any;
    }
    /** Select a typed AVG result on a new query. */
    avg(
        column: ReadPredicateSelector<ReadColumns<S, keyof Relations>>
    ): SchemaQueryBuilder<
        S,
        ReadProjection<{ avg: AggregateExpression<string | null> }>,
        Relations,
        false
    > {
        return this.select(() => ({
            avg: createAggregate<string | null>(
                'avg',
                column === undefined ? undefined : this.column(column)
            )
        })) as any;
    }
    /** Select a typed MIN result on a new query. */
    min<C extends ReadPredicateSelector<ReadColumns<S, keyof Relations>>>(
        column: C
    ): SchemaQueryBuilder<
        S,
        ReadProjection<{
            min: AggregateExpression<
                SelectedValue<ReadColumns<S, keyof Relations>, C>
            >;
        }>,
        Relations,
        false
    > {
        return this.select(() => ({
            min: createAggregate<
                SelectedValue<ReadColumns<S, keyof Relations>, C>
            >('min', this.column(column))
        })) as any;
    }
    /** Select a typed MAX result on a new query. */
    max<C extends ReadPredicateSelector<ReadColumns<S, keyof Relations>>>(
        column: C
    ): SchemaQueryBuilder<
        S,
        ReadProjection<{
            max: AggregateExpression<
                SelectedValue<ReadColumns<S, keyof Relations>, C>
            >;
        }>,
        Relations,
        false
    > {
        return this.select(() => ({
            max: createAggregate<
                SelectedValue<ReadColumns<S, keyof Relations>, C>
            >('max', this.column(column))
        })) as any;
    }

    /** Keep only distinct selected rows, preserving the row schema. */
    distinct(): SchemaQueryBuilder<S, Row, Relations, false>;
    /** Select a property subset and eliminate duplicate rows on that immutable projection. */
    distinct<K extends keyof ReadColumns<S, keyof Relations> & string>(
        ...columns: Array<
            | K
            | ((columns: ReadColumns<S, keyof Relations>) => ReadColumn<any, K>)
        >
    ): SchemaQueryBuilder<
        S,
        ObjectSchemaBuilder<Pick<SchemaProps<ObjectReadSchema<S>>, K>>,
        Relations,
        false
    >;
    distinct(...columns: any[]): any {
        const copy = columns.length ? this.select(...columns) : this.copy();
        copy.distinctRows = true;
        return copy as any;
    }
    /** Filter grouped results using trusted SQL and captured bindings. */
    havingRaw(
        sql: string,
        bindings: readonly Knex.RawBinding[] = []
    ): SchemaQueryBuilder<S, Row, Relations, false> {
        const copy = this.copy();
        copy.base.havingRaw(captureReadRaw(this.knex, sql, bindings)());
        copy.grouped = true;
        return copy as any;
    }
    /** Filter groups by a mapped column comparison. */
    having(
        column: ReadPredicateSelector<ReadColumns<S, keyof Relations>>,
        operator: string,
        value: unknown
    ): SchemaQueryBuilder<S, Row, Relations, false> {
        const copy = this.copy();
        copy.base.having(
            this.name(this.column(column)),
            operator,
            captureValue(this.knex, value)()
        );
        copy.grouped = true;
        return copy as any;
    }
    /** Group using trusted SQL without changing the explicit projection. */
    groupByRaw(
        sql: string,
        bindings: readonly Knex.RawBinding[] = []
    ): SchemaQueryBuilder<S, Row, Relations, false> {
        const copy = this.copy();
        copy.base.groupByRaw(captureReadRaw(this.knex, sql, bindings)());
        copy.grouped = true;
        return copy as any;
    }

    /** Apply a named schema projection with the same exact row-schema guarantees. */
    projected<K extends keyof NamedProjections<S> & string>(
        name: K
    ): SchemaQueryBuilder<
        S,
        ObjectSchemaBuilder<
            Pick<
                SchemaProps<ObjectReadSchema<S>>,
                Extract<NamedKeys<S, K>, keyof SchemaProps<ObjectReadSchema<S>>>
            > &
                Pick<
                    SchemaProps<Row>,
                    Extract<keyof SchemaProps<Row>, keyof Relations>
                >
        >,
        Relations,
        false
    > {
        const definition = getProjections(this.source)[name];
        if (!definition)
            throw new ReadSchemaError(`Unknown projection: ${name}`);
        return this.select(() =>
            Object.fromEntries(
                definition.keys.map(key => [key, this.columns[key]])
            )
        ) as any;
    }

    protected readPredicateContext(): ReadPredicateContext<
        ReadColumns<S, keyof Relations>
    > {
        return {
            knex: this.knex,
            column: selector => this.name(this.column(selector))
        };
    }
    protected addReadPredicate(predicate: ReadPredicate): this {
        const copy = this.copy();
        predicate(copy.base);
        return copy;
    }
    /** @internal Apply an already captured Framework predicate to an independent query. */
    withPredicate(predicate: ReadPredicate): this {
        return this.addReadPredicate(predicate);
    }
    /** @internal Native storage columns for composing CTI table sources. */
    storageQuery(): Knex.QueryBuilder {
        return this.filtered().select(this.knex.raw('??.*', [this.alias]));
    }
    /** Order parent rows independently of any child relation's ordering. */
    orderBy(
        column: ReadPredicateSelector<ReadColumns<S, keyof Relations>>,
        direction: 'asc' | 'desc' = 'asc'
    ): this {
        const copy = this.copy();
        copy.base.orderBy(this.name(this.column(column)), direction);
        return copy;
    }
    /** Append trusted raw ordering with captured positional bindings; ref() supplies quoted columns. */
    orderByRaw(sql: string, bindings: readonly Knex.RawBinding[] = []): this {
        const captured = captureReadRaw(this.knex, sql, bindings);
        const copy = this.copy();
        copy.base.orderByRaw(captured());
        return copy;
    }
    /** Group rows before typed aggregate projection. */
    groupBy(
        ...columns: ReadPredicateSelector<ReadColumns<S, keyof Relations>>[]
    ): SchemaQueryBuilder<S, Row, Relations, false> {
        const copy = this.copy();
        copy.base.groupBy(columns.map(c => this.name(this.column(c))));
        copy.grouped = true;
        return copy as any;
    }
    /** Limit parent rows; relation limits apply independently within each parent. */
    limit(count: number): this {
        if (!Number.isInteger(count) || count < 0)
            throw new ReadSchemaError('Limit must be a non-negative integer');
        const copy = this.copy();
        copy.base.limit(count);
        return copy;
    }
    /** Skip parent rows; use a deterministic order for pagination. */
    offset(count: number): this {
        if (!Number.isInteger(count) || count < 0)
            throw new ReadSchemaError('Offset must be a non-negative integer');
        const copy = this.copy();
        copy.base.offset(count);
        return copy;
    }

    /**
     * Load a declared relation in the same SQL statement. Return the customized child
     * query so its selected fields and nested includes remain strongly typed.
     */
    include<
        K extends keyof Relations & string,
        Child extends ReadQueryShape = SchemaAwareQuery<Related<Relations[K]>>
    >(
        selector: K | ((relations: { [P in keyof Relations]: P }) => K),
        customize?: (query: SchemaAwareQuery<Related<Relations[K]>>) => Child
    ): SchemaQueryBuilder<
        S,
        AddField<
            Row,
            K,
            RelationField<Relations[K], Child['rowSchema']>,
            Relations
        >,
        Relations,
        false
    > {
        if (Object.values(this.fields).some(f => f.aggregate) || this.grouped)
            throw new ReadSchemaError(
                'Grouped/aggregate reads cannot load entity relations'
            );
        const definitions = (this.source.introspect().extensions?.relations ??
            []) as RelationSpec[];
        const key =
            typeof selector === 'string'
                ? selector
                : selector(
                      Object.fromEntries(
                          definitions.map(r => [r.name, r.name])
                      ) as any
                  );
        const relation = definitions.find(r => r.name === key);
        if (!relation) throw new ReadSchemaError(`Unknown relation: ${key}`);
        if (this.loaded.some(r => r.name === key))
            throw new ReadSchemaError(`Duplicate relation: ${key}`);
        const foreign =
            typeof relation.schema === 'function'
                ? relation.schema()
                : relation.schema;
        return this.load(
            relation,
            this.child(foreign, customize as any),
            relation.type === 'belongsTo' && !relation.optional
        ) as any;
    }

    private child(
        foreign: ReadObject,
        customize?: (query: any) => ReadQueryShape
    ): AnyReadQuery {
        let child: AnyReadQuery = createReadQuery(
            this.knex,
            foreign,
            this.knex(getTableName(foreign))
        );
        if (customize) {
            const customized = customize(child as any);
            if (!child.sameSource(customized)) {
                if (customized instanceof Promise)
                    void customized.catch(() => {});
                throw new ReadSchemaError(
                    'Relation customizer must return its configured read query'
                );
            }
            child = customized as any;
        }
        return child;
    }

    private load(
        relation: RelationSpec,
        child: AnyReadQuery,
        required: boolean
    ): this {
        const key = relation.name;
        if (!key || typeof key !== 'string')
            throw new ReadSchemaError('A non-empty relation alias is required');
        if (Object.values(this.fields).some(f => f.aggregate))
            throw new ReadSchemaError(
                'Grouped/aggregate reads cannot load entity relations'
            );
        if (
            this.loaded.some(r => r.name === key) ||
            Object.hasOwn(this.fields, key)
        )
            throw new ReadSchemaError(`Duplicate result field: ${key}`);
        const many =
            relation.type === 'hasMany' || relation.type === 'belongsToMany';
        const schema = many
            ? array(child.rowSchema)
            : required
              ? child.rowSchema
              : child.rowSchema.nullable();
        const node: ReadNode = {
            schema,
            exact: false,
            decode: (value, path) => {
                if (value === null && !required && !many) return null;
                if (many) {
                    if (!Array.isArray(value))
                        throw new ReadSchemaError(
                            `${path}: expected a relation array`
                        );
                    return value.map((row, i) =>
                        child.decode(row, `${path}[${i}]`)
                    );
                }
                return child.decode(value, path);
            }
        };
        const copy = this.copy();
        copy.loaded.push({ name: key, query: child, relation, required });
        copy.fields[key] = {
            node,
            expression: () => {
                throw new ReadSchemaError(
                    'Relation expression must be compiled in context'
                );
            }
        };
        Object.assign(copy, { rowSchema: copy.schema() });
        return copy as any;
    }

    /** @internal Reuse a captured child query across polymorphic parent branches. */
    includeFrom(
        name: string,
        prepared: SchemaQueryBuilder<any, any, any, boolean>
    ): this {
        const loaded = prepared.loaded.find(relation => relation.name === name);
        if (!loaded)
            throw new ReadSchemaError(`Unknown prepared relation: ${name}`);
        return this.load(loaded.relation, loaded.query, loaded.required);
    }

    /** Join one typed nested object with explicit property keys, including nullable joins. */
    joinOne<
        F extends ReadObject,
        K extends string,
        Required extends boolean = true,
        Child extends ReadQueryShape = SchemaAwareQuery<F>
    >(
        spec: Omit<JoinOneSpec<S, F, K, Required>, 'foreignQuery' | 'mappers'>,
        customize?: (query: SchemaAwareQuery<F>) => Child
    ): SchemaQueryBuilder<
        S,
        AddField<
            Row,
            K,
            Required extends true
                ? Child['rowSchema']
                : SchemaForValue<InferType<Child['rowSchema']> | null>
        >,
        Relations & Record<K, RelationInfo<'hasOne', F>>,
        false
    > {
        if ('foreignQuery' in spec || 'mappers' in spec)
            throw new ReadSchemaError(
                'Use the typed child customizer instead of foreignQuery/mappers in schema-aware mode'
            );
        return this.load(
            {
                name: spec.as,
                type: 'hasOne',
                schema: spec.foreignSchema,
                localKey: resolvePropertyKey(
                    spec.localColumn as any,
                    this.source,
                    'joinOne'
                ),
                remoteKey: resolvePropertyKey(
                    spec.foreignColumn as any,
                    spec.foreignSchema,
                    'joinOne'
                )
            },
            this.child(spec.foreignSchema, customize as any),
            spec.required !== false
        ) as any;
    }

    /** Join a typed collection, applying child projection and pagination independently per parent. */
    joinMany<
        F extends ReadObject,
        K extends string,
        Child extends ReadQueryShape = SchemaAwareQuery<F>
    >(
        spec: Omit<
            JoinManySpec<S, F, K>,
            'orderBy' | 'foreignQuery' | 'mappers'
        >,
        customize?: (query: SchemaAwareQuery<F>) => Child
    ): SchemaQueryBuilder<
        S,
        AddField<Row, K, ArraySchemaBuilder<Child['rowSchema']>>,
        Relations & Record<K, RelationInfo<'hasMany', F>>,
        false
    > {
        if ('foreignQuery' in spec || 'mappers' in spec || 'orderBy' in spec)
            throw new ReadSchemaError(
                'Use the typed child customizer for ordering instead of raw foreignQuery/mappers'
            );
        let child = this.child(spec.foreignSchema, customize as any);
        if (spec.limit !== undefined) child = child.limit(spec.limit);
        if (spec.offset !== undefined) child = child.offset(spec.offset);
        return this.load(
            {
                name: spec.as,
                type: 'hasMany',
                schema: spec.foreignSchema,
                localKey: resolvePropertyKey(
                    spec.localColumn as any,
                    this.source,
                    'joinMany'
                ),
                remoteKey: resolvePropertyKey(
                    spec.foreignColumn as any,
                    spec.foreignSchema,
                    'joinMany'
                )
            },
            child,
            false
        ) as any;
    }

    /** @internal Decode a SQL/JSON row using the same metadata exposed to consumers. */
    decode(row: any, path = 'row'): any {
        if (
            this.source.introspect().extensions?.readOrphanColumn &&
            row.__read_cti_present == null
        )
            throw new ReadSchemaError(`${path}: missing CTI variant body`);
        return decodeObject(
            Object.fromEntries(
                Object.entries(this.fields).map(([key, field]) => [
                    key,
                    field.node
                ])
            ),
            row,
            path
        );
    }

    /** @internal Compile a bound SQL statement; callers never receive the mutable builder. */
    compile(correlate?: ReadCorrelation): Knex.QueryBuilder {
        const query = this.filtered().clearSelect();
        correlate?.(query, this.alias, this.source);
        const expressions: Record<string, Knex.Raw> = Object.create(null);
        for (const [key, field] of Object.entries(this.fields)) {
            if (!this.loaded.some(r => r.name === key))
                expressions[key] = field.expression(this.knex);
        }
        const orphanColumn =
            this.source.introspect().extensions?.readOrphanColumn;
        if (orphanColumn)
            expressions.__read_cti_present = this.knex.raw('??', [
                `${this.alias}.${orphanColumn}`
            ]);
        for (const loaded of this.loaded) {
            const { relation, query: child } = loaded;
            const parentTable = this.alias;
            const parentPk = getPrimaryKeyColumns(this.source).columnNames;
            const foreignKey = relation.foreignKey;
            const resolveKey = (schema: ReadObject, key: any) => {
                if (typeof key === 'function') {
                    const descriptor = key(
                        ObjectSchemaBuilderValue.getPropertiesFor(schema)
                    );
                    key =
                        descriptor[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]
                            .propertyName;
                }
                return buildColumnMap(schema).propToCol.get(key) ?? key;
            };
            const childSql = child.compile((sql, childTable, childSource) => {
                const childPk = getPrimaryKeyColumns(childSource).columnNames;
                if (relation.localKey && relation.remoteKey) {
                    sql.where(
                        `${childTable}.${resolveKey(childSource, relation.remoteKey)}`,
                        this.knex.ref(
                            `${parentTable}.${resolveKey(this.source, relation.localKey)}`
                        )
                    );
                    return;
                }
                if (parentPk.length !== 1)
                    throw new ReadSchemaError(
                        'Automatic relation reads require single-column primary keys'
                    );
                if (childPk.length !== 1)
                    throw new ReadSchemaError(
                        'Automatic relation reads require single-column primary keys'
                    );
                if (relation.type === 'belongsTo')
                    sql.where(
                        `${childTable}.${childPk[0]}`,
                        this.knex.ref(
                            `${parentTable}.${resolveKey(this.source, foreignKey)}`
                        )
                    );
                else if (relation.type === 'belongsToMany') {
                    const through = relation.through!;
                    sql.join(
                        through.table,
                        `${through.table}.${through.foreignKey}`,
                        `${childTable}.${childPk[0]}`
                    ).where(
                        `${through.table}.${through.localKey}`,
                        this.knex.ref(`${parentTable}.${parentPk[0]}`)
                    );
                } else
                    sql.where(
                        `${childTable}.${resolveKey(childSource, foreignKey)}`,
                        this.knex.ref(`${parentTable}.${parentPk[0]}`)
                    );
            });
            const many =
                relation.type === 'hasMany' ||
                relation.type === 'belongsToMany';
            if (!many) childSql.limit(1);
            const wrapped = this.knex
                .queryBuilder()
                .from(childSql.clone().as('__read_relation'));
            expressions[loaded.name] = many
                ? this.knex.raw(
                      "(select coalesce(jsonb_agg(to_jsonb(__read_relation)), '[]'::jsonb) from (?) as __read_relation)",
                      [childSql]
                  )
                : this.knex.raw(
                      '(select to_jsonb(__read_relation) from (?) as __read_relation)',
                      [childSql]
                  );
            if (loaded.required)
                query.whereExists(wrapped.clone().select(this.knex.raw('1')));
        }
        return (this.distinctRows ? query.distinct() : query).select(
            expressions
        );
    }

    /** Render debugging SQL without execution; bound values may be sensitive. */
    toQuery(): string {
        return this.compile().toQuery();
    }
    /** Return an independent mutable Knex snapshot, never the query's owned state. */
    toKnexQuery(): Knex.QueryBuilder {
        return this.compile();
    }

    /** Configure an isolated Knex SELECT once, declaring the complete raw row output. */
    apply<O extends ReadObject>(
        configure: (query: Knex.QueryBuilder) => Knex.QueryBuilder | undefined,
        options: QueryOutput<O>
    ): OpaqueQuery<O> {
        const sql = this.compile();
        const result = configure(sql);
        if (result !== undefined && result !== sql) {
            if (result instanceof Promise) void result.catch(() => {});
            throw new ReadSchemaError(
                'Raw configuration must synchronously configure the supplied Knex builder'
            );
        }
        return OpaqueQuery.capture(this.knex, sql, options);
    }
    /** Replace the projection with trusted raw SQL and an explicit output schema. */
    selectRaw<O extends ReadObject>(
        sql: string,
        bindings: readonly Knex.RawBinding[],
        options: QueryOutput<O>
    ): OpaqueQuery<O> {
        const captured = captureReadRaw(this.knex, sql, bindings);
        return this.apply(
            query => query.clearSelect().select(captured()),
            options
        );
    }

    private writer(filtered = true): QuerySource<S, InferType<Row>> {
        if (!this.returnsEntityRows || this.loaded.length)
            throw new ReadSchemaError(
                'Writes require an unprojected table query without relations or aggregation'
            );
        let base = this.knex(getTableName(this.source));
        if (filtered) {
            const keys = getPrimaryKeyColumns(this.source).columnNames;
            if (keys.length) {
                base.whereIn(
                    keys,
                    this.filtered()
                        .clearSelect()
                        .select(keys.map(key => `${this.alias}.${key}`))
                );
            } else {
                const captured = this.filtered();
                if (
                    (captured as any)._single.limit !== undefined ||
                    (captured as any)._single.offset !== undefined
                )
                    throw new ReadSchemaError(
                        'Paginated writes require a primary key'
                    );
                base = captured
                    .from({ [this.alias]: getTableName(this.source) })
                    .clearSelect()
                    .clearOrder();
            }
        }
        const writer = new QuerySource<S, InferType<Row>>(
            this.knex,
            this.source,
            base
        );
        const state = getState(writer);
        state.skipDefaultScope = true;
        state.includeDeleted = true;
        state.decodeRow = row => this.decode(row);
        state.hookQuery = this;
        return writer;
    }

    /** Configure immutable conflict handling for one-row inserts. */
    onConflict(
        this: Writable extends true ? this : never,
        ...columns: ColumnRef<S>[]
    ): Pick<
        ReturnType<QuerySource<S, InferType<Row>>['onConflict']>,
        'merge' | 'ignore'
    > {
        const conflict = this.writer(false).onConflict(...columns);
        return {
            merge: (async (...args: any[]) => {
                const row = await (conflict.merge as Function)(...args);
                return row;
            }) as typeof conflict.merge,
            ignore: async data => {
                const row = await conflict.ignore(data);
                return row;
            }
        };
    }

    /** Insert one row, returning the same decoded storage representation as reads. */
    async insert(
        this: Writable extends true ? this : never,
        data: InsertType<S>
    ): Promise<InferType<Row>> {
        return this.writer(false).insert(data);
    }
    /** Insert multiple rows and decode each returned row. */
    async insertMany(
        this: Writable extends true ? this : never,
        data: InsertType<S>[]
    ): Promise<InferType<Row>[]> {
        const writer = this.writer(false);
        if (data.length === 0) return [];
        return writer.insertMany(data);
    }
    /** Update matching entities; projections and relations cannot be written. */
    async update(
        this: Writable extends true ? this : never,
        data: Partial<InsertType<S> | InferType<Row>>
    ): Promise<InferType<Row>[]> {
        return this.writer().update(data as any);
    }
    /** Delete matching rows, respecting configured soft deletion. */
    delete(this: Writable extends true ? this : never): Promise<number> {
        return this.writer().delete();
    }
    /** Permanently delete matching rows. */
    hardDelete(this: Writable extends true ? this : never): Promise<number> {
        return this.writer().hardDelete();
    }
    /** Restore matching soft-deleted rows. */
    async restore(
        this: Writable extends true ? this : never
    ): Promise<InferType<Row>[]> {
        return this.writer().restore();
    }
    /** Insert in parameter-safe chunks, retaining schema hooks and conflict handling. */
    async bulkInsert(
        this: Writable extends true ? this : never,
        ...args: Parameters<QuerySource<S, InferType<Row>>['bulkInsert']>
    ): Promise<InferType<Row>[]> {
        return this.writer(false).bulkInsert(...args);
    }
    /** Upsert a row using mapped conflict keys. */
    async upsert(
        this: Writable extends true ? this : never,
        ...args: Parameters<QuerySource<S, InferType<Row>>['upsert']>
    ): Promise<InferType<Row>> {
        return this.writer(false).upsert(...args);
    }
    /** Upsert rows in parameter-safe chunks. */
    async bulkUpsert(
        this: Writable extends true ? this : never,
        ...args: Parameters<QuerySource<S, InferType<Row>>['bulkUpsert']>
    ): Promise<InferType<Row>[]> {
        return this.writer(false).bulkUpsert(...args);
    }
    /** Update rows by their declared keys in parameter-safe chunks. */
    bulkUpdate(
        this: Writable extends true ? this : never,
        updates: ReadonlyArray<{
            where: Partial<InferType<Row>>;
            set: Partial<InsertType<S> | InferType<Row>>;
        }>
    ): Promise<number> {
        return this.writer().bulkUpdate(updates as any);
    }

    /** Read values of one selected property without altering this query. */
    async pluck<K extends keyof SchemaProps<Row> & string>(
        key: K
    ): Promise<InferType<SchemaProps<Row>[K]>[]> {
        return (await this.execute()).map(row => (row as any)[key]);
    }
    /** Execute one statement and decode its selected row graph. */
    async execute(): Promise<InferType<Row>[]> {
        return (await this.compile()).map((row: unknown) => this.decode(row));
    }
    /** Execute a limited copy, returning undefined when no row matches. */
    async first(): Promise<InferType<Row> | undefined> {
        return (await this.limit(1).execute())[0];
    }
    /** Awaiting executes the query; repeated awaits deliberately execute again. */
    // biome-ignore lint/suspicious/noThenProperty: query readers intentionally support await
    then<T = InferType<Row>[], E = never>(
        resolve?: ((rows: InferType<Row>[]) => T | PromiseLike<T>) | null,
        reject?: ((error: any) => E | PromiseLike<E>) | null
    ): Promise<T | E> {
        return this.execute().then(resolve, reject);
    }
    /** Bind an independent query graph to a caller-owned transaction. */
    transacting(trx: Knex.Transaction): this {
        const copy = this.copy();
        copy.base.transacting(trx);
        Object.assign(copy, { knex: trx });
        copy.loaded = this.loaded.map(r => ({
            ...r,
            query: r.query.transacting(trx)
        }));
        return copy;
    }
    /**
     * Read a lossless composite cursor page using native SQL ordering. Cursor sort
     * values remain private text columns, independent of projections and Date decoding.
     * Requires non-null scalar order columns containing a declared unique key.
     */
    paginateAfter(
        options: CompositeCursorOptions<S>
    ): Promise<CursorPaginationResult<InferType<Row>>>;
    /** Read a page using a single raw cursor value; choose a unique, non-null sort column. */
    paginateAfter(options: {
        cursor?: unknown;
        limit: number;
        column?: ColumnRef<S>;
        direction?: 'asc' | 'desc';
    }): Promise<CursorPaginationResult<InferType<Row>>>;
    /** Execute a cursor page without changing this query's filters, ordering or schema. */
    async paginateAfter(
        options:
            | CompositeCursorOptions<S>
            | {
                  cursor?: unknown;
                  limit: number;
                  column?: ColumnRef<S>;
                  direction?: 'asc' | 'desc';
              }
    ): Promise<CursorPaginationResult<InferType<Row>>> {
        if (this.grouped || Object.values(this.fields).some(f => f.aggregate))
            throw new ReadSchemaError(
                'Cursor pagination cannot be used for grouped or aggregate reads'
            );
        if (!('orderBy' in options)) {
            if (!Number.isInteger(options.limit) || options.limit < 1)
                throw new ReadSchemaError(
                    'Cursor page limit must be a positive integer'
                );
            const key =
                options.column === undefined
                    ? 'id'
                    : resolvePropertyKey(
                          options.column as any,
                          this.source,
                          'cursor'
                      );
            const column = this.columns[key];
            if (!column)
                throw new ReadSchemaError(`Unknown cursor column: ${key}`);
            const direction = options.direction ?? 'desc';
            if (direction !== 'asc' && direction !== 'desc')
                throw new ReadSchemaError('Invalid cursor direction');
            const name = this.name(column);
            let hidden = '__cursor_value';
            while (Object.hasOwn(this.fields, hidden)) hidden += '_';
            const sql = this.compile()
                .clearOrder()
                .clear('offset')
                .limit(options.limit + 1)
                .orderBy(name, direction)
                .select({
                    [hidden]: readExpression(
                        this.knex,
                        column[READ_COLUMN],
                        name
                    )
                });
            if (options.cursor != null)
                sql.where(
                    name as any,
                    direction === 'desc' ? '<' : '>',
                    options.cursor as any
                );
            const rows = await sql;
            const hasMore = rows.length > options.limit;
            const page = rows.slice(0, options.limit);
            return {
                data: page.map((row: any) => this.decode(row)),
                hasMore,
                nextCursor: hasMore
                    ? String(page[page.length - 1][hidden])
                    : null
            };
        }
        const Constructor = getQuerySourceCtor();
        const source = this.source.withExtension('tableName', this.alias);
        const legacy = new Constructor(this.knex, source, this.compile());
        const state = getState(legacy);
        state.skipDefaultScope = true;
        state.includeDeleted = true;
        // The query is already projected; reserve its aliases against cursor fields.
        state.hiddenColumns = new Set(Object.keys(this.fields));
        return compositeCursor(
            legacy,
            options,
            row => this.decode(row),
            this.source.introspect().extensions?.tableName as string
        );
    }
    /** Fetch a numbered page and a count without mutating the source query. */
    async paginate(options: {
        page: number;
        pageSize: number;
    }): Promise<PaginationResult<InferType<Row>>> {
        const { page, pageSize } = options;
        if (
            !Number.isInteger(page) ||
            page < 1 ||
            !Number.isInteger(pageSize) ||
            pageSize < 1
        )
            throw new ReadSchemaError(
                'Page and pageSize must be positive integers'
            );
        const countQuery = this.compile()
            .clearOrder()
            .clear('limit')
            .clear('offset');
        const countRow = await this.knex
            .from(countQuery.as('__read_count'))
            .count({ count: '*' })
            .first();
        const total = Number(countRow?.count ?? 0);
        if (!Number.isSafeInteger(total))
            throw new ReadSchemaError(
                'Pagination count exceeds the safe integer range'
            );
        const data = await this.offset((page - 1) * pageSize)
            .limit(pageSize)
            .execute();
        const totalPages = Math.ceil(total / pageSize);
        return {
            data,
            total,
            page,
            pageSize,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        };
    }
}

import { ObjectSchemaBuilder as ObjectSchemaBuilderValue } from '@cleverbrush/schema';

/** @internal Shared reader factory for roots and nested relations. */
export function createReadQuery<S extends ReadObject>(
    knex: Knex,
    schema: S,
    base: Knex.QueryBuilder
): SchemaAwareQuery<S> {
    return (
        getVariants(schema)
            ? new PolymorphicQueryBuilder(knex, schema, base)
            : new SchemaQueryBuilder(knex, schema, base)
    ) as SchemaAwareQuery<S>;
}
