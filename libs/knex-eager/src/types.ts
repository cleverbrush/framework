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
export type ColumnRef<
    T extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> =
    | SchemaKeys<T>
    | ((tree: PropertyDescriptorTree<T, T>) => PropertyDescriptor<T, any, any>);

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
    /** Optional Knex query builder for the foreign table (with filters, column selection, etc.) */
    foreignQuery: Knex.QueryBuilder;
    /** Foreign schema for type inference */
    foreignSchema: TForeignSchema;
    /** Optional post-load value transformers per foreign column */
    mappers?: Partial<Record<SchemaKeys<TForeignSchema>, (value: any) => any>>;
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
    /** Optional Knex query builder for the foreign table (with filters, column selection, etc.) */
    foreignQuery: Knex.QueryBuilder;
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
    mappers?: Partial<Record<SchemaKeys<TForeignSchema>, (value: any) => any>>;
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
    mappers?: Record<string, (value: any) => any>;
}

export interface ValidatedJoinManySpec {
    localColumn: string;
    foreignColumn: string;
    as: string;
    foreignQuery: Knex.QueryBuilder;
    limit: number | null;
    offset: number | null;
    orderBy: { column: string; direction: 'asc' | 'desc' } | null;
    mappers?: Record<string, (value: any) => any>;
}

export type ValidatedSpec =
    | ({ type: 'one' } & ValidatedJoinOneSpec)
    | ({ type: 'many' } & ValidatedJoinManySpec);
