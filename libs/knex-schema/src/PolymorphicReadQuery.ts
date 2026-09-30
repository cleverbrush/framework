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
import { COLUMN } from './expressions.js';
import { getVariants } from './extension.js';
import {
    getEffectiveBaseQuery,
    getSchemaQueryBuilderCtor
} from './operations/helpers.js';
import { privateColumn } from './operations/ordering.js';
import type {
    EntityReadSchema,
    ReadRelations,
    ReadVariantMetadata
} from './read-entity.js';
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
    SchemaReadQuery
} from './SchemaReadQuery.js';

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
    [K in keyof P & string]: V extends { allowOrphan: true }
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
        > &
        Record<Discriminator<S>, SchemaBuilder<K>>
>;
/** Per-variant schemas for explicit application-level discriminator dispatch. */
export type VariantReadSchemas<S extends ReadObject> = {
    [K in keyof VariantMap<S> & string]: VariantReadSchema<S, K>;
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
    [K in keyof B & keyof VariantMap<S> & string]: SchemaReadQuery<
        BranchSource<S, K>,
        B[K],
        ReadRelations<S> & ReadRelations<VariantBody<S, K>>
    >;
};
type Selector<S extends ReadObject> = (
    columns: ReadColumns<S, keyof ReadRelations<S>>
) => { readonly [COLUMN]: { column: string } };

/**
 * Immutable polymorphic read graph. Branches are combined in one PostgreSQL statement;
 * rowSchema is a real discriminated union and variantRowSchemas supplies object schemas
 * for separately configured mappers. Framework does not choose application DTO mappings.
 */
export class PolymorphicReadQuery<
    S extends ReadObject,
    B extends Record<string, ReadObject> = VariantReadSchemas<S>
> {
    /** @internal Nominal identity for typed child-query customizers. */
    declare readonly [READ_QUERY]: true;
    /** Runtime union matching decoded results, including selected variant bodies. */
    readonly rowSchema: PolymorphicRowSchema<B>;
    /** Stable object schemas keyed by discriminator, suitable for mapper.configure(). */
    readonly variantRowSchemas: Readonly<B>;
    private branches: Record<string, SchemaReadQuery<any, any, any>>;
    private fallback: SchemaReadQuery<any, any, any>;
    private orders: Array<{ key: string; direction: 'asc' | 'desc' }> = [];
    private rowLimit?: number;
    private rowOffset?: number;
    private includeUnknown = true;

    /** @internal Use withRowSchema() instead of constructing polymorphic readers. */
    constructor(
        private readonly knex: Knex,
        private readonly source: S,
        private readonly base: Knex.QueryBuilder
    ) {
        const config = getVariants(source);
        if (!config)
            throw new ReadSchemaError('No polymorphic variants are declared');
        this.branches = Object.create(null);
        for (const key of Object.keys(config.variants))
            this.branches[key] = this.branch(key, true);
        const common = this.commonSource();
        const discriminator =
            buildColumnMap(source).propToCol.get(config.discriminatorKey) ??
            config.discriminatorKey;
        // Invert only the discriminator guard, not caller/default-scope filters.
        this.fallback = new SchemaReadQuery<any, any, any>(
            knex,
            common,
            knex
                .from(base.clone().as('__read_unknown'))
                .where(q =>
                    q
                        .whereNotIn(discriminator, Object.keys(config.variants))
                        .orWhereNull(discriminator)
                )
        );
        const schemas = Object.fromEntries(
            Object.entries(this.branches).map(([key, q]) => [key, q.rowSchema])
        );
        this.variantRowSchemas = Object.freeze(schemas) as Readonly<B>;
        this.rowSchema = this.unionSchema(
            schemas
        ) as unknown as PolymorphicRowSchema<B>;
    }

    private commonSource(): ReadObject {
        const info = this.source.introspect();
        return (object(info.properties) as any)
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

    private branch(key: string, body: boolean): SchemaReadQuery<any, any, any> {
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
            const Constructor = getSchemaQueryBuilderCtor();
            const bodyQuery = getEffectiveBaseQuery(
                new Constructor(this.knex, variant.schema)
            ).clone();
            query.leftJoin(
                bodyQuery.as(bodyAlias),
                `${bodyAlias}.${variant.foreignKey}`,
                `${baseAlias}.${basePk[0]}`
            );
        }
        const columns: Record<string, Knex.Raw> = Object.create(null);
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
        return new SchemaReadQuery<any, any, any>(
            this.knex,
            schema,
            query.select(columns)
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
            other instanceof PolymorphicReadQuery &&
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

    /** Add a comparison to every branch without changing its declared result schema. */
    where(selector: Selector<S>, value: unknown): this;
    /** Add an explicit supported comparison operator to every branch. */
    where(selector: Selector<S>, operator: string, value: unknown): this;
    /** Add a bound comparison; existing reader instances remain unchanged. */
    where(selector: Selector<S>, ...args: unknown[]): this {
        const copy = this.copy();
        for (const [key, branch] of Object.entries(copy.branches))
            copy.branches[key] = (branch.where as Function)(selector, ...args);
        copy.fallback = (copy.fallback.where as Function)(selector, ...args);
        return copy;
    }
    /** Order all variants together, not independently within each branch. */
    orderBy(selector: Selector<S>, direction: 'asc' | 'desc' = 'asc'): this {
        if (direction !== 'asc' && direction !== 'desc')
            throw new ReadSchemaError('Invalid ordering direction');
        const properties = this.source.introspect().properties;
        const key = selector(
            Object.fromEntries(
                Object.keys(properties).map(k => [
                    k,
                    { [COLUMN]: { column: k } }
                ])
            ) as any
        )[COLUMN].column;
        if (!Object.hasOwn(properties, key))
            throw new ReadSchemaError('Unknown polymorphic ordering column');
        const copy = this.copy();
        copy.orders.push({ key, direction });
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
    ): PolymorphicReadQuery<S, Pick<B, K[number]>> {
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
    ): PolymorphicReadQuery<S, Omit<B, K> & Record<K, Q['rowSchema']>> {
        const current = this.branches[key];
        if (!current) throw new ReadSchemaError(`Unknown variant: ${key}`);
        const configured = configure(current as any);
        if (!current.sameSource(configured))
            throw new ReadSchemaError(
                'Variant customizer must return its configured read query'
            );
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
        copy.branches[key] = configured as unknown as SchemaReadQuery<
            any,
            any,
            any
        >;
        copy.refresh();
        return copy as any;
    }

    /** @internal Compile one UNION ALL statement; JSON preserves distinct branch shapes. */
    compile(correlate?: ReadCorrelation): Knex.QueryBuilder {
        const reserved = Object.values(this.branches).flatMap(branch =>
            Object.keys(branch.rowSchema.introspect().properties)
        );
        const order = this.orders.map(item => {
            const hidden = privateColumn(reserved, 'read_order');
            reserved.push(hidden);
            return { ...item, hidden };
        });
        const queries = [
            ...Object.values(this.branches),
            ...(this.includeUnknown ? [this.fallback] : [])
        ].map(branch =>
            this.knex
                .from(
                    branch
                        .compile((sql, alias, source) => {
                            correlate?.(sql, alias, source);
                            const columns = buildColumnMap(source).propToCol;
                            for (const { key, hidden } of order)
                                sql.select({
                                    [hidden]: this.knex.raw(
                                        'cast(?? as text)',
                                        [`${alias}.${columns.get(key) ?? key}`]
                                    )
                                });
                        })
                        .as('__read_branch')
                )
                .select(this.knex.raw('to_jsonb(__read_branch) as __read_poly'))
        );
        const query = this.knex
            .from(
                this.knex
                    .queryBuilder()
                    .unionAll(queries, true)
                    .as('__read_variants')
            )
            .select('__read_poly');
        for (const { key, direction, hidden } of order) {
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
                `cast(__read_poly ->> ? as ${type}) ${direction}`,
                [hidden]
            );
        }
        if (this.rowLimit !== undefined) query.limit(this.rowLimit);
        if (this.rowOffset !== undefined) query.offset(this.rowOffset);
        return query;
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
