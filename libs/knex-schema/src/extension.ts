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
import { defineExtension, withExtensions } from '@cleverbrush/schema';

// ---------------------------------------------------------------------------
// Shared implementations
// ---------------------------------------------------------------------------

function hasColumnName(this: SchemaBuilder<any, any, any>, name: string) {
    return this.withExtension('columnName', name);
}

function hasTableName(
    this: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    name: string
) {
    return this.withExtension('tableName', name);
}

// ---------------------------------------------------------------------------
// Extension definition
// ---------------------------------------------------------------------------

export const dbExtension = defineExtension({
    string: {
        hasColumnName(
            this: StringSchemaBuilder<any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    number: {
        hasColumnName(
            this: NumberSchemaBuilder<any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    boolean: {
        hasColumnName(
            this: BooleanSchemaBuilder<any, any, any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    date: {
        hasColumnName(
            this: DateSchemaBuilder<any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    any: {
        hasColumnName(
            this: AnySchemaBuilder<any, any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    func: {
        hasColumnName(
            this: FunctionSchemaBuilder<any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    array: {
        hasColumnName(
            this: ArraySchemaBuilder<any, any, any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    union: {
        hasColumnName(
            this: UnionSchemaBuilder<any, any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    generic: {
        hasColumnName(
            this: GenericSchemaBuilder<any, any, any, any, any, any>,
            name: string
        ) {
            return hasColumnName.call(this, name);
        }
    },
    object: {
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

const extended = withExtensions(dbExtension);

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
