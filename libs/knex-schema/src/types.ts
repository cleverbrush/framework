// @cleverbrush/knex-schema — Type definitions

import type {
    InferType,
    ObjectSchemaBuilder,
    PropertyDescriptor,
    PropertyDescriptorTree
} from '@cleverbrush/schema';
import type { Knex } from 'knex';
import type { AggregateExpression } from './expressions.js';

// ---------------------------------------------------------------------------
// Utility: extract string keys from an ObjectSchemaBuilder's inferred type
// ---------------------------------------------------------------------------
/**
 * String property names available on a schema-inferred row, before SQL column-name mapping.
 */
export type SchemaKeys<
    T extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> = keyof InferType<T> & string;

// ---------------------------------------------------------------------------
// ColumnRef — a column can be specified as a string key or a property accessor
// ---------------------------------------------------------------------------

/**
 * Strips the `withExtensions()` overlay from a schema type, reducing it to a
 * plain `ObjectSchemaBuilder<TProps, TReq>`. This is necessary so that
 * `PropertyDescriptorTree<SchemaBase<T>, SchemaBase<T>>` resolves without
 * hitting TypeScript's recursion depth limit, which happens when the full
 * intersection type (builder + extension methods + HiddenExtensionMethods) is
 * passed directly.
 */
type SchemaBase<
    T extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> =
    T extends ObjectSchemaBuilder<infer P, infer Req, any, any, any, any, any>
        ? ObjectSchemaBuilder<P, Req>
        : never;

/**
 * Reference a schema property by key or typed descriptor selector; nested selectors may address JSON paths.
 */
export type ColumnRef<
    T extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> =
    | SchemaKeys<T>
    | ((
          tree: PropertyDescriptorTree<SchemaBase<T>, SchemaBase<T>>
      ) => PropertyDescriptor<SchemaBase<T>, any, any>);

// ---------------------------------------------------------------------------
// JoinOne specification — single related object (N:1 / belongsTo / hasOne)
// ---------------------------------------------------------------------------
/**
 * Configure a single nested eager relation, including its join keys, requiredness and foreign query.
 */
export interface JoinOneSpec<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TForeignSchema extends ObjectSchemaBuilder<
        any,
        any,
        any,
        any,
        any,
        any,
        any
    >,
    TFieldName extends string = string,
    TRequired extends boolean = true
> {
    /** Column on the local (base) table used for the join (string key or property accessor) */
    localColumn: ColumnRef<TLocalSchema>;
    /** Column on the foreign table used for the join (string key or property accessor) */
    foreignColumn: ColumnRef<TForeignSchema>;
    /** Name of the field that will hold the loaded object in the result */
    as: TFieldName;
    /** If true (default), uses INNER JOIN; if false, uses LEFT JOIN (result may be null) */
    required?: TRequired;
    /** Optional Knex query builder for the foreign table — auto-derived from foreignSchema's tableName if omitted */
    foreignQuery?: Knex.QueryBuilder | { toKnexQuery(): Knex.QueryBuilder };
    /** Foreign schema for type inference */
    foreignSchema: TForeignSchema;
    /** Optional post-load value transformers per foreign column */
    mappers?: Partial<
        Record<SchemaKeys<TForeignSchema>, ((value: any) => any) | string>
    >;
}

// ---------------------------------------------------------------------------
// JoinMany specification — collection of related objects (1:N / hasMany)
// ---------------------------------------------------------------------------
/**
 * Configure a nested eager collection with child-level ordering/paging independent of parent paging.
 */
export interface JoinManySpec<
    TLocalSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TForeignSchema extends ObjectSchemaBuilder<
        any,
        any,
        any,
        any,
        any,
        any,
        any
    >,
    TFieldName extends string = string
> {
    /** Column on the local (base) table used for the join (string key or property accessor) */
    localColumn: ColumnRef<TLocalSchema>;
    /** Column on the foreign table used for the join (string key or property accessor) */
    foreignColumn: ColumnRef<TForeignSchema>;
    /** Name of the field that will hold the loaded array in the result */
    as: TFieldName;
    /** Optional Knex query builder for the foreign table — auto-derived from foreignSchema's tableName if omitted */
    foreignQuery?: Knex.QueryBuilder | { toKnexQuery(): Knex.QueryBuilder };
    /** Foreign schema for type inference */
    foreignSchema: TForeignSchema;
    /** Maximum number of related items to load per parent row */
    limit?: number;
    /** Number of related items to skip per parent row */
    offset?: number;
    /** Column to order the related items by (required for deterministic limit/offset) */
    orderBy?: {
        column: ColumnRef<TForeignSchema>;
        direction?: 'asc' | 'desc';
    };
    /** Optional post-load value transformers per foreign column */
    mappers?: Partial<
        Record<SchemaKeys<TForeignSchema>, ((value: any) => any) | string>
    >;
}

// ---------------------------------------------------------------------------
// Result type computation — type-level "accumulation" as joins are chained
// ---------------------------------------------------------------------------

/** Adds a single joined object field to TBase */
export type WithJoinedOne<
    TBase,
    TFieldName extends string,
    TForeignSchema extends ObjectSchemaBuilder<
        any,
        any,
        any,
        any,
        any,
        any,
        any
    >,
    TRequired extends boolean
> = TBase & {
    [K in TFieldName]: TRequired extends true
        ? InferType<TForeignSchema>
        : InferType<TForeignSchema> | null;
};

/** Adds a joined collection field to TBase */
export type WithJoinedMany<
    TBase,
    TFieldName extends string,
    TForeignSchema extends ObjectSchemaBuilder<
        any,
        any,
        any,
        any,
        any,
        any,
        any
    >
> = TBase & {
    [K in TFieldName]: InferType<TForeignSchema>[];
};

// ---------------------------------------------------------------------------
// Internal validated spec (after runtime validation)
// ---------------------------------------------------------------------------
/**
 * Normalized one-object relation specification with resolved SQL names and an executable foreign query.
 */
export interface ValidatedJoinOneSpec {
    /**
     * Resolved SQL join column on the parent table.
     */
    localColumn: string;
    /**
     * Resolved SQL join column on the related table.
     */
    foreignColumn: string;
    /**
     * Result property receiving the nested related object.
     */
    as: string;
    /**
     * Whether unmatched parent rows are excluded by an inner join.
     */
    required: boolean;
    /**
     * Prepared Knex query describing eligible related rows.
     */
    foreignQuery: Knex.QueryBuilder;
    /**
     * Optional related-field conversions applied after SQL returns.
     */
    mappers?: Record<string, ((value: any) => any) | string>;
}

/**
 * Normalized collection relation specification consumed by the eager-loading compiler.
 */
export interface ValidatedJoinManySpec {
    /**
     * Resolved parent SQL column matched to each child group.
     */
    localColumn: string;
    /**
     * Resolved child SQL column used to group related rows.
     */
    foreignColumn: string;
    /**
     * Result property receiving the array of related rows.
     */
    as: string;
    /**
     * Prepared Knex query describing eligible children.
     */
    foreignQuery: Knex.QueryBuilder;
    /**
     * Maximum children per parent, or null for no child limit.
     */
    limit: number | null;
    /**
     * Children skipped per parent, or null for no offset.
     */
    offset: number | null;
    /**
     * Resolved child ordering, or null to leave child order unspecified.
     */
    orderBy: { column: string; direction: 'asc' | 'desc' } | null;
    /**
     * Optional child-field conversions applied after SQL returns.
     */
    mappers?: Record<string, ((value: any) => any) | string>;
}

/**
 * Discriminated normalized eager-relation specification used by row-mapping helpers.
 */
export type ValidatedSpec =
    | ({ type: 'one' } & ValidatedJoinOneSpec)
    | ({ type: 'many' } & ValidatedJoinManySpec);

// ---------------------------------------------------------------------------
// InsertType — all properties optional (DB may generate some, e.g. SERIAL id)
// ---------------------------------------------------------------------------
/**
 * Schema-shaped insert payload with optional properties so database-generated/defaulted values may be omitted.
 */
export type InsertType<
    T extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> = InferType<ReturnType<T['makeAllPropsOptional']>>;

// ---------------------------------------------------------------------------
// Database row helpers
// ---------------------------------------------------------------------------

type OptionalKeys<T> = {
    [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];

type RequiredKeys<T> = Exclude<keyof T, OptionalKeys<T>>;

/**
 * Normalize a schema-inferred property type to the value shape commonly
 * returned by database rows.
 *
 * Optional schema properties may be absent in payloads, but database rows use
 * `NULL` for persisted missing values.
 */
export type InferDatabaseValue<T> = undefined extends T
    ? Exclude<T, undefined> | null | undefined
    : T;

/**
 * Infer the object shape of a persisted database row from an object schema.
 *
 * This is useful for mapper code and raw-query helpers where `InferType<T>`
 * is too strict because optional schema properties can come back as `null`
 * from SQL.
 */
export type InferDatabaseRow<
    T extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> = {
    [K in RequiredKeys<InferType<T>>]: InferDatabaseValue<InferType<T>[K]>;
} & {
    [K in OptionalKeys<InferType<T>>]?: InferDatabaseValue<InferType<T>[K]>;
};

// ---------------------------------------------------------------------------
// Primary-key type helpers (driven by PRIMARY_KEY_BRAND / COMPOSITE_PRIMARY_KEY_BRAND)
// ---------------------------------------------------------------------------

import type {
    COMPOSITE_PRIMARY_KEY_BRAND,
    PRIMARY_KEY_BRAND
} from './extension.js';

/**
 * Detect whether a property schema is branded as a primary key (i.e. its
 * schema was created with `.primaryKey()`).
 *
 * @internal
 */
type IsPkBranded<TPropSchema> = TPropSchema extends {
    readonly [PRIMARY_KEY_BRAND]?: true;
}
    ? true
    : false;

/**
 * Extract the primary-key column descriptor for a schema.
 *
 * Returns:
 * - the literal property-key string for a single-column primary key
 *   (e.g. `'id'`),
 * - a tuple of property-key strings for a composite primary key
 *   (e.g. `['userId', 'roleId']`),
 * - or `never` if no primary key is declared.
 *
 * Composite primary keys are detected via the `COMPOSITE_PRIMARY_KEY_BRAND`
 * placed on the object schema by `.hasPrimaryKey([...] as const)`. Use
 * `as const` on the column tuple to preserve ordering at the type level.
 *
 * @public
 */
export type PrimaryKeyOf<
    S extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> = S extends {
    readonly [COMPOSITE_PRIMARY_KEY_BRAND]?: infer TCols;
}
    ? TCols extends readonly string[]
        ? TCols
        : never
    : {
          [K in keyof SchemaPropsForPk<S> & string]: IsPkBranded<
              SchemaPropsForPk<S>[K]
          > extends true
              ? K
              : never;
      }[keyof SchemaPropsForPk<S> & string];

/**
 * Extract the schema's property record for primary-key inference. Mirrors
 * `SchemaProps` from `entity.ts` but lives here to avoid a circular import.
 *
 * @internal
 */
type SchemaPropsForPk<T> =
    T extends ObjectSchemaBuilder<infer P, any, any, any, any, any, any>
        ? P
        : never;

/**
 * The runtime value type of a schema's primary key.
 *
 * - For a single-column PK, the inferred type of that property
 *   (e.g. `number`).
 * - For a composite PK, a tuple of inferred property types in declared
 *   order (e.g. `[number, number]`).
 * - `never` if no primary key is declared.
 *
 * @public
 */
export type PrimaryKeyValueOf<
    S extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> =
    PrimaryKeyOf<S> extends readonly (infer _Item extends string)[]
        ? PrimaryKeyOf<S> extends readonly string[]
            ? PkTupleValue<S, PrimaryKeyOf<S>>
            : never
        : PrimaryKeyOf<S> extends string
          ? InferType<S>[PrimaryKeyOf<S> & keyof InferType<S>]
          : never;

/**
 * Map a tuple of PK property-key names to their inferred value types.
 *
 * @internal
 */
type PkTupleValue<
    S extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TKeys extends readonly string[]
> = {
    [I in keyof TKeys]: TKeys[I] extends keyof InferType<S>
        ? InferType<S>[TKeys[I]]
        : unknown;
};

// ---------------------------------------------------------------------------
// DTO selector — `.select(t => ({ alias: t.col, … }))`
// ---------------------------------------------------------------------------

/**
 * Extract the property schema captured inside a `PropertyDescriptor`.
 *
 * @internal
 */
type DescriptorPropertySchema<T> =
    T extends PropertyDescriptor<any, infer S, any, any> ? S : never;

/**
 * Result row type produced by a {@link SelectProjection} selector.
 *
 * Each entry's value is the {@link InferType} of the property schema the
 * descriptor points at, so `.select(t => ({ id: t.id, n: t.title }))`
 * yields `{ id: number; n: string }`.
 *
 * @public
 */
export type SelectProjection<R extends Record<string, unknown>> = {
    [K in keyof R]: R[K] extends AggregateExpression<infer T>
        ? T
        : InferType<DescriptorPropertySchema<R[K]>>;
};

/**
 * Callback shape accepted by the projection overload of `select`. The
 * callback receives the schema's property-descriptor tree and returns an
 * `{ alias: descriptor }` record.
 *
 * @public
 */
export type SelectSelector<
    T extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> = (
    tree: PropertyDescriptorTree<SchemaBase<T>, SchemaBase<T>>
) => Record<
    string,
    PropertyDescriptor<any, any, any> | AggregateExpression<any>
>;

// ---------------------------------------------------------------------------
// Pagination result types
// ---------------------------------------------------------------------------

/** Result of offset-based pagination via {@link SchemaQueryBuilder.paginate}. */
export interface PaginationResult<T> {
    /** The rows for the current page. */
    data: T[];
    /** Total number of matching rows across all pages. */
    total: number;
    /** Current page number (1-based). */
    page: number;
    /** Number of rows per page. */
    pageSize: number;
    /** Total number of pages. */
    totalPages: number;
    /** Whether a next page exists. */
    hasNextPage: boolean;
    /** Whether a previous page exists. */
    hasPreviousPage: boolean;
}

/** Result of cursor-based pagination via {@link SchemaQueryBuilder.paginateAfter}. */
export interface CursorPaginationResult<T> {
    /** The rows for the current page. */
    data: T[];
    /** Cursor value for the next page, or `null` if no more rows. */
    nextCursor: string | null;
    /** Whether more rows exist after this page. */
    hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Polymorphic / variant types
// ---------------------------------------------------------------------------

/** Storage strategy for a polymorphic variant. */
export type VariantStorageType = 'cti' | 'sti';

/** @internal Resolved form of a variant relation stored on {@link ResolvedVariantSpec}. */
export interface ResolvedVariantRelationSpec {
    /**
     * Physical column name reported by PostgreSQL.
     */
    name: string;
    type: 'hasMany' | 'hasOne' | 'belongsTo' | 'belongsToMany';
    schema: any;
    /** Resolved FK *column* name on the variant or foreign table. */
    foreignKey?: string;
    through?: { table: string; localKey: string; foreignKey: string };
}

/** @internal Resolved, normalised variant spec stored in schema extensions. */
export interface ResolvedVariantSpec {
    storage: VariantStorageType;
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>;
    /** CTI: FK column name on the variant table. */
    foreignKey?: string;
    /** CTI: variant table name (from `schema.hasTableName()`). */
    tableName?: string;
    allowOrphan: boolean;
    enforceCheck: boolean;
    /** Variant-scoped relations (resolved), populated by `.withVariants()`. */
    relations: ResolvedVariantRelationSpec[];
}

/** @internal Full variant config stored in the schema extension `'variants'`. */
export interface ResolvedVariantConfig {
    /** Property key on the base schema that is the discriminator. */
    discriminatorKey: string;
    /** SQL column name corresponding to `discriminatorKey`. Filled by query builder. */
    discriminatorColumn: string;
    /** Map from discriminator value → resolved variant spec. */
    variants: Record<string, ResolvedVariantSpec>;
}

/** @internal Pending filter registered via `.whereVariant()`. */
export interface VariantWhereFilter {
    /** The discriminator value this filter applies to (e.g. `'image'`). */
    key: string;
    /** SQL column expression on the variant alias (e.g. `__v_image.width`). */
    qualifiedColumn: string;
    /** SQL comparison operator (validated). */
    op: string;
    value: any;
}

// ---------------------------------------------------------------------------
// Relation specification (stored in schema extensions)
// ---------------------------------------------------------------------------

/** @internal Relation metadata stored via `.hasMany()`, `.belongsTo()`, etc. */
export interface RelationSpec {
    type: 'hasMany' | 'hasOne' | 'belongsTo' | 'belongsToMany';
    name: string;
    schema: any;
    foreignKey?: any;
    through?: { table: string; localKey: string; foreignKey: string };
}

// ---------------------------------------------------------------------------
// Database introspection types (for migration generation)
// ---------------------------------------------------------------------------

/** Column information read from the database. */
export interface DatabaseColumnInfo {
    name: string;
    /**
     * Database type name used for schema comparison.
     */
    type: string;
    /**
     * Whether SQL NULL is accepted by this column.
     */
    nullable: boolean;
    /**
     * Database default expression, or null when no default is declared.
     */
    defaultValue: string | null;
    /**
     * Declared character limit, or null when the type has no such limit.
     */
    maxLength: number | null;
    /**
     * Declared numeric precision, or null when unavailable/not applicable.
     */
    numericPrecision: number | null;
}

/** Index information read from the database. */
export interface DatabaseIndexInfo {
    /**
     * Physical database index name.
     */
    name: string;
    /**
     * Indexed column names in database-reported order.
     */
    columns: string[];
    /**
     * Whether this index enforces uniqueness.
     */
    unique: boolean;
    /**
     * Database-provided SQL definition of the index.
     */
    definition: string;
}

/** Foreign key information read from the database. */
export interface DatabaseForeignKeyInfo {
    /**
     * Physical foreign-key constraint name.
     */
    constraintName: string;
    /**
     * Referencing SQL column on the inspected table.
     */
    columnName: string;
    /**
     * Referenced table name.
     */
    foreignTable: string;
    /**
     * Referenced SQL column name.
     */
    foreignColumn: string;
    /**
     * Database ON DELETE action, such as CASCADE or NO ACTION.
     */
    deleteRule: string;
    /**
     * Database ON UPDATE action for referenced-key changes.
     */
    updateRule: string;
}

/** Check constraint information read from the database. */
export interface DatabaseCheckInfo {
    /**
     * Physical CHECK constraint name.
     */
    name: string;
    /**
     * Database-provided CHECK expression/definition.
     */
    definition: string;
}

/** Full database table state from introspection. */
export interface DatabaseTableState {
    /**
     * Column metadata keyed by physical SQL column name.
     */
    columns: Record<string, DatabaseColumnInfo>;
    /**
     * Indexes discovered for the table.
     */
    indexes: DatabaseIndexInfo[];
    /**
     * Foreign-key constraints discovered for the table.
     */
    foreignKeys: DatabaseForeignKeyInfo[];
    /**
     * CHECK constraints discovered for the table.
     */
    checks: DatabaseCheckInfo[];
}

/**
 * Serialized snapshot of all entity schemas at a given point in time.
 *
 * Stored in `<migrations.directory>/snapshot.json` and committed to version
 * control. `migrate generate` diffs the current code against this snapshot
 * (instead of a live database) to produce migration files, so no DB
 * connection is required.
 *
 * Each entry in `tables` mirrors the shape that `introspectDatabase` would
 * return — allowing `diffSchema` to be reused unchanged.
 *
 * @public
 */
export interface SchemaSnapshot {
    /**
     * Snapshot format version; currently 1.
     */
    version: 1;
    /** Map of table name → database state derived from entity schemas. */
    tables: Record<string, DatabaseTableState>;
}

// ---------------------------------------------------------------------------
// Migration diff types
// ---------------------------------------------------------------------------

/** A column to add in a migration. */
export interface AddColumnDiff {
    /**
     * Physical SQL name of the new column.
     */
    name: string;
    /**
     * SQL type to create, including any declared length/precision.
     */
    type: string;
    /**
     * Whether the new column permits SQL NULL.
     */
    nullable: boolean;
    /**
     * Optional default value or expression metadata for the new column.
     */
    defaultValue?: any;
    /**
     * Optional referenced table/column for a new foreign key.
     */
    references?: { table: string; column: string };
    /**
     * Optional ON DELETE action for the reference.
     */
    onDelete?: string;
    /**
     * Optional ON UPDATE action for the reference.
     */
    onUpdate?: string;
}

/** Changes to apply to an existing column. */
export interface AlterColumnDiff {
    /**
     * Physical SQL name of the column to alter.
     */
    name: string;
    /**
     * Changed attributes with their previous and desired values.
     */
    changes: Record<string, { from: any; to: any }>;
}

/** An index to add in a migration. */
export interface AddIndexDiff {
    /**
     * Physical column names forming the index, in order.
     */
    columns: string[];
    /**
     * Optional explicit index name; otherwise migration generation chooses one.
     */
    name?: string;
    /**
     * Whether the new index must enforce uniqueness.
     */
    unique?: boolean;
}

/** A foreign key to add in a migration. */
export interface AddForeignKeyDiff {
    /**
     * Referencing SQL column on the table being altered.
     */
    column: string;
    /**
     * Referenced table name.
     */
    foreignTable: string;
    /**
     * Referenced SQL column name.
     */
    foreignColumn: string;
    /**
     * Optional ON DELETE action.
     */
    onDelete?: string;
    /**
     * Optional ON UPDATE action.
     */
    onUpdate?: string;
}

/** Schema diff result between the code-first model and the live database. */
export interface MigrationDiff {
    /**
     * New column definitions to create.
     */
    addColumns: AddColumnDiff[];
    /**
     * Physical column names to remove; reviewing these avoids unintended data loss.
     */
    dropColumns: string[];
    /**
     * Existing columns whose attributes must change.
     */
    alterColumns: AlterColumnDiff[];
    /**
     * New indexes to create.
     */
    addIndexes: AddIndexDiff[];
    /**
     * Physical index names to remove.
     */
    dropIndexes: string[];
    /**
     * New foreign-key constraints to create.
     */
    addForeignKeys: AddForeignKeyDiff[];
    /**
     * Physical foreign-key constraint names to remove.
     */
    dropForeignKeys: string[];
}
