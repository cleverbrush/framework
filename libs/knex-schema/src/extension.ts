// @cleverbrush/knex-schema — Schema extension: hasColumnName / hasTableName

import type {
    AnySchemaBuilder,
    ArraySchemaBuilder,
    BooleanSchemaBuilder,
    DateSchemaBuilder,
    FunctionSchemaBuilder,
    GenericSchemaBuilder,
    NumberSchemaBuilder,
    ObjectSchemaBuilder,
    SchemaBuilder,
    StringSchemaBuilder,
    UnionSchemaBuilder
} from '@cleverbrush/schema';
import {
    arrayExtensions,
    defineExtension,
    numberExtensions,
    stringExtensions,
    withExtensions
} from '@cleverbrush/schema';

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
// Extended factory functions
// ---------------------------------------------------------------------------

const extended = withExtensions(
    stringExtensions,
    numberExtensions,
    arrayExtensions,
    dbExtension
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
