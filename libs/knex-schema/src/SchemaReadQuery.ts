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
    type AliasedColumn,
    COLUMN,
    isAggregate
} from './expressions.js';
import { getProjections, getVariants } from './extension.js';
import {
    type CompositeCursorOptions,
    compositeCursor
} from './operations/composite-cursor.js';
import {
    ALLOWED_OPS,
    getEffectiveBaseQuery,
    getSchemaQueryBuilderCtor
} from './operations/helpers.js';
import { getState } from './operations/state.js';
import { PolymorphicReadQuery } from './PolymorphicReadQuery.js';
import type { ReadRelations, ReadVariantMetadata } from './read-entity.js';
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
import type { SchemaQueryBuilder } from './SchemaQueryBuilder.js';
import type {
    CursorPaginationResult,
    JoinManySpec,
    JoinOneSpec,
    PaginationResult,
    RelationSpec
} from './types.js';

const READ_COLUMN = Symbol('schema-read-column');
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
export interface ReadColumn<S extends ReadSchema>
    extends AliasedColumn<InferType<S>> {
    /** @internal Decoding and projection metadata shared by the query compiler. */
    readonly [READ_COLUMN]: ReadNode;
}
/** Columns available for typed projections and filters. */
export type ReadColumns<
    S extends ReadObject,
    Relations extends PropertyKey = never
> = {
    [K in Exclude<keyof SchemaProps<S>, Relations> & string]: ReadColumn<
        ColumnReadSchema<SchemaProps<S>[K]>
    >;
};
type Selection = Record<string, ReadColumn<any> | AggregateExpression<any>>;
type MergeProps<A, B> = {
    [K in keyof A | keyof B]: K extends keyof B
        ? B[K]
        : K extends keyof A
          ? A[K]
          : never;
};
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
    [K in keyof S & string]: S[K] extends ReadColumn<infer R>
        ? R
        : S[K] extends AggregateExpression<infer T>
          ? SchemaForValue<T>
          : never;
}>;
type AddField<
    S extends ReadObject,
    K extends string,
    F extends ReadSchema
> = ObjectSchemaBuilder<Omit<SchemaProps<S>, K> & Record<K, F>>;
type Related<R> = R extends RelationInfo<any, infer S> ? S : never;
type RelationField<R, S extends ReadSchema> =
    R extends RelationInfo<'hasMany' | 'belongsToMany', any>
        ? ArraySchemaBuilder<S>
        : R extends RelationInfo<'belongsTo', any>
          ? R extends { optional: infer O }
              ? true extends O
                  ? SchemaForValue<InferType<S> | null>
                  : S
              : S
          : SchemaForValue<InferType<S> | null>;
type Selector<C> = (columns: C) => ReadColumn<any>;
type AnyReadQuery =
    | SchemaReadQuery<any, any, any>
    | PolymorphicReadQuery<any, any>;
type Loaded = {
    name: string;
    query: AnyReadQuery;
    relation: RelationSpec;
    required: boolean;
};
/** Result of entering opt-in read mode: an object reader or a declared variant union. */
export type SchemaAwareQuery<S extends ReadObject> =
    ReadVariantMetadata<S> extends {
        discriminator: string;
        variants: Record<string, unknown>;
    }
        ? PolymorphicReadQuery<S>
        : SchemaReadQuery<S>;
/** @internal Apply parent correlation before child selection, ordering and pagination. */
export type ReadCorrelation = (
    query: Knex.QueryBuilder,
    alias: string,
    source: ReadObject
) => void;

/**
 * Immutable, detached read query whose row schema matches its decoded SQL result.
 * Enter through withRowSchema() before projections/includes. Ordinary legacy queries
 * remain mutable and keep their existing values. Reading metadata never executes SQL.
 */
export class SchemaReadQuery<
    S extends ReadObject,
    Row extends ReadObject = ObjectReadSchema<S, keyof ReadRelations<S>>,
    Relations extends Record<string, RelationInfo> = ReadRelations<S>
> {
    /** @internal Nominal identity for typed child-query customizers. */
    declare readonly [READ_QUERY]: true;
    private readonly alias = `__schema_read_${readAliasSequence++}`;
    private fields: Record<string, ReadField>;
    private loaded: Loaded[] = [];
    private base: Knex.QueryBuilder;
    private selected = false;
    private grouped = false;
    private readonly columns: Record<string, ReadColumn<any>>;
    /** Runtime structural schema; stable across filters, pagination and transaction clones. */
    readonly rowSchema: Row;

    /** @internal Use withRowSchema() on a query/DbSet instead of constructing directly. */
    constructor(
        private readonly knex: Knex,
        private readonly source: S,
        base: Knex.QueryBuilder
    ) {
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
            this.columns[key] = {
                [COLUMN]: {
                    alias: this.alias,
                    column: propToCol.get(key) ?? key,
                    schema
                },
                [READ_COLUMN]: node
            };
            this.fields[key] = {
                node,
                expression: knex => readExpression(knex, node, column)
            };
        }
        this.rowSchema = this.schema() as Row;
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
            other instanceof SchemaReadQuery && this.columns === other.columns
        );
    }

    private column(
        selector: Selector<ReadColumns<S, keyof Relations>>
    ): ReadColumn<any> {
        const column = selector(
            this.columns as ReadColumns<S, keyof Relations>
        );
        if (!column || !Object.values(this.columns).includes(column))
            throw new ReadSchemaError(
                'Column does not belong to this read query'
            );
        return column;
    }

    private name(column: ReadColumn<any>): string {
        return `${column[COLUMN].alias}.${column[COLUMN].column}`;
    }

    /** Select an exact flat row shape, retaining per-field runtime schemas. */
    select<P extends Selection>(
        selector: (columns: ReadColumns<S, keyof Relations>) => P
    ): SchemaReadQuery<
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
        Relations
    > {
        if (this.selected)
            throw new ReadSchemaError(
                'Only one projection is allowed per read query'
            );
        const selection = selector(
            this.columns as ReadColumns<S, keyof Relations>
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
                if (
                    !Object.values(this.columns).includes(
                        expression as ReadColumn<any>
                    )
                )
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

    /** Apply a named schema projection with the same exact row-schema guarantees. */
    projected<K extends keyof NamedProjections<S> & string>(
        name: K
    ): SchemaReadQuery<
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
        Relations
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

    /** Add a bound comparison, returning an independent query with the same row schema. */
    where(
        column: Selector<ReadColumns<S, keyof Relations>>,
        value: unknown
    ): this;
    /** Add a bound comparison using a supported SQL operator. */
    where(
        column: Selector<ReadColumns<S, keyof Relations>>,
        operator: string,
        value: unknown
    ): this;
    /** Add a bound comparison using a supported SQL operator. */
    where(
        column: Selector<ReadColumns<S, keyof Relations>>,
        ...args: [unknown] | [string, unknown]
    ): this {
        const operator = args.length === 1 ? '=' : args[0].toLowerCase();
        if (!ALLOWED_OPS.has(operator))
            throw new ReadSchemaError(
                `Unsupported comparison operator: ${operator}`
            );
        const copy = this.copy();
        copy.base.where(
            this.name(this.column(column)),
            operator,
            (args.length === 1 ? args[0] : args[1]) as any
        );
        return copy;
    }

    /** Filter SQL null values without changing the declared read shape. */
    whereNull(column: Selector<ReadColumns<S, keyof Relations>>): this {
        const copy = this.copy();
        copy.base.whereNull(this.name(this.column(column)));
        return copy;
    }
    /** Exclude SQL null values without implicitly narrowing schema nullability. */
    whereNotNull(column: Selector<ReadColumns<S, keyof Relations>>): this {
        const copy = this.copy();
        copy.base.whereNotNull(this.name(this.column(column)));
        return copy;
    }
    /** Filter against a bound list of values. An empty list produces no rows. */
    whereIn(
        column: Selector<ReadColumns<S, keyof Relations>>,
        values: readonly unknown[]
    ): this {
        const copy = this.copy();
        copy.base.whereIn(this.name(this.column(column)), [...values] as any[]);
        return copy;
    }
    /** Order parent rows independently of any child relation's ordering. */
    orderBy(
        column: Selector<ReadColumns<S, keyof Relations>>,
        direction: 'asc' | 'desc' = 'asc'
    ): this {
        const copy = this.copy();
        copy.base.orderBy(this.name(this.column(column)), direction);
        return copy;
    }
    /** Group rows before typed aggregate projection. */
    groupBy(...columns: Selector<ReadColumns<S, keyof Relations>>[]): this {
        const copy = this.copy();
        copy.base.groupBy(columns.map(c => this.name(this.column(c))));
        copy.grouped = true;
        return copy;
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
        selector: (relations: { [P in keyof Relations]: P }) => K,
        customize?: (query: SchemaAwareQuery<Related<Relations[K]>>) => Child
    ): SchemaReadQuery<
        S,
        AddField<Row, K, RelationField<Relations[K], Child['rowSchema']>>,
        Relations
    > {
        if (Object.values(this.fields).some(f => f.aggregate) || this.grouped)
            throw new ReadSchemaError(
                'Grouped/aggregate reads cannot load entity relations'
            );
        const definitions = (this.source.introspect().extensions?.relations ??
            []) as RelationSpec[];
        const key = selector(
            Object.fromEntries(definitions.map(r => [r.name, r.name])) as any
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
        const Constructor = getSchemaQueryBuilderCtor();
        let child: AnyReadQuery = createReadQuery(
            this.knex,
            foreign,
            getEffectiveBaseQuery(new Constructor(this.knex, foreign)).clone()
        );
        if (customize) {
            const customized = customize(child as any);
            if (!child.sameSource(customized))
                throw new ReadSchemaError(
                    'Relation customizer must return its configured read query'
                );
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
        if (this.grouped || Object.values(this.fields).some(f => f.aggregate))
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

    /** Join one typed nested object with explicit property keys, including nullable joins. */
    joinOne<
        F extends ReadObject,
        K extends string,
        Required extends boolean = true,
        Child extends ReadQueryShape = SchemaAwareQuery<F>
    >(
        spec: JoinOneSpec<S, F, K, Required>,
        customize?: (query: SchemaAwareQuery<F>) => Child
    ): SchemaReadQuery<
        S,
        AddField<
            Row,
            K,
            Required extends true
                ? Child['rowSchema']
                : SchemaForValue<InferType<Child['rowSchema']> | null>
        >,
        Relations & Record<K, RelationInfo<'hasOne', F>>
    > {
        if (spec.foreignQuery || spec.mappers)
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
        spec: Omit<JoinManySpec<S, F, K>, 'orderBy'>,
        customize?: (query: SchemaAwareQuery<F>) => Child
    ): SchemaReadQuery<
        S,
        AddField<Row, K, ArraySchemaBuilder<Child['rowSchema']>>,
        Relations & Record<K, RelationInfo<'hasMany', F>>
    > {
        if (spec.foreignQuery || spec.mappers || 'orderBy' in spec)
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
        const query = this.base.clone().clearSelect();
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
        return query.select(expressions);
    }

    /** Render debugging SQL without execution; bound values may be sensitive. */
    toQuery(): string {
        return this.compile().toQuery();
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
    async paginateAfter(
        options: CompositeCursorOptions<S>
    ): Promise<CursorPaginationResult<InferType<Row>>> {
        if (this.grouped || Object.values(this.fields).some(f => f.aggregate))
            throw new ReadSchemaError(
                'Cursor pagination cannot be used for aggregate reads'
            );
        const Constructor = getSchemaQueryBuilderCtor();
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

/** @internal Enter schema-aware mode only before result-shaping legacy operations. */
export function schemaReadQuery<S extends ReadObject>(
    builder: SchemaQueryBuilder<S, any>
): SchemaAwareQuery<S> {
    const state = getState(builder);
    if (
        state.selectionMode !== null ||
        state.specs.length ||
        state.variantRelationIncludes.length
    )
        throw new ReadSchemaError(
            'Call withRowSchema() before select/include/join operations'
        );
    if (
        state.opaqueReadShape ||
        state.enabledVariants ||
        state.variantWhereFilters.length
    )
        throw new ReadSchemaError(
            'Call withRowSchema() before raw or variant-specific operations'
        );
    const base = getEffectiveBaseQuery(builder).clone();
    const statements = (base as any)._statements as Array<{ grouping: string }>;
    if (
        statements.some(s => s.grouping === 'order') ||
        (base as any)._single.limit !== undefined ||
        (base as any)._single.offset !== undefined
    )
        throw new ReadSchemaError(
            'Call withRowSchema() before ordering or pagination'
        );
    if (
        statements.some(s =>
            ['columns', 'join', 'group', 'having', 'union'].includes(s.grouping)
        )
    )
        throw new ReadSchemaError(
            'Existing raw projections, joins and aggregates cannot declare a read schema'
        );
    return createReadQuery(state.knex, state.localSchema as S, base);
}

/** @internal Shared reader factory for roots and nested relations. */
export function createReadQuery<S extends ReadObject>(
    knex: Knex,
    schema: S,
    base: Knex.QueryBuilder
): SchemaAwareQuery<S> {
    return (
        getVariants(schema)
            ? new PolymorphicReadQuery(knex, schema, base)
            : new SchemaReadQuery(knex, schema, base)
    ) as SchemaAwareQuery<S>;
}
