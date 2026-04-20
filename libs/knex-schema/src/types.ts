// @cleverbrush/knex-schema — Type definitions

import type {
    InferType,
    ObjectSchemaBuilder,
    PropertyDescriptor,
    PropertyDescriptorTree
} from '@cleverbrush/schema';
import type { Knex } from 'knex';

// ---------------------------------------------------------------------------
// Utility: extract string keys from an ObjectSchemaBuilder's inferred type
// ---------------------------------------------------------------------------
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
export interface ValidatedJoinOneSpec {
    localColumn: string;
    foreignColumn: string;
    as: string;
    required: boolean;
    foreignQuery: Knex.QueryBuilder;
    mappers?: Record<string, ((value: any) => any) | string>;
}

export interface ValidatedJoinManySpec {
    localColumn: string;
    foreignColumn: string;
    as: string;
    foreignQuery: Knex.QueryBuilder;
    limit: number | null;
    offset: number | null;
    orderBy: { column: string; direction: 'asc' | 'desc' } | null;
    mappers?: Record<string, ((value: any) => any) | string>;
}

export type ValidatedSpec =
    | ({ type: 'one' } & ValidatedJoinOneSpec)
    | ({ type: 'many' } & ValidatedJoinManySpec);

// ---------------------------------------------------------------------------
// InsertType — all properties optional (DB may generate some, e.g. SERIAL id)
// ---------------------------------------------------------------------------
export type InsertType<
    T extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> = InferType<ReturnType<T['makeAllPropsOptional']>>;

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
    type: string;
    nullable: boolean;
    defaultValue: string | null;
    maxLength: number | null;
    numericPrecision: number | null;
}

/** Index information read from the database. */
export interface DatabaseIndexInfo {
    name: string;
    columns: string[];
    unique: boolean;
    definition: string;
}

/** Foreign key information read from the database. */
export interface DatabaseForeignKeyInfo {
    constraintName: string;
    columnName: string;
    foreignTable: string;
    foreignColumn: string;
    deleteRule: string;
    updateRule: string;
}

/** Check constraint information read from the database. */
export interface DatabaseCheckInfo {
    name: string;
    definition: string;
}

/** Full database table state from introspection. */
export interface DatabaseTableState {
    columns: Record<string, DatabaseColumnInfo>;
    indexes: DatabaseIndexInfo[];
    foreignKeys: DatabaseForeignKeyInfo[];
    checks: DatabaseCheckInfo[];
}

// ---------------------------------------------------------------------------
// Migration diff types
// ---------------------------------------------------------------------------

/** A column to add in a migration. */
export interface AddColumnDiff {
    name: string;
    type: string;
    nullable: boolean;
    defaultValue?: any;
    references?: { table: string; column: string };
    onDelete?: string;
    onUpdate?: string;
}

/** Changes to apply to an existing column. */
export interface AlterColumnDiff {
    name: string;
    changes: Record<string, { from: any; to: any }>;
}

/** An index to add in a migration. */
export interface AddIndexDiff {
    columns: string[];
    name?: string;
    unique?: boolean;
}

/** A foreign key to add in a migration. */
export interface AddForeignKeyDiff {
    column: string;
    foreignTable: string;
    foreignColumn: string;
    onDelete?: string;
    onUpdate?: string;
}

/** Schema diff result between the code-first model and the live database. */
export interface MigrationDiff {
    addColumns: AddColumnDiff[];
    dropColumns: string[];
    alterColumns: AlterColumnDiff[];
    addIndexes: AddIndexDiff[];
    dropIndexes: string[];
    addForeignKeys: AddForeignKeyDiff[];
    dropForeignKeys: string[];
}
