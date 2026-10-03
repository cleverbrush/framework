import {
    type InferType,
    type ObjectSchemaBuilder,
    object,
    type SchemaBuilder,
    string,
    type UnionSchemaBuilder,
    union
} from '@cleverbrush/schema';
import type { Knex } from 'knex';
import { buildColumnMap, getPrimaryKeyColumns } from './columns.js';
import type { SchemaProps } from './entity.js';
import { type AliasedColumn, COLUMN } from './expressions.js';
import { getTableName, getVariants } from './extension.js';
import { OpaqueQuery, type QueryOutput } from './OpaqueQuery.js';
import { privateColumn } from './operations/ordering.js';
import type {
    EntityReadSchema,
    ReadRelations,
    ReadVariantMetadata
} from './read-entity.js';
import {
    captureReadRaw,
    type ReadPredicate,
    type ReadPredicateContext,
    ReadPredicates
} from './read-predicates.js';
import {
    type ObjectReadSchema,
    type ReadObject,
    type ReadSchema,
    ReadSchemaError,
    type SchemaForValue
} from './read-schema.js';
import {
    READ_QUERY,
    type ReadColumns,
    type ReadCorrelation,
    type ReadQueryShape,
    type Related,
    type RelationField,
    type SchemaAwareQuery,
    SchemaQueryBuilder
} from './SchemaQueryBuilder.js';
import type { PaginationResult } from './types.js';

type VariantMap<S> =
    ReadVariantMetadata<S> extends { variants: infer V } ? V : {};
type VariantBody<S, K extends keyof VariantMap<S>> = VariantMap<S>[K] extends {
    schema: infer Body;
}
    ? Body
    : never;
type VariantKey<S, K extends keyof VariantMap<S>> = VariantMap<S>[K] extends {
    foreignKey: infer FK extends string;
}
    ? FK
    : never;
type Discriminator<S> =
    ReadVariantMetadata<S> extends { discriminator: infer D extends string }
        ? D
        : never;
type BranchProps<S extends ReadObject, K extends keyof VariantMap<S>> = Omit<
    SchemaProps<S>,
    keyof ReadRelations<S>
> &
    Omit<
        SchemaProps<VariantBody<S, K>>,
        keyof ReadRelations<VariantBody<S, K>> | VariantKey<S, K>
    >;
type OrphanProps<P, V> = {
    -readonly [K in keyof P as K extends string ? K : never]-?: V extends {
        allowOrphan: true;
    }
        ? SchemaForValue<InferType<P[K]> | null>
        : P[K] extends ReadSchema
          ? P[K]
          : never;
};
/** Runtime object schema for one polymorphic discriminator branch. */
export type VariantReadSchema<
    S extends ReadObject,
    K extends keyof VariantMap<S> & string
> = ObjectSchemaBuilder<
    Omit<
        SchemaProps<ObjectReadSchema<S, keyof ReadRelations<S>>>,
        keyof SchemaProps<VariantBody<S, K>> | Discriminator<S>
    > &
        OrphanProps<
            Omit<
                SchemaProps<
                    ObjectReadSchema<
                        VariantBody<S, K>,
                        keyof ReadRelations<VariantBody<S, K>>
                    >
                >,
                VariantKey<S, K> | Discriminator<S>
            >,
            VariantMap<S>[K]
        > & {
            -readonly [P in keyof Pick<
                SchemaProps<S>,
                Extract<Discriminator<S>, keyof SchemaProps<S>>
            >]-?: SchemaBuilder<K>;
        } & Record<
            Exclude<Discriminator<S>, keyof SchemaProps<S>>,
            SchemaBuilder<K>
        >
>;
/** Per-variant schemas for explicit application-level discriminator dispatch. */
export type VariantReadSchemas<S extends ReadObject> = {
    -readonly [K in keyof VariantMap<S> as K extends string
        ? K
        : never]-?: VariantReadSchema<S, K & string>;
};
/** The genuine union schema returned for polymorphic read rows. */
export type PolymorphicRowSchema<B extends Record<string, ReadObject>> =
    UnionSchemaBuilder<Array<B[keyof B]>, true, false, InferType<B[keyof B]>>;
type BranchSource<
    S extends ReadObject,
    K extends keyof VariantMap<S> & string
> = EntityReadSchema<
    ObjectSchemaBuilder<BranchProps<S, K>>,
    ReadRelations<S> & ReadRelations<VariantBody<S, K>>
>;
type BranchQueries<
    S extends ReadObject,
    B extends Record<string, ReadObject>
> = {
    [K in keyof B & keyof VariantMap<S> & string]: SchemaQueryBuilder<
        BranchSource<S, K>,
        B[K],
        ReadRelations<S> & ReadRelations<VariantBody<S, K>>
    >;
};
type Selector<S extends ReadObject> = (
    columns: ReadColumns<S, keyof ReadRelations<S>>
) => { readonly [COLUMN]: { column: string } };
let polymorphicAliasSequence = 0;
type PolymorphicOrder =
    | { key: string; direction: 'asc' | 'desc' }
    | { raw: () => Knex.Raw };

/**
 * Immutable polymorphic read graph. Branches are combined in one PostgreSQL statement;
 * rowSchema is a real discriminated union and variantRowSchemas supplies object schemas
 * for separately configured mappers. Framework does not choose application DTO mappings.
 */
export class PolymorphicQueryBuilder<
    S extends ReadObject,
    B extends Record<string, ReadObject> = VariantReadSchemas<S>
> extends ReadPredicates<ReadColumns<S, keyof ReadRelations<S>>> {
    /** @internal Nominal identity for typed child-query customizers. */
    declare readonly [READ_QUERY]: true;
    /** Runtime union matching decoded results, including selected variant bodies. */
    readonly rowSchema: PolymorphicRowSchema<B>;
    /** Stable object schemas keyed by discriminator, suitable for mapper.configure(). */
    readonly variantRowSchemas: Readonly<B>;
    private branches: Record<
        string,
        SchemaQueryBuilder<any, any, any, boolean>
    >;
    private fallback: SchemaQueryBuilder<any, any, any, boolean>;
    private orders: PolymorphicOrder[] = [];
    private rowLimit?: number;
    private rowOffset?: number;
    private includeUnknown = true;
    private predicates: readonly ReadPredicate[] = [];
    private defaults?: {
        predicates: readonly ReadPredicate[];
        orders: PolymorphicOrder[];
        limit?: number;
        offset?: number;
    };
    private readonly deletionColumn: string;
    private skipDefaults = false;
    private deleted: 'exclude' | 'include' | 'only' = 'exclude';
    private readonly predicateAlias =
        `__polymorphic_${polymorphicAliasSequence++}`;
    private readonly columns: Record<string, AliasedColumn<any>>;

    /** @internal Create through query() or an ORM DbSet. */
    constructor(
        private readonly knex: Knex,
        private readonly source: S,
        private readonly base: Knex.QueryBuilder
    ) {
        super();
        this.columns = Object.fromEntries(
            Object.entries(source.introspect().properties).map(
                ([key, schema]) => [
                    key,
                    {
                        [COLUMN]: {
                            alias: this.predicateAlias,
                            column: key,
                            schema
                        }
                    }
                ]
            )
        );
        const config = getVariants(source);
        if (!config)
            throw new ReadSchemaError('No polymorphic variants are declared');
        this.deletionColumn = privateColumn(
            [
                ...Object.keys(source.introspect().properties),
                ...Object.values(config.variants).flatMap(v =>
                    Object.keys(v.schema.introspect().properties)
                )
            ],
            'read_deleted'
        );
        this.branches = Object.create(null);
        for (const key of Object.keys(config.variants))
            this.branches[key] = this.branch(key, true);
        const common = this.commonSource();
        const discriminator =
            buildColumnMap(source).propToCol.get(config.discriminatorKey) ??
            config.discriminatorKey;
        // Invert only the discriminator guard, not caller/default-scope filters.
        this.fallback = new SchemaQueryBuilder<any, any, any, boolean>(
            knex,
            common,
            knex
                .from(base.clone().as('__read_unknown'))
                .select({
                    ...Object.fromEntries(
                        Object.keys(common.introspect().properties).map(key => [
                            key,
                            knex.ref(
                                `__read_unknown.${buildColumnMap(source).propToCol.get(key) ?? key}`
                            )
                        ])
                    ),
                    ...this.deletionSelection('__read_unknown')
                })
                .where(q =>
                    q
                        .whereNotIn(discriminator, Object.keys(config.variants))
                        .orWhereNull(discriminator)
                ),
            this.predicateAlias
        );
        const schemas = Object.fromEntries(
            Object.entries(this.branches).map(([key, q]) => [key, q.rowSchema])
        );
        this.variantRowSchemas = Object.freeze(schemas) as Readonly<B>;
        this.rowSchema = this.unionSchema(
            schemas
        ) as unknown as PolymorphicRowSchema<B>;
        const scope = source.introspect().extensions?.defaultScope;
        if (typeof scope === 'function') {
            const configured = scope(this.copy());
            if (
                !this.sameSource(configured) ||
                configured.rowSchema !== this.rowSchema ||
                configured.deleted !== this.deleted ||
                configured.skipDefaults !== this.skipDefaults ||
                configured.knex !== this.knex
            ) {
                if (configured instanceof Promise)
                    void configured.catch(() => {});
                throw new ReadSchemaError(
                    'Scopes must synchronously return a shape-preserving query'
                );
            }
            this.defaults = {
                predicates: configured.predicates,
                orders: configured.orders,
                limit: configured.rowLimit,
                offset: configured.rowOffset
            };
        }
    }

    private deletionSelection(alias: string): Record<string, Knex.Raw> {
        const softDelete = this.source.introspect().extensions?.softDelete as
            | { column: string }
            | undefined;
        return softDelete
            ? {
                  [this.deletionColumn]: this.knex.raw('??', [
                      `${alias}.${softDelete.column}`
                  ])
              }
            : {};
    }

    private commonSource(): ReadObject {
        const info = this.source.introspect();
        const relationNames = new Set(
            ((info.extensions?.relations ?? []) as { name: string }[]).map(
                relation => relation.name
            )
        );
        const properties = Object.fromEntries(
            Object.entries(info.properties)
                .filter(([key]) => !relationNames.has(key))
                .map(([key, schema]) => [
                    key,
                    (schema as ReadSchema).withExtension('columnName', key)
                ])
        );
        return (object(properties) as any)
            .withExtension('tableName', info.extensions?.tableName)
            .withExtension('relations', info.extensions?.relations ?? []);
    }

    private unionSchema(schemas: Record<string, ReadSchema>): ReadSchema {
        const [first, ...rest] = Object.values(schemas);
        if (!first)
            throw new ReadSchemaError(
                'A polymorphic read requires at least one variant'
            );
        return rest.reduce(
            (result: any, schema) => result.or(schema),
            union(first)
        );
    }

    private branch(
        key: string,
        body: boolean
    ): SchemaQueryBuilder<any, any, any, boolean> {
        const config = getVariants(this.source)!;
        const variant = config.variants[key];
        const baseInfo = this.source.introspect();
        const baseProperties = baseInfo.properties as Record<
            string,
            ReadSchema
        >;
        const variantProperties = variant.schema.introspect()
            .properties as Record<string, ReadSchema>;
        const commonRelations = (baseInfo.extensions?.relations ?? []) as any[];
        const declaredRelations = (variant.schema.introspect().extensions
            ?.relations ?? []) as any[];
        const variantRelations = body
            ? [
                  ...declaredRelations,
                  ...variant.relations.filter(
                      r => !declaredRelations.some(d => d.name === r.name)
                  )
              ]
            : [];
        const excluded = new Set(
            [...commonRelations, ...variantRelations].map(r => r.name)
        );
        const baseCols = buildColumnMap(this.source).propToCol;
        const variantCols = buildColumnMap(variant.schema).propToCol;
        const baseAlias = '__read_poly_base';
        const bodyAlias = '__read_poly_body';
        const basePk = getPrimaryKeyColumns(this.source).columnNames;
        const query = this.knex
            .from(this.base.clone().as(baseAlias))
            .where(
                `${baseAlias}.${baseCols.get(config.discriminatorKey) ?? config.discriminatorKey}`,
                key
            );
        if (body && variant.storage === 'cti') {
            if (basePk.length !== 1)
                throw new ReadSchemaError(
                    'CTI read graphs require a single-column primary key'
                );
            const bodyQuery = new SchemaQueryBuilder(
                this.knex,
                variant.schema,
                this.knex(getTableName(variant.schema))
            ).storageQuery();
            query.leftJoin(
                bodyQuery.as(bodyAlias),
                `${bodyAlias}.${variant.foreignKey}`,
                `${baseAlias}.${basePk[0]}`
            );
        }
        const columns: Record<string, Knex.Raw> = {
            ...this.deletionSelection(baseAlias)
        };
        const properties: Record<string, ReadSchema> = Object.create(null);
        for (const [name, schema] of Object.entries(baseProperties)) {
            if (excluded.has(name)) continue;
            columns[name] = this.knex.raw('??', [
                `${baseAlias}.${baseCols.get(name) ?? name}`
            ]);
            properties[name] = (schema as any).withExtension(
                'columnName',
                name
            );
        }
        if (body)
            for (const [name, schema] of Object.entries(variantProperties)) {
                if (
                    excluded.has(name) ||
                    (variant.storage === 'cti' &&
                        variantCols.get(name) === variant.foreignKey)
                )
                    continue;
                columns[name] = this.knex.raw('??', [
                    `${variant.storage === 'cti' ? bodyAlias : baseAlias}.${variantCols.get(name) ?? name}`
                ]);
                properties[name] = (
                    variant.allowOrphan ? schema.nullable() : (schema as any)
                ).withExtension('columnName', name);
            }
        properties[config.discriminatorKey] = string(key);
        const basePrimaryProperty = buildColumnMap(this.source).colToProp.get(
            basePk[0]
        );
        const variantForeignProperty = buildColumnMap(
            variant.schema
        ).colToProp.get(variant.foreignKey ?? '');
        const relations = [...commonRelations, ...variantRelations].map(
            relation => ({
                ...relation,
                localKey:
                    relation.localKey === variantForeignProperty
                        ? basePrimaryProperty
                        : relation.localKey,
                foreignKey:
                    relation.type === 'belongsTo'
                        ? (buildColumnMap(variant.schema).colToProp.get(
                              relation.foreignKey
                          ) ?? relation.foreignKey)
                        : relation.foreignKey
            })
        );
        let schema = (object(properties) as any)
            .withExtension('tableName', '__read_poly_source')
            .withExtension('relations', relations);
        if (body && variant.storage === 'cti' && !variant.allowOrphan) {
            if (Object.hasOwn(properties, '__read_cti_present'))
                throw new ReadSchemaError('Reserved CTI read column collision');
            columns.__read_cti_present = this.knex.raw('??', [
                `${bodyAlias}.${variant.foreignKey}`
            ]);
            schema = schema.withExtension(
                'readOrphanColumn',
                '__read_cti_present'
            );
        }
        return new SchemaQueryBuilder<any, any, any, boolean>(
            this.knex,
            schema,
            query.select(columns),
            this.predicateAlias
        );
    }

    private copy(): this {
        return Object.assign(Object.create(Object.getPrototypeOf(this)), this, {
            branches: { ...this.branches },
            orders: [...this.orders]
        });
    }

    /** @internal Check the identity of the original read source, retained by clones. */
    sameSource(other: unknown): boolean {
        return (
            other instanceof PolymorphicQueryBuilder &&
            this.base === other.base &&
            this.source === other.source
        );
    }

    private refresh(): void {
        const schemas = Object.fromEntries(
            Object.entries(this.branches).map(([key, q]) => [key, q.rowSchema])
        );
        Object.assign(this, {
            variantRowSchemas: Object.freeze(schemas),
            rowSchema: this.unionSchema(schemas)
        });
    }

    protected readPredicateContext(): ReadPredicateContext<
        ReadColumns<S, keyof ReadRelations<S>>
    > {
        return {
            knex: this.knex,
            column: selector => {
                const column =
                    typeof selector === 'string'
                        ? this.columns[selector]
                        : selector(this.columns as any);
                if (!column || !Object.values(this.columns).includes(column))
                    throw new ReadSchemaError(
                        'Column does not belong to this polymorphic query'
                    );
                return `${this.predicateAlias}.${column[COLUMN].column}`;
            }
        };
    }
    protected addReadPredicate(predicate: ReadPredicate): this {
        const copy = this.copy();
        copy.predicates = [...this.predicates, predicate];
        return copy;
    }
    /** Remove the default scope while preserving explicit predicates. */
    unscoped(): this {
        const copy = this.copy();
        copy.skipDefaults = true;
        return copy;
    }
    /** Include soft-deleted entities in every branch. */
    withDeleted(): this {
        const copy = this.copy();
        copy.deleted = 'include';
        return copy;
    }
    /** Match only soft-deleted entities in every branch. */
    onlyDeleted(): this {
        const copy = this.copy();
        copy.deleted = 'only';
        return copy;
    }
    /** Apply a named immutable scope once. */
    scoped(name: string): this {
        const scope = (
            this.source.introspect().extensions?.scopes as
                | Record<string, Function>
                | undefined
        )?.[name];
        if (!scope) throw new ReadSchemaError(`Unknown scope: ${name}`);
        const configured = scope(this.copy());
        if (
            !this.sameSource(configured) ||
            configured.rowSchema !== this.rowSchema ||
            configured.deleted !== this.deleted ||
            configured.skipDefaults !== this.skipDefaults ||
            configured.knex !== this.knex
        ) {
            if (configured instanceof Promise) void configured.catch(() => {});
            throw new ReadSchemaError(
                'Scopes must synchronously return a shape-preserving query'
            );
        }
        return configured;
    }
    /** True when all branches retain complete entity rows. */
    get returnsEntityRows(): boolean {
        return Object.values(this.branches).every(
            branch => branch.returnsEntityRows
        );
    }
    /** Customize a relation on one discriminator branch. */
    includeVariant(
        key: keyof B & keyof VariantMap<S> & string,
        relation: string,
        customize?: (query: SchemaQueryBuilder<any, any>) => ReadQueryShape
    ): this {
        return this.forVariant(key, query =>
            query.include(() => relation as any, customize as any)
        ) as unknown as this;
    }
    /** Load a common relation on every branch, configuring the child exactly once. */
    include<
        K extends keyof ReadRelations<S> & string,
        Child extends ReadQueryShape = SchemaAwareQuery<
            Related<ReadRelations<S>[K]>
        >
    >(
        selector: K | ((relations: { [P in keyof ReadRelations<S>]: P }) => K),
        customize?: (
            query: SchemaAwareQuery<Related<ReadRelations<S>[K]>>
        ) => Child
    ): PolymorphicQueryBuilder<
        S,
        {
            [P in keyof B]: ObjectSchemaBuilder<
                SchemaProps<B[P]> & {
                    -readonly [R in keyof Pick<
                        ReadRelations<S>,
                        K
                    >]-?: RelationField<
                        ReadRelations<S>[K],
                        Child['rowSchema']
                    >;
                }
            >;
        }
    > {
        const relations = (this.source.introspect().extensions?.relations ??
            []) as { name: string }[];
        const name =
            typeof selector === 'string'
                ? selector
                : selector(
                      Object.fromEntries(
                          relations.map(relation => [
                              relation.name,
                              relation.name
                          ])
                      ) as any
                  );
        if (!relations.some(relation => relation.name === name)) {
            const variants = getVariants(this.source)!.variants;
            const candidates = Object.entries(variants).filter(([, variant]) =>
                variant.relations.some(relation => relation.name === name)
            );
            if (candidates.length > 1)
                throw new ReadSchemaError(
                    `Ambiguous relation: ${name}; use includeVariant`
                );
            if (candidates.length === 1)
                return this.includeVariant(
                    candidates[0][0] as any,
                    name,
                    customize as any
                ) as any;
            throw new ReadSchemaError(`Unknown relation: ${name}`);
        }
        const copy = this.copy();
        const entries = Object.entries(copy.branches);
        const [firstKey, first] = entries[0];
        const prepared = first.include(name, customize as any);
        copy.branches[firstKey] = prepared;
        for (const [key, branch] of entries.slice(1))
            copy.branches[key] = branch.includeFrom(name, prepared);
        copy.fallback = copy.fallback.includeFrom(name, prepared);
        copy.refresh();
        return copy as any;
    }
    /** Filter one branch using schema property names; other variants remain unaffected. */
    whereVariant(
        key: keyof B & keyof VariantMap<S> & string,
        selector: string | ((columns: any) => any),
        operator: string,
        value: unknown
    ): this {
        return this.forVariant(key, query =>
            query.where(selector as any, operator, value)
        ) as unknown as this;
    }
    /** Order all variants together, not independently within each branch. */
    orderBy(
        selector:
            | Selector<S>
            | (keyof ReadColumns<S, keyof ReadRelations<S>> & string),
        direction: 'asc' | 'desc' = 'asc'
    ): this {
        if (direction !== 'asc' && direction !== 'desc')
            throw new ReadSchemaError('Invalid ordering direction');
        const column =
            typeof selector === 'string'
                ? this.columns[selector]
                : selector(this.columns as any);
        if (!column || !Object.values(this.columns).includes(column as any))
            throw new ReadSchemaError(
                'Column does not belong to this polymorphic query'
            );
        const key = column[COLUMN].column;
        const copy = this.copy();
        copy.orders.push({ key, direction });
        return copy;
    }
    /** Order the combined JSON-envelope SQL using trusted SQL and captured bindings. */
    orderByRaw(sql: string, bindings: readonly Knex.RawBinding[] = []): this {
        const copy = this.copy();
        copy.orders.push({ raw: captureReadRaw(this.knex, sql, bindings) });
        return copy;
    }
    /** Limit the combined result across all variants. */
    limit(count: number): this {
        if (!Number.isInteger(count) || count < 0)
            throw new ReadSchemaError('Limit must be a non-negative integer');
        const copy = this.copy();
        copy.rowLimit = count;
        return copy;
    }
    /** Restrict returned discriminator branches and narrow both runtime and inferred schemas. */
    selectVariants<const K extends readonly (keyof B & string)[]>(
        keys: K
    ): PolymorphicQueryBuilder<S, Pick<B, K[number]>> {
        if (
            !keys.length ||
            new Set(keys).size !== keys.length ||
            keys.some(key => !Object.hasOwn(this.branches, key))
        )
            throw new ReadSchemaError(
                'Select a non-empty set of declared variants without duplicates'
            );
        const copy = this.copy();
        copy.branches = Object.fromEntries(
            keys.map(key => [key, this.branches[key]])
        );
        copy.includeUnknown = false;
        copy.refresh();
        return copy as any;
    }
    /** Skip rows of the combined result, using a stable explicit ordering. */
    offset(count: number): this {
        if (!Number.isInteger(count) || count < 0)
            throw new ReadSchemaError('Offset must be a non-negative integer');
        const copy = this.copy();
        copy.rowOffset = count;
        return copy;
    }

    /**
     * Customize a variant's typed read query, including nested relations. Return the
     * configured query; other branches and their schemas are unchanged.
     */
    forVariant<
        K extends keyof B & keyof VariantMap<S> & string,
        Q extends ReadQueryShape<ReadObject>
    >(
        key: K,
        configure: (query: BranchQueries<S, B>[K]) => Q
    ): PolymorphicQueryBuilder<S, Omit<B, K> & Record<K, Q['rowSchema']>> {
        const current = this.branches[key];
        if (!current) throw new ReadSchemaError(`Unknown variant: ${key}`);
        const configured = configure(current as any);
        if (!current.sameSource(configured)) {
            if (configured instanceof Promise) void configured.catch(() => {});
            throw new ReadSchemaError(
                'Variant customizer must return its configured read query'
            );
        }
        const discriminator = getVariants(this.source)!.discriminatorKey;
        if (
            configured.rowSchema
                .introspect()
                .properties[discriminator]?.introspect().equalsTo !== key
        )
            throw new ReadSchemaError(
                'Variant projections must retain the original discriminator'
            );
        const copy = this.copy();
        copy.branches[key] = configured as unknown as SchemaQueryBuilder<
            any,
            any,
            any
        >;
        copy.refresh();
        return copy as any;
    }

    /** @internal Compile one UNION ALL statement; JSON preserves distinct branch shapes. */
    compile(correlate?: ReadCorrelation): Knex.QueryBuilder {
        return this.compileRows(correlate);
    }

    private compileRows(
        correlate?: ReadCorrelation,
        targetKey?: string
    ): Knex.QueryBuilder {
        const defaults = this.skipDefaults ? undefined : this.defaults;
        const reserved = Object.values(this.branches).flatMap(branch =>
            Object.keys(branch.rowSchema.introspect().properties)
        );
        const order = [...(defaults?.orders ?? []), ...this.orders].map(
            item => {
                if ('raw' in item) return item;
                const hidden = privateColumn(reserved, 'read_order');
                reserved.push(hidden);
                return { ...item, hidden };
            }
        );
        const queries = [
            ...Object.values(this.branches),
            ...(this.includeUnknown ? [this.fallback] : [])
        ].map(original => {
            let branch = original;
            for (const predicates of [
                defaults?.predicates ?? [],
                this.predicates
            ]) {
                if (predicates.length)
                    branch = branch.withPredicate(query => {
                        query.where(nested => {
                            for (const predicate of predicates)
                                predicate(nested);
                        });
                    });
            }
            const softDelete = this.source.introspect().extensions
                ?.softDelete as { column: string } | undefined;
            if (softDelete && this.deleted !== 'include') {
                branch = branch.withPredicate(query => {
                    query[
                        this.deleted === 'only' ? 'whereNotNull' : 'whereNull'
                    ](this.deletionColumn);
                });
            }
            let nativeKey: Knex.Raw | undefined;
            const orderColumns: Record<string, Knex.Raw> = {};
            const compiled = branch.compile((sql, alias, source) => {
                correlate?.(sql, alias, source);
                if (targetKey)
                    nativeKey = this.knex.raw('??', [`${alias}.${targetKey}`]);
                const columns = buildColumnMap(source).propToCol;
                for (const item of order) {
                    if ('raw' in item) continue;
                    const { key, hidden } = item;
                    orderColumns[hidden] = this.knex.raw('cast(?? as text)', [
                        `${alias}.${columns.get(key) ?? key}`
                    ]);
                }
                if (Object.keys(orderColumns).length) sql.select(orderColumns);
            });
            if (targetKey) {
                return compiled
                    .clearSelect()
                    .select({ __write_pk: nativeKey!, ...orderColumns });
            }
            return this.knex
                .from(compiled.as('__read_branch'))
                .select(
                    this.knex.raw('to_jsonb(__read_branch) as __read_poly')
                );
        });
        const query = this.knex
            .from(
                this.knex
                    .queryBuilder()
                    .unionAll(queries, true)
                    .as('__read_variants')
            )
            .select(targetKey ? '__write_pk' : '__read_poly');
        for (const item of order) {
            if ('raw' in item) {
                query.orderByRaw(item.raw());
                continue;
            }
            const { key, direction, hidden } = item;
            const info = this.source.introspect().properties[key].introspect();
            const type =
                info.type === 'number'
                    ? 'numeric'
                    : info.type === 'date'
                      ? 'timestamptz'
                      : info.type === 'boolean'
                        ? 'boolean'
                        : info.type === 'string'
                          ? 'text'
                          : undefined;
            if (!type)
                throw new ReadSchemaError(
                    'Polymorphic ordering requires a scalar column'
                );
            query.orderByRaw(
                targetKey
                    ? `cast(?? as ${type}) ${direction}`
                    : `cast(__read_poly ->> ? as ${type}) ${direction}`,
                [hidden]
            );
        }
        const limit = this.rowLimit ?? defaults?.limit;
        const offset = this.rowOffset ?? defaults?.offset;
        if (limit !== undefined) query.limit(limit);
        if (offset !== undefined) query.offset(offset);
        return query;
    }
    /** @internal Capture native primary keys for a single writable ORM variant. */
    mutationTargets(variantKey: string): Knex.QueryBuilder {
        const keys = Object.keys(this.branches);
        if (keys.length !== 1 || keys[0] !== variantKey || this.includeUnknown)
            throw new ReadSchemaError(
                'Variant writes require exactly their original variant'
            );
        this.branches[variantKey].assertWritable();
        const pk = getPrimaryKeyColumns(this.source);
        if (pk.propertyKeys.length !== 1)
            throw new ReadSchemaError(
                'Variant writes require a single-column primary key'
            );
        return this.compileRows(undefined, pk.propertyKeys[0]);
    }

    /** @internal Decode using exactly the selected branch's schema and codecs. */
    decode(row: any, path = 'row'): InferType<PolymorphicRowSchema<B>> {
        const value = row.__read_poly;
        const key = value?.[getVariants(this.source)!.discriminatorKey];
        const branch = this.branches[key];
        if (!Object.hasOwn(this.branches, key) || !branch)
            throw new ReadSchemaError(
                `${path}: unknown polymorphic discriminator`
            );
        return branch.decode(value, path);
    }
    /** Render debugging SQL without performing any database calls. */
    toQuery(): string {
        return this.compile().toQuery();
    }
    /** Return a separately mutable Knex snapshot of the union statement. */
    toKnexQuery(): Knex.QueryBuilder {
        return this.compile();
    }
    /** Configure a captured union SELECT and declare its complete raw output shape. */
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
    /** Select trusted SQL from the union envelope with an explicit output contract. */
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
    /** Count matching rows across variants, excluding global pagination and ordering. */
    async countValue(): Promise<number> {
        const source = this.compile()
            .clearOrder()
            .clear('limit')
            .clear('offset');
        const row = await this.knex
            .from(source.as('__variant_count'))
            .count({ count: '*' })
            .first();
        const count = Number(row?.count ?? 0);
        if (!Number.isSafeInteger(count))
            throw new ReadSchemaError('Count exceeds the safe integer range');
        return count;
    }
    /** Globally paginate the discriminated union, leaving the source and its metadata unchanged. */
    async paginate({
        page,
        pageSize
    }: {
        page: number;
        pageSize: number;
    }): Promise<PaginationResult<InferType<PolymorphicRowSchema<B>>>> {
        if (
            !Number.isInteger(page) ||
            page < 1 ||
            !Number.isInteger(pageSize) ||
            pageSize < 1
        )
            throw new ReadSchemaError(
                'Page and pageSize must be positive integers'
            );
        const total = await this.countValue();
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
    /** Read a property common to the selected variants; returned scalar values are detached. */
    async pluck<K extends keyof InferType<PolymorphicRowSchema<B>>>(
        key: K
    ): Promise<InferType<PolymorphicRowSchema<B>>[K][]> {
        return (await this.execute()).map(row => (row as any)[key]);
    }
    /** Execute and decode one statement containing every requested branch. */
    async execute(): Promise<InferType<PolymorphicRowSchema<B>>[]> {
        return (await this.compile()).map((row: any) => this.decode(row));
    }
    /** Return the first globally ordered row, or undefined. */
    async first(): Promise<InferType<PolymorphicRowSchema<B>> | undefined> {
        return (await this.limit(1).execute())[0];
    }
    /** Awaiting deliberately executes the query each time. */
    // biome-ignore lint/suspicious/noThenProperty: query readers intentionally support await
    then<T = InferType<PolymorphicRowSchema<B>>[], E = never>(
        resolve?:
            | ((
                  rows: InferType<PolymorphicRowSchema<B>>[]
              ) => T | PromiseLike<T>)
            | null,
        reject?: ((error: any) => E | PromiseLike<E>) | null
    ): Promise<T | E> {
        return this.execute().then(resolve, reject);
    }
    /** Bind independent branch queries to a caller-owned transaction. */
    transacting(trx: Knex.Transaction): this {
        const copy = this.copy();
        Object.assign(copy, { knex: trx });
        copy.branches = Object.fromEntries(
            Object.entries(this.branches).map(([key, q]) => [
                key,
                q.transacting(trx)
            ])
        );
        copy.fallback = this.fallback.transacting(trx);
        return copy;
    }
}
