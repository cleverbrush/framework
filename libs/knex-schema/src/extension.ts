// @cleverbrush/knex-schema — Schema extension: hasColumnName / hasTableName

import type {
    AnySchemaBuilder,
    ArraySchemaBuilder,
    BooleanSchemaBuilder,
    DateSchemaBuilder,
    FunctionSchemaBuilder,
    GenericSchemaBuilder,
    InferType,
    NumberSchemaBuilder,
    ObjectSchemaBuilder,
    PropertyDescriptor,
    PropertyDescriptorTree,
    SchemaBuilder,
    StringSchemaBuilder,
    UnionSchemaBuilder
} from '@cleverbrush/schema';
import {
    arrayExtensions,
    defineExtension,
    EXTRA_TYPE_BRAND,
    METHOD_LITERAL_BRAND,
    numberExtensions,
    ObjectSchemaBuilder as ObjectSchemaBuilderClass,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR,
    stringExtensions,
    withExtensions
} from '@cleverbrush/schema';
import { buildColumnMap } from './columns.js';
import type {
    ResolvedVariantConfig,
    ResolvedVariantRelationSpec,
    ResolvedVariantSpec,
    VariantRelationSpec,
    VariantSpecInput,
    VariantStorageType
} from './types.js';

// Re-export these symbols so consumer packages can name them when generating
// TypeScript declarations for schemas built with @cleverbrush/knex-schema.
// Without these exports, tsc emits TS4023 ("cannot be named") errors for any
// file that exports a variable whose inferred type traverses FixedMethods.
export { EXTRA_TYPE_BRAND, METHOD_LITERAL_BRAND } from '@cleverbrush/schema';

// ---------------------------------------------------------------------------
// Primary-key type brands
// ---------------------------------------------------------------------------

/**
 * Phantom-type brand placed on a column schema by `.primaryKey()`.
 * Carried on the property schema's type so that {@link PrimaryKeyOf} can
 * locate primary-key columns at the type level.
 *
 * @public
 */
export const PRIMARY_KEY_BRAND: unique symbol = Symbol.for(
    '@cleverbrush/knex-schema:primaryKey'
);

/**
 * Phantom-type brand placed on an object schema by `.hasPrimaryKey([cols])`
 * to record the composite primary-key column tuple at the type level.
 *
 * @public
 */
export const COMPOSITE_PRIMARY_KEY_BRAND: unique symbol = Symbol.for(
    '@cleverbrush/knex-schema:compositePrimaryKey'
);

// ---------------------------------------------------------------------------
// Polymorphic type brand
// ---------------------------------------------------------------------------

/** @internal Helper to resolve a variant's `relations` map into normalised specs. */
function resolveVariantRelations(
    variantKey: string,
    variantSchema: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    relations: Record<string, VariantRelationSpec>
): ResolvedVariantRelationSpec[] {
    const { propToCol } = buildColumnMap(variantSchema);
    const result: ResolvedVariantRelationSpec[] = [];
    const varTree = ObjectSchemaBuilderClass.getPropertiesFor(
        variantSchema as any
    );

    for (const [relName, relSpec] of Object.entries(relations)) {
        let resolvedFk: string | undefined;

        if (relSpec.foreignKey) {
            const descriptor = (relSpec.foreignKey as Function)(varTree as any);
            const inner = (descriptor as any)?.[
                SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
            ];
            if (!inner?.propertyName) {
                throw new Error(
                    `withVariants: variant "${variantKey}" relation "${relName}" foreignKey accessor must return a top-level property descriptor`
                );
            }
            const fkPropKey: string = inner.propertyName;
            resolvedFk = propToCol.get(fkPropKey) ?? fkPropKey;
        }

        result.push({
            name: relName,
            type: relSpec.type,
            schema: relSpec.schema,
            foreignKey: resolvedFk,
            through: relSpec.through
        });
    }
    return result;
}

/**
 * Phantom-type brand placed on an `ObjectSchemaBuilder` by `.withVariants()`.
 * The brand carries the discriminated-union result type so that
 * `query(db, polymorphicSchema)` automatically infers the correct union type
 * without any extra type annotation.
 *
 * @public
 */
export const POLYMORPHIC_TYPE_BRAND: unique symbol = Symbol.for(
    '@cleverbrush/knex-schema:polymorphicType'
);

// ---------------------------------------------------------------------------
// VariantUnion — infers the discriminated-union result type
// ---------------------------------------------------------------------------

/**
 * Given a base `ObjectSchemaBuilder`, a discriminator property key, and a
 * map of variant specs, computes the discriminated union of all variant
 * row types.
 *
 * For each variant key `K`:
 *   - start from `InferType<TBase>` (all base fields)
 *   - override the discriminator field with the literal `K`
 *   - merge in `InferType<TVariantMap[K]['schema']>` (extra fields)
 *
 * @internal
 */
type VariantUnion<
    TBase extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TDiscKey extends string,
    TVariantMap extends Record<
        string,
        { schema: ObjectSchemaBuilder<any, any, any, any, any, any, any> }
    >
> = {
    [K in keyof TVariantMap & string]: Omit<InferType<TBase>, TDiscKey> &
        Record<TDiscKey, K> &
        InferType<TVariantMap[K]['schema']>;
}[keyof TVariantMap & string];

// ---------------------------------------------------------------------------
// Shared implementations
// ---------------------------------------------------------------------------

/**
 * Stores the SQL column name for a schema property using the schema extension
 * system. Consumed by {@link getColumnName} and the query builder's column
 * resolution logic.
 */
function hasColumnName(this: SchemaBuilder<any, any, any>, name: string) {
    return this.withExtension('columnName', name);
}

/**
 * Stores the SQL table name for an `ObjectSchemaBuilder` using the schema
 * extension system. Required for {@link query} to build queries — throws at
 * query creation time if not set.
 */
function hasTableName(
    this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    name: string
) {
    return this.withExtension('tableName', name);
}

// ---------------------------------------------------------------------------
// Extension definition
// ---------------------------------------------------------------------------

/**
 * Schema extension that adds database-mapping metadata to schema builders.
 *
 * Import the typed factory functions (`string`, `number`, `object`, etc.) from
 * this package instead of from `@cleverbrush/schema` to gain access to the
 * `.hasColumnName()` and `.hasTableName()` methods.
 *
 * @example
 * ```ts
 * import { object, string, number } from '@cleverbrush/knex-schema';
 *
 * const UserSchema = object({
 *     id:         number(),
 *     firstName:  string().hasColumnName('first_name'),
 *     lastName:   string().hasColumnName('last_name'),
 *     createdAt:  date().hasColumnName('created_at'),
 * }).hasTableName('users');
 * ```
 */
export const dbExtension = defineExtension({
    string: {
        /**
         * Override the SQL column name for this property.
         *
         * By default the property key is used as the column name. Call
         * `.hasColumnName('sql_col')` when the database column differs from the
         * schema property name (e.g. camelCase property → snake_case column).
         *
         * @param name - The SQL column name.
         */
        hasColumnName(
            this: StringSchemaBuilder<any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    number: {
        /**
         * Override the SQL column name for this property.
         * @param name - The SQL column name.
         */
        hasColumnName(
            this: NumberSchemaBuilder<any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    boolean: {
        /**
         * Override the SQL column name for this property.
         * @param name - The SQL column name.
         */
        hasColumnName(
            this: BooleanSchemaBuilder<any, any, any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    date: {
        /**
         * Override the SQL column name for this property.
         * @param name - The SQL column name.
         */
        hasColumnName(
            this: DateSchemaBuilder<any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    any: {
        /**
         * Override the SQL column name for this property.
         * @param name - The SQL column name.
         */
        hasColumnName(
            this: AnySchemaBuilder<any, any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    func: {
        /**
         * Override the SQL column name for this property.
         * @param name - The SQL column name.
         */
        hasColumnName(
            this: FunctionSchemaBuilder<any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    array: {
        /**
         * Override the SQL column name for this property.
         * @param name - The SQL column name.
         */
        hasColumnName(
            this: ArraySchemaBuilder<any, any, any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    union: {
        /**
         * Override the SQL column name for this property.
         * @param name - The SQL column name.
         */
        hasColumnName(
            this: UnionSchemaBuilder<any, any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    generic: {
        /**
         * Override the SQL column name for this property.
         * @param name - The SQL column name.
         */
        hasColumnName(
            this: GenericSchemaBuilder<any, any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    object: {
        /**
         * Set the SQL table name for this object schema.
         *
         * Required before creating a {@link query} builder — throws at
         * query creation time when not set.
         *
         * @param name - The SQL table name (e.g. `'users'`).
         */
        hasTableName(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            name: string
        ) {
            return hasTableName.call(this, name);
        }
    }
});

// ---------------------------------------------------------------------------
// DDL + ORM extension
// ---------------------------------------------------------------------------

type FKAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';

/**
 * DDL and ORM extension that adds database DDL metadata, relationship
 * definitions, and ORM conveniences to schema builders.
 *
 * Column-level methods: `.primaryKey()`, `.references()`, `.unique()`,
 * `.index()`, `.defaultTo()`, `.columnType()`, `.check()`, `.defaultToRaw()`.
 *
 * Object-level methods: `.hasIndex()`, `.hasUnique()`, `.hasCheck()`,
 * `.hasPrimaryKey()`, `.hasRawColumn()`, `.hasRawIndex()`, `.hasMany()`,
 * `.hasOne()`, `.belongsTo()`, `.belongsToMany()`, `.hasTimestamps()`,
 * `.softDelete()`, `.scope()`, `.defaultScope()`, `.beforeInsert()`,
 * `.afterInsert()`, `.beforeUpdate()`, `.beforeDelete()`.
 */
export const ddlExtension = defineExtension({
    number: {
        /** Mark this column as a primary key.
         * @param opts - Options. `autoIncrement` defaults to `true`.
         */
        primaryKey(
            this: NumberSchemaBuilder<any, any, any, any, any>,
            opts?: { autoIncrement?: boolean }
        ): typeof this & {
            readonly [PRIMARY_KEY_BRAND]?: true;
        } {
            return this.withExtension('primaryKey', {
                autoIncrement: opts?.autoIncrement ?? true
            }) as typeof this & {
                readonly [PRIMARY_KEY_BRAND]?: true;
            };
        },
        /** Add a foreign key reference to another table.
         * @param table - The referenced table name.
         * @param column - The referenced column (defaults to `'id'`).
         */
        references(
            this: NumberSchemaBuilder<any, any, any, any, any>,
            table: string,
            column: string = 'id'
        ) {
            return this.withExtension('references', { table, column });
        },
        /** Set the ON DELETE action for a foreign key. */
        onDelete(
            this: NumberSchemaBuilder<any, any, any, any, any>,
            action: FKAction
        ) {
            return this.withExtension('onDelete', action);
        },
        /** Set the ON UPDATE action for a foreign key. */
        onUpdate(
            this: NumberSchemaBuilder<any, any, any, any, any>,
            action: FKAction
        ) {
            return this.withExtension('onUpdate', action);
        },
        /** Set a default value for this column. */
        defaultTo(
            this: NumberSchemaBuilder<any, any, any, any, any>,
            value: number | 'auto_increment'
        ) {
            return this.withExtension('defaultTo', value);
        },
        /** Add an index on this column.
         * @param name - Optional index name.
         */
        index(
            this: NumberSchemaBuilder<any, any, any, any, any>,
            name?: string
        ) {
            return this.withExtension('index', name ?? true);
        },
        /** Add a unique constraint on this column.
         * @param name - Optional constraint name.
         */
        unique(
            this: NumberSchemaBuilder<any, any, any, any, any>,
            name?: string
        ) {
            return this.withExtension('unique', name ?? true);
        },
        /** Override the SQL column type (e.g. `'bigint'`, `'smallint'`). */
        columnType(
            this: NumberSchemaBuilder<any, any, any, any, any>,
            type: string
        ) {
            return this.withExtension('columnType', type);
        },
        /** Shorthand for `.columnType('bigint')`. */
        bigint(this: NumberSchemaBuilder<any, any, any, any, any>) {
            return this.withExtension('columnType', 'bigint');
        },
        /** Shorthand for `.columnType('smallint')`. */
        smallint(this: NumberSchemaBuilder<any, any, any, any, any>) {
            return this.withExtension('columnType', 'smallint');
        },
        /** Shorthand for `.columnType('decimal(p,s)')` — exact numeric.
         * @param precision - Total digits.
         * @param scale     - Digits after decimal point.
         */
        decimal(
            this: NumberSchemaBuilder<any, any, any, any, any>,
            precision: number,
            scale: number
        ) {
            return this.withExtension(
                'columnType',
                `decimal(${precision},${scale})`
            );
        },
        /** Set a raw SQL default expression.
         * @param expression - Raw SQL expression (e.g. `"nextval('my_seq')"`).
         */
        defaultToRaw(
            this: NumberSchemaBuilder<any, any, any, any, any>,
            expression: string
        ) {
            return this.withExtension('defaultTo', { raw: expression });
        }
    },
    string: {
        /** Mark this column as a primary key (non-auto-increment). */
        primaryKey(
            this: StringSchemaBuilder<any, any, any, any, any>
        ): typeof this & {
            readonly [PRIMARY_KEY_BRAND]?: true;
        } {
            return this.withExtension('primaryKey', {
                autoIncrement: false
            }) as typeof this & {
                readonly [PRIMARY_KEY_BRAND]?: true;
            };
        },
        /** Override the SQL column type (e.g. `'text'`, `'uuid'`, `'jsonb'`, `'citext'`). */
        columnType(
            this: StringSchemaBuilder<any, any, any, any, any>,
            type: string
        ) {
            return this.withExtension('columnType', type);
        },
        /** Shorthand for `.columnType('text')` — unlimited-length text. */
        text(this: StringSchemaBuilder<any, any, any, any, any>) {
            return this.withExtension('columnType', 'text');
        },
        /** Shorthand for `.columnType('uuid')` — UUID column type.
         * Note: this sets the *storage type* — for UUID format validation use
         * the schema-level `.uuid()` validator instead.
         */
        asUuid(this: StringSchemaBuilder<any, any, any, any, any>) {
            return this.withExtension('columnType', 'uuid');
        },
        /** Shorthand for `.columnType('citext')` — case-insensitive text (Postgres). */
        citext(this: StringSchemaBuilder<any, any, any, any, any>) {
            return this.withExtension('columnType', 'citext');
        },
        /** Shorthand for `.columnType('jsonb')` — binary JSON (Postgres). */
        jsonb(this: StringSchemaBuilder<any, any, any, any, any>) {
            return this.withExtension('columnType', 'jsonb');
        },
        /** Shorthand for `.columnType('tsvector')` — full-text search vector (Postgres). */
        tsvector(this: StringSchemaBuilder<any, any, any, any, any>) {
            return this.withExtension('columnType', 'tsvector');
        },
        /** Add a foreign key reference to another table. */
        references(
            this: StringSchemaBuilder<any, any, any, any, any>,
            table: string,
            column: string = 'id'
        ) {
            return this.withExtension('references', { table, column });
        },
        /** Set the ON DELETE action for a foreign key. */
        onDelete(
            this: StringSchemaBuilder<any, any, any, any, any>,
            action: FKAction
        ) {
            return this.withExtension('onDelete', action);
        },
        /** Set the ON UPDATE action for a foreign key. */
        onUpdate(
            this: StringSchemaBuilder<any, any, any, any, any>,
            action: FKAction
        ) {
            return this.withExtension('onUpdate', action);
        },
        /** Add a unique constraint on this column. */
        unique(
            this: StringSchemaBuilder<any, any, any, any, any>,
            name?: string
        ) {
            return this.withExtension('unique', name ?? true);
        },
        /** Add an index on this column. */
        index(
            this: StringSchemaBuilder<any, any, any, any, any>,
            name?: string
        ) {
            return this.withExtension('index', name ?? true);
        },
        /** Set a default value for this column. */
        defaultTo(
            this: StringSchemaBuilder<any, any, any, any, any>,
            value: string
        ) {
            return this.withExtension('defaultTo', value);
        },
        /** Add a CHECK constraint with raw SQL.
         * @param sql - SQL expression for the check (e.g. `"role IN ('user','admin')"`).
         */
        check(this: StringSchemaBuilder<any, any, any, any, any>, sql: string) {
            return this.withExtension('check', sql);
        },
        /** Set a raw SQL default expression. */
        defaultToRaw(
            this: StringSchemaBuilder<any, any, any, any, any>,
            expression: string
        ) {
            return this.withExtension('defaultTo', { raw: expression });
        }
    },
    boolean: {
        /** Set a default value for this column. */
        defaultTo(
            this: BooleanSchemaBuilder<any, any, any, any, any, any, any>,
            value: boolean
        ) {
            return this.withExtension('defaultTo', value);
        },
        /** Override the SQL column type (e.g. `'smallint'`, `'integer'`). */
        columnType(
            this: BooleanSchemaBuilder<any, any, any, any, any, any, any>,
            type: string
        ) {
            return this.withExtension('columnType', type);
        },
        /** Add an index on this column. */
        index(
            this: BooleanSchemaBuilder<any, any, any, any, any, any, any>,
            name?: string
        ) {
            return this.withExtension('index', name ?? true);
        },
        /** Add a unique constraint on this column. */
        unique(
            this: BooleanSchemaBuilder<any, any, any, any, any, any, any>,
            name?: string
        ) {
            return this.withExtension('unique', name ?? true);
        }
    },
    date: {
        /** Set a default value (`'now'` for current timestamp). */
        defaultTo(
            this: DateSchemaBuilder<any, any, any, any, any>,
            value: 'now'
        ) {
            return this.withExtension('defaultTo', value);
        },
        /** Override the SQL column type
         * (e.g. `'timestamptz'`, `'date'`, `'time'`).
         */
        columnType(
            this: DateSchemaBuilder<any, any, any, any, any>,
            type: string
        ) {
            return this.withExtension('columnType', type);
        },
        /** Add an index on this column. */
        index(this: DateSchemaBuilder<any, any, any, any, any>, name?: string) {
            return this.withExtension('index', name ?? true);
        },
        /** Set a raw SQL default expression. */
        defaultToRaw(
            this: DateSchemaBuilder<any, any, any, any, any>,
            expression: string
        ) {
            return this.withExtension('defaultTo', { raw: expression });
        },
        /** Shorthand for `.columnType('timestamptz')`. */
        timestamptz(this: DateSchemaBuilder<any, any, any, any, any>) {
            return this.withExtension('columnType', 'timestamptz');
        },
        /** Shorthand for `.columnType('date')` (date-only, no time). */
        dateOnly(this: DateSchemaBuilder<any, any, any, any, any>) {
            return this.withExtension('columnType', 'date');
        }
    },
    object: {
        /** Override the SQL column type for an object property stored inline.
         * Object-typed properties default to `jsonb` when used as columns in
         * a parent schema's table.
         */
        columnType(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            type: string
        ) {
            return this.withExtension('columnType', type);
        },
        /** Shorthand for `.columnType('jsonb')` — store this nested object as
         * a `jsonb` column (Postgres). Nested objects already default to
         * `jsonb` in DDL; calling `.jsonb()` makes the intent explicit.
         */
        jsonb(this: ObjectSchemaBuilder<any, any, any, any, any, any, any>) {
            return this.withExtension('columnType', 'jsonb');
        },
        /** Shorthand for `.columnType('json')` — store this nested object as
         * a plain `json` column (Postgres / MySQL).
         */
        json(this: ObjectSchemaBuilder<any, any, any, any, any, any, any>) {
            return this.withExtension('columnType', 'json');
        },
        /** Add a composite index on multiple columns.
         * @param columns - Column names to index.
         * @param opts - Optional index name and unique flag.
         */
        hasIndex(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            columns: string[],
            opts?: { name?: string; unique?: boolean }
        ) {
            const existing = (this.getExtension('indexes') as any[]) ?? [];
            return this.withExtension('indexes', [
                ...existing,
                { columns, ...opts }
            ]);
        },
        /** Add a composite unique constraint.
         * @param columns - Column names.
         * @param name - Optional constraint name.
         */
        hasUnique(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            columns: string[],
            name?: string
        ) {
            const existing = (this.getExtension('uniques') as any[]) ?? [];
            return this.withExtension('uniques', [
                ...existing,
                { columns, name }
            ]);
        },
        /** Add a table-level CHECK constraint.
         * @param sql - Raw SQL expression for the check.
         */
        hasCheck(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            sql: string
        ) {
            const existing = (this.getExtension('checks') as any[]) ?? [];
            return this.withExtension('checks', [...existing, sql]);
        },
        /** Set a composite primary key.
         * @param columns - Column names (or property keys) forming the primary key,
         *   in declaration order. Use `as const` to preserve ordering at the type level.
         */
        hasPrimaryKey<const TCols extends readonly string[]>(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            columns: TCols
        ): typeof this & {
            readonly [COMPOSITE_PRIMARY_KEY_BRAND]?: TCols;
        } {
            return this.withExtension(
                'compositePrimaryKey',
                columns as readonly string[]
            ) as typeof this & {
                readonly [COMPOSITE_PRIMARY_KEY_BRAND]?: TCols;
            };
        },
        /** Add a raw SQL column definition not backed by a schema property.
         * @param name - Column name.
         * @param definition - SQL type and constraints (e.g. `"tsvector GENERATED ALWAYS AS (...) STORED"`).
         */
        hasRawColumn(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            name: string,
            definition: string
        ) {
            const existing = (this.getExtension('rawColumns') as any[]) ?? [];
            return this.withExtension('rawColumns', [
                ...existing,
                { name, definition }
            ]);
        },
        /** Add a raw SQL index statement executed after table creation.
         * @param sql - Full `CREATE INDEX` SQL statement.
         */
        hasRawIndex(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            sql: string
        ) {
            const existing = (this.getExtension('rawIndexes') as any[]) ?? [];
            return this.withExtension('rawIndexes', [...existing, sql]);
        },
        /** Define a one-to-many relationship.
         * @param name - Relation name used with `include()`.
         * @param opts - `{ schema, foreignKey }` — `foreignKey` is a ColumnRef on the foreign schema.
         */
        hasMany(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            name: string,
            opts: { schema: any; foreignKey: any }
        ) {
            const existing = (this.getExtension('relations') as any[]) ?? [];
            return this.withExtension('relations', [
                ...existing,
                { type: 'hasMany', name, ...opts }
            ]);
        },
        /** Define a one-to-one relationship (FK on foreign table).
         * @param name - Relation name used with `include()`.
         * @param opts - `{ schema, foreignKey }` — `foreignKey` is a ColumnRef on the foreign schema.
         */
        hasOne(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            name: string,
            opts: { schema: any; foreignKey: any }
        ) {
            const existing = (this.getExtension('relations') as any[]) ?? [];
            return this.withExtension('relations', [
                ...existing,
                { type: 'hasOne', name, ...opts }
            ]);
        },
        /** Define a belongs-to relationship (FK on local table).
         * @param name - Relation name used with `include()`.
         * @param opts - `{ schema, foreignKey }` — `foreignKey` is a ColumnRef on the local schema.
         */
        belongsTo(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            name: string,
            opts: { schema: any; foreignKey: any }
        ) {
            const existing = (this.getExtension('relations') as any[]) ?? [];
            return this.withExtension('relations', [
                ...existing,
                { type: 'belongsTo', name, ...opts }
            ]);
        },
        /** Define a many-to-many relationship through a pivot table.
         * @param name - Relation name used with `include()`.
         * @param opts - `{ schema, through: { table, localKey, foreignKey } }`.
         */
        belongsToMany(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            name: string,
            opts: {
                schema: any;
                through: {
                    table: string;
                    localKey: string;
                    foreignKey: string;
                };
            }
        ) {
            const existing = (this.getExtension('relations') as any[]) ?? [];
            return this.withExtension('relations', [
                ...existing,
                { type: 'belongsToMany', name, ...opts }
            ]);
        },
        /** Auto-add `created_at` and `updated_at` timestamp columns.
         * @param opts - Optional custom column names.
         */
        hasTimestamps(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            opts?: { createdAt?: string; updatedAt?: string }
        ) {
            return this.withExtension('timestamps', {
                createdAt: opts?.createdAt ?? 'created_at',
                updatedAt: opts?.updatedAt ?? 'updated_at'
            });
        },
        /** Enable soft deletes (adds a `deleted_at` column, auto-filters queries).
         * @param opts - Optional custom column name.
         */
        softDelete(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            opts?: { column?: string }
        ) {
            return this.withExtension('softDelete', {
                column: opts?.column ?? 'deleted_at'
            });
        },
        /** Register a named query scope.
         * @param name - Scope name to use with `.scoped(name)`.
         * @param fn - Function that receives a `SchemaQueryBuilder` and applies filters.
         */
        scope<N extends string>(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            name: N,
            fn: Function
        ): typeof this & { readonly [METHOD_LITERAL_BRAND]?: N } {
            const existing =
                (this.getExtension('scopes') as Record<string, Function>) ?? {};
            return this.withExtension('scopes', {
                ...existing,
                [name]: fn
            }) as typeof this & { readonly [METHOD_LITERAL_BRAND]?: N };
        },
        /**
         * Register a **named projection** — a reusable column subset that can be
         * applied at query time via `.projected(name)`.
         *
         * When a projection is applied the query builder:
         * 1. Issues `SELECT <cols>` instead of `SELECT *`.
         * 2. Narrows the TypeScript result row type to `Pick<Row, Keys>`.
         *
         * Columns are passed as **rest parameters**. Each argument can be either:
         *
         * - A **string** literal of a property name (autocompleted against the
         *   schema's properties):
         *   ```ts
         *   .projection('summary', 'id', 'title', 'completed')
         *   ```
         * - An **accessor callback** (refactor-safe — renaming a property
         *   updates the projection automatically):
         *   ```ts
         *   .projection('listView', t => t.id, t => t.title, t => t.userId)
         *   ```
         *
         * The two forms can be mixed freely:
         * ```ts
         * .projection('mixed', 'id', t => t.title)
         * ```
         *
         * The literal property keys flow through the type system, so
         * `.projected('listView')` still narrows the result type to
         * `Pick<Row, 'id' | 'title' | 'userId'>`.
         *
         * @param name    - Unique projection name (used with `.projected()`).
         * @param columns - One argument per column: either a property name
         *   string or a `t => t.propName` accessor callback.
         *
         * @example
         * ```ts
         * const PostSchema = object({ id: number(), title: string(), body: string() })
         *   .hasTableName('posts')
         *   .projection('summary', 'id', 'title')
         *   .projection('detail',  t => t.id, t => t.title, t => t.body);
         *
         * // Later:
         * const rows = await query(db, PostSchema).projected('summary');
         * // rows: Array<Pick<Post, 'id' | 'title'>>
         * ```
         *
         * @see {@link SchemaQueryBuilder.projected}
         */
        projection<
            TProperties extends Record<
                string,
                SchemaBuilder<any, any, any, any, any>
            >,
            const N extends string,
            const TKey extends keyof TProperties & string
        >(
            this: ObjectSchemaBuilder<
                TProperties,
                any,
                any,
                any,
                any,
                any,
                any
            >,
            name: N,
            ...columns: ReadonlyArray<
                | TKey
                | ((
                      t: PropertyDescriptorTree<
                          ObjectSchemaBuilder<
                              TProperties,
                              any,
                              any,
                              any,
                              any,
                              any,
                              any
                          >,
                          ObjectSchemaBuilder<
                              TProperties,
                              any,
                              any,
                              any,
                              any,
                              any,
                              any
                          >
                      >
                  ) => PropertyDescriptor<any, any, any, TKey>)
            >
        ): typeof this & {
            readonly [EXTRA_TYPE_BRAND]?: { [P in N]: readonly TKey[] };
        } {
            const tree = ObjectSchemaBuilderClass.getPropertiesFor(this as any);
            const keys: string[] = (
                columns as ReadonlyArray<
                    | string
                    | ((t: any) => PropertyDescriptor<any, any, any, any>)
                >
            ).map(col => {
                if (typeof col === 'string') {
                    return col;
                }
                const descriptor = col(tree);
                const inner = (descriptor as any)[
                    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
                ];
                if (!inner) {
                    throw new Error(
                        `projection('${name}'): each accessor must return a valid PropertyDescriptor. ` +
                            `Use \`t => t.propName\`.`
                    );
                }
                if (typeof inner.propertyName !== 'string') {
                    throw new Error(
                        `projection('${name}'): could not resolve property name from descriptor. ` +
                            `Ensure the accessor returns a top-level property descriptor.`
                    );
                }
                return inner.propertyName as string;
            });
            const existing =
                (this.getExtension('projections') as Record<
                    string,
                    { keys: readonly string[] }
                >) ?? {};
            if (Object.hasOwn(existing, name)) {
                throw new Error(
                    `projection('${name}'): a projection with this name is already registered on this schema. ` +
                        `Each projection name must be unique.`
                );
            }
            return this.withExtension('projections', {
                ...existing,
                [name]: { keys }
            }) as typeof this & {
                readonly [EXTRA_TYPE_BRAND]?: { [P in N]: readonly TKey[] };
            };
        },
        /** Set a default scope applied to all queries unless `.unscoped()` is called.
         * @param fn - Function that receives a `SchemaQueryBuilder` and applies filters.
         */
        defaultScope(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            fn: Function
        ) {
            return this.withExtension('defaultScope', fn);
        },
        /** Register a before-insert lifecycle hook.
         * @param fn - Async function `(data) => data` called before inserting.
         */
        beforeInsert(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            fn: Function
        ) {
            const existing =
                (this.getExtension('beforeInsert') as Function[]) ?? [];
            return this.withExtension('beforeInsert', [...existing, fn]);
        },
        /** Register an after-insert lifecycle hook.
         * @param fn - Async function `(row)` called after inserting.
         */
        afterInsert(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            fn: Function
        ) {
            const existing =
                (this.getExtension('afterInsert') as Function[]) ?? [];
            return this.withExtension('afterInsert', [...existing, fn]);
        },
        /** Register a before-update lifecycle hook.
         * @param fn - Async function `(data) => data` called before updating.
         */
        beforeUpdate(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            fn: Function
        ) {
            const existing =
                (this.getExtension('beforeUpdate') as Function[]) ?? [];
            return this.withExtension('beforeUpdate', [...existing, fn]);
        },
        /** Register a before-delete lifecycle hook.
         * @param fn - Async function `(query)` called before deleting.
         */
        beforeDelete(
            this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
            fn: Function
        ) {
            const existing =
                (this.getExtension('beforeDelete') as Function[]) ?? [];
            return this.withExtension('beforeDelete', [...existing, fn]);
        },

        /**
         * Declare polymorphic variants for this schema.
         *
         * Turns a base schema into a **polymorphic schema** where a discriminator
         * column determines which variant each row belongs to. Variants can store
         * their extra fields either in a separate table (CTI — Class Table
         * Inheritance) or as nullable columns on the base table (STI — Single
         * Table Inheritance).
         *
         * The return type carries a phantom brand
         * (`[POLYMORPHIC_TYPE_BRAND]`) so that `query(db, schema)` automatically
         * infers the full discriminated-union result type.
         *
         * @param config.discriminator - Property key (or accessor) of the
         *   discriminator column on the base table (e.g. `'type'` or `t => t.type`).
         * @param config.variants - Map from discriminator value to
         *   `{ schema, storage, foreignKey?, allowOrphan?, enforceCheck? }`.
         *   - `storage: 'cti'` — variant fields are in a separate table;
         *     `foreignKey` (the FK column on the variant table) is required.
         *   - `storage: 'sti'` — variant fields are nullable columns on the base table.
         *
         * @example
         * ```ts
         * const FileBase = object({ id: number().primaryKey(), name: string(), type: string() })
         *   .hasTableName('files');
         *
         * const ImageExtras = object({ width: number(), height: number(), format: string() })
         *   .hasTableName('image_file');
         *
         * const DocumentExtras = object({ size: number(), issueDate: date() })
         *   .hasTableName('document_file');
         *
         * const ImageExtras = object({
         *   fileId: number().hasColumnName('file_id'),
         *   type:   string('image'),
         *   width: number(), height: number(), format: string()
         * }).hasTableName('image_file');
         *
         * const DocumentExtras = object({
         *   fileId: number().hasColumnName('file_id'),
         *   type:   string('document'),
         *   size: number(), issueDate: date()
         * }).hasTableName('document_file');
         *
         * const FileSchema = FileBase.withVariants({
         *   discriminator: t => t.type,
         *   variants: {
         *     image:    { schema: ImageExtras,    storage: 'cti', foreignKey: t => t.fileId },
         *     document: { schema: DocumentExtras, storage: 'cti', foreignKey: t => t.fileId },
         *   },
         * });
         *
         * // query(db, FileSchema) returns:
         * // Array<
         * //   | { id: number; name: string; type: 'image';    width: number; height: number; format: string }
         * //   | { id: number; name: string; type: 'document'; size: number; issueDate: Date }
         * // >
         * ```
         */
        withVariants<
            TProperties extends Record<
                string,
                SchemaBuilder<any, any, any, any, any>
            >,
            const TDiscKey extends keyof TProperties & string,
            TVariantMap extends Record<string, VariantSpecInput<any>>
        >(
            this: ObjectSchemaBuilder<
                TProperties,
                any,
                any,
                any,
                any,
                any,
                any
            >,
            config: {
                /** Property key on this schema used to select the variant. */
                discriminator:
                    | TDiscKey
                    | ((
                          t: PropertyDescriptorTree<
                              ObjectSchemaBuilder<
                                  TProperties,
                                  any,
                                  any,
                                  any,
                                  any,
                                  any,
                                  any
                              >,
                              ObjectSchemaBuilder<
                                  TProperties,
                                  any,
                                  any,
                                  any,
                                  any,
                                  any,
                                  any
                              >
                          >
                      ) => PropertyDescriptor<any, any, any, TDiscKey>);
                /** Map from discriminator value → variant spec. */
                variants: {
                    [K in keyof TVariantMap]: VariantSpecInput<
                        TVariantMap[K]['schema']
                    >;
                };
            }
        ): typeof this & {
            readonly [POLYMORPHIC_TYPE_BRAND]?: VariantUnion<
                ObjectSchemaBuilder<TProperties, any, any, any, any, any, any>,
                TDiscKey,
                TVariantMap
            >;
        } {
            // 1. Resolve discriminator property key
            let discKey: string;
            if (typeof config.discriminator === 'string') {
                discKey = config.discriminator;
            } else {
                const tree = ObjectSchemaBuilderClass.getPropertiesFor(
                    this as any
                );
                const descriptor = (config.discriminator as Function)(
                    tree as any
                );
                const inner = (descriptor as any)?.[
                    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
                ];
                if (!inner?.propertyName) {
                    throw new Error(
                        'withVariants: discriminator accessor must return a top-level property descriptor'
                    );
                }
                discKey = inner.propertyName as string;
            }

            // 2. Validate & normalise each variant spec
            const resolvedVariants: Record<string, ResolvedVariantSpec> = {};
            const variantSchemas: ObjectSchemaBuilder<
                any,
                any,
                any,
                any,
                any,
                any,
                any
            >[] = [];

            for (const [key, spec] of Object.entries(
                config.variants as Record<string, VariantSpecInput>
            )) {
                const varSchema = spec.schema as ObjectSchemaBuilder<
                    any,
                    any,
                    any,
                    any,
                    any,
                    any,
                    any
                >;
                let tableName: string | undefined;

                // Validate: if the variant schema declares the discriminator
                // property, its equalsTo literal must match the map key.
                const varIntrospected = varSchema.introspect() as any;
                const varProps: Record<string, any> =
                    varIntrospected.properties ?? {};
                if (discKey in varProps) {
                    const discPropIntrospected = varProps[
                        discKey
                    ].introspect() as any;
                    const equalsTo: string | undefined =
                        discPropIntrospected.equalsTo;
                    if (equalsTo === undefined) {
                        throw new Error(
                            `withVariants: variant "${key}" declares discriminator property "${discKey}" ` +
                                `but it has no literal value — use string('${key}') instead of string()`
                        );
                    }
                    if (equalsTo !== key) {
                        throw new Error(
                            `withVariants: variant "${key}" declares discriminator "${discKey}" = ` +
                                `string('${equalsTo}') but the map key is '${key}' — they must match`
                        );
                    }
                }

                // Resolve & validate CTI-specific fields.
                let resolvedForeignKey: string | undefined;
                if (spec.storage === 'cti') {
                    tableName = varSchema.getExtension('tableName') as
                        | string
                        | undefined;
                    if (!tableName) {
                        throw new Error(
                            `withVariants: CTI variant "${key}" schema must have .hasTableName() configured`
                        );
                    }
                    if (!spec.foreignKey) {
                        throw new Error(
                            `withVariants: CTI variant "${key}" must specify foreignKey (the FK property accessor on the variant schema)`
                        );
                    }
                    // Resolve the accessor to a property key, then to a column name.
                    const varTree = ObjectSchemaBuilderClass.getPropertiesFor(
                        varSchema as any
                    );
                    const fkDescriptor = (spec.foreignKey as Function)(
                        varTree as any
                    );
                    const fkInner = (fkDescriptor as any)?.[
                        SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
                    ];
                    if (!fkInner?.propertyName) {
                        throw new Error(
                            `withVariants: CTI variant "${key}" foreignKey accessor must return a top-level property descriptor`
                        );
                    }
                    const fkPropKey: string = fkInner.propertyName;
                    const fkPropSchema = varProps[fkPropKey];
                    if (!fkPropSchema) {
                        throw new Error(
                            `withVariants: CTI variant "${key}" foreignKey property "${fkPropKey}" not found in variant schema`
                        );
                    }
                    resolvedForeignKey = getColumnName(fkPropSchema, fkPropKey);
                }

                resolvedVariants[key] = {
                    storage: spec.storage as VariantStorageType,
                    schema: varSchema,
                    foreignKey: resolvedForeignKey,
                    tableName,
                    allowOrphan: spec.allowOrphan ?? false,
                    enforceCheck: spec.enforceCheck ?? false,
                    relations: resolveVariantRelations(
                        key,
                        varSchema,
                        (spec as VariantSpecInput).relations ?? {}
                    )
                };

                variantSchemas.push(varSchema);
            }

            // 3. Store resolved config + migration-discovery array
            const variantConfig: Omit<
                ResolvedVariantConfig,
                'discriminatorColumn'
            > = {
                discriminatorKey: discKey,
                variants: resolvedVariants
            };

            return (this as any)
                .withExtension('variants', variantConfig)
                .withExtension('polymorphicVariants', variantSchemas);
        }
    }
});

// ---------------------------------------------------------------------------
// Extended factory functions
// ---------------------------------------------------------------------------

const extended = withExtensions(
    stringExtensions,
    numberExtensions,
    arrayExtensions,
    dbExtension,
    ddlExtension
);

export const string = extended.string;
export const number = extended.number;
export const boolean = extended.boolean;
export const date = extended.date;
export const object = extended.object;
export const array = extended.array;
export const union = extended.union;
export const func = extended.func;
export const any = extended.any;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the SQL column name for a schema property.
 * Returns the `hasColumnName()` value if set, otherwise falls back to `propertyKey`.
 */
export function getColumnName(
    schema: SchemaBuilder<any, any, any>,
    propertyKey: string
): string {
    const col = schema.getExtension('columnName');
    return typeof col === 'string' ? col : propertyKey;
}

/**
 * Get the SQL table name from an ObjectSchemaBuilder.
 * Throws if `hasTableName()` was never called.
 */
export function getTableName(
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>
): string {
    const table = schema.getExtension('tableName');
    if (typeof table !== 'string') {
        throw new Error(
            'Schema does not have a table name. Use .hasTableName("table_name") to set one.'
        );
    }
    return table;
}

/**
 * Retrieve the named projections registered on a schema via
 * `.projection(name, columns)`.
 *
 * Returns a map of `{ [name]: { keys: readonly string[] } }` where each
 * entry's `keys` array contains the **property keys** (not SQL column names)
 * for that projection. Returns an empty object when no projections are
 * defined.
 *
 * @example
 * ```ts
 * const projs = getProjections(PostSchema);
 * // { summary: { keys: ['id', 'title'] } }
 * ```
 */
export function getProjections(
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>
): Record<string, { keys: readonly string[] }> {
    return (
        (schema.getExtension('projections') as Record<
            string,
            { keys: readonly string[] }
        >) ?? {}
    );
}

/**
 * Retrieve the resolved variant configuration stored by `.withVariants()`.
 * Returns `null` when the schema is not polymorphic.
 *
 * @internal — used by {@link SchemaQueryBuilder}.
 */
export function getVariants(
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>
): Omit<ResolvedVariantConfig, 'discriminatorColumn'> | null {
    const cfg = schema.getExtension('variants');
    return cfg != null
        ? (cfg as Omit<ResolvedVariantConfig, 'discriminatorColumn'>)
        : null;
}

/**
 * Retrieve the array of variant `ObjectSchemaBuilder` instances stored by
 * `.withVariants()`. Used by migration / DDL tools to discover variant
 * tables without walking the full schema tree.
 *
 * @internal
 */
export function getPolymorphicVariantSchemas(
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>
): ObjectSchemaBuilder<any, any, any, any, any, any, any>[] {
    return (
        (schema.getExtension('polymorphicVariants') as ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        >[]) ?? []
    );
}
