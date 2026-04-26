// @cleverbrush/knex-schema — Extra coverage for columns.ts
// (getPrimaryKeyColumns basic tests are in orm-extensions.test.ts;
//  this file adds: unknown-identifier passthrough, property-key entry,
//  getRowVersionColumn variants, resolveColumnRef dotted paths,
//  buildColumnMap cache, resolvePropertyKey)

import Knex from 'knex';
import { afterAll, describe, expect, it } from 'vitest';
import {
    buildColumnMap,
    date,
    getPrimaryKeyColumns,
    getRowVersionColumn,
    number,
    object,
    resolveColumnRef,
    string
} from './index.js';

const knex = Knex({ client: 'pg' });
afterAll(async () => {
    await knex.destroy();
});

// ═══════════════════════════════════════════════════════════════════════════
// getPrimaryKeyColumns — extended cases
// ═══════════════════════════════════════════════════════════════════════════

describe('getPrimaryKeyColumns — extended', () => {
    it('accepts composite PK with property key entries (not column names)', () => {
        const S = object({
            postId: number().hasColumnName('post_id').required(),
            tagId: number().hasColumnName('tag_id').required()
        })
            .hasTableName('post_tags')
            .hasPrimaryKey(['postId', 'tagId']); // property keys, not column names
        const pk = getPrimaryKeyColumns(S);
        expect(pk.propertyKeys).toEqual(['postId', 'tagId']);
        expect(pk.columnNames).toEqual(['post_id', 'tag_id']);
    });

    it('passes through unknown identifiers as-is (best effort)', () => {
        const S = object({
            a: string().required()
        })
            .hasTableName('t')
            .hasPrimaryKey(['unknown_col']);
        const pk = getPrimaryKeyColumns(S);
        expect(pk.propertyKeys).toEqual(['unknown_col']);
        expect(pk.columnNames).toEqual(['unknown_col']);
    });

    it('single-column string PK is resolved correctly', () => {
        const S = object({
            slug: string().primaryKey().required()
        }).hasTableName('slugs');
        const pk = getPrimaryKeyColumns(S);
        expect(pk.propertyKeys).toEqual(['slug']);
        expect(pk.columnNames).toEqual(['slug']);
    });

    it('single-column PK with hasColumnName override', () => {
        const S = object({
            userId: string().hasColumnName('user_id').primaryKey().required()
        }).hasTableName('users');
        const pk = getPrimaryKeyColumns(S);
        expect(pk.propertyKeys).toEqual(['userId']);
        expect(pk.columnNames).toEqual(['user_id']);
    });

    it('auto-increment integer PK is resolved', () => {
        const S = object({
            id: number().primaryKey()
        }).hasTableName('items');
        const pk = getPrimaryKeyColumns(S);
        expect(pk.propertyKeys).toEqual(['id']);
        expect(pk.columnNames).toEqual(['id']);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// getRowVersionColumn
// ═══════════════════════════════════════════════════════════════════════════

describe('getRowVersionColumn', () => {
    it('returns null when no rowVersion column exists', () => {
        const S = object({
            id: number().primaryKey(),
            name: string().required()
        }).hasTableName('items');
        expect(getRowVersionColumn(S)).toBeNull();
    });

    it('returns increment strategy for number.rowVersion()', () => {
        const S = object({
            id: number().primaryKey(),
            version: number().rowVersion().required()
        }).hasTableName('items');
        const rv = getRowVersionColumn(S);
        expect(rv).not.toBeNull();
        expect(rv!.propertyKey).toBe('version');
        expect(rv!.columnName).toBe('version');
        expect(rv!.strategy).toBe('increment');
    });

    it('returns manual strategy for number.rowVersion({ strategy: "manual" })', () => {
        const S = object({
            id: number().primaryKey(),
            version: number().rowVersion({ strategy: 'manual' }).required()
        }).hasTableName('items');
        const rv = getRowVersionColumn(S);
        expect(rv!.strategy).toBe('manual');
    });

    it('returns timestamp strategy for date.rowVersion()', () => {
        const S = object({
            id: number().primaryKey(),
            updatedAt: date()
                .hasColumnName('updated_at')
                .rowVersion()
                .required()
        }).hasTableName('items');
        const rv = getRowVersionColumn(S);
        expect(rv!.strategy).toBe('timestamp');
        expect(rv!.columnName).toBe('updated_at');
        expect(rv!.propertyKey).toBe('updatedAt');
    });

    it('returns manual strategy for string.rowVersion()', () => {
        const S = object({
            id: number().primaryKey(),
            etag: string().hasColumnName('e_tag').rowVersion().required()
        }).hasTableName('items');
        const rv = getRowVersionColumn(S);
        expect(rv!.strategy).toBe('manual');
        expect(rv!.columnName).toBe('e_tag');
    });

    it('returns first rowVersion column when multiple are declared', () => {
        const S = object({
            a: number().rowVersion().required(),
            b: number().rowVersion({ strategy: 'manual' }).required()
        }).hasTableName('multi');
        const rv = getRowVersionColumn(S);
        expect(rv!.propertyKey).toBe('a');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// buildColumnMap — cache
// ═══════════════════════════════════════════════════════════════════════════

describe('buildColumnMap — cache', () => {
    it('returns the same object on repeated calls for the same schema instance', () => {
        const S = object({
            firstName: string().hasColumnName('first_name').required()
        }).hasTableName('people');
        const first = buildColumnMap(S);
        const second = buildColumnMap(S);
        expect(first).toBe(second);
    });

    it('builds distinct maps for distinct schema instances', () => {
        const S1 = object({
            a: string().hasColumnName('col_a').required()
        }).hasTableName('t1');
        const S2 = object({
            a: string().hasColumnName('col_b').required()
        }).hasTableName('t2');
        const m1 = buildColumnMap(S1);
        const m2 = buildColumnMap(S2);
        expect(m1.propToCol.get('a')).toBe('col_a');
        expect(m2.propToCol.get('a')).toBe('col_b');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// resolveColumnRef — extended cases
// ═══════════════════════════════════════════════════════════════════════════

const AddressSchema = object({
    street: string().required(),
    city: string().hasColumnName('city_name').required()
}).required();

const OrderSchema = object({
    id: number().primaryKey(),
    address: AddressSchema,
    customerId: number().hasColumnName('customer_id').required()
}).hasTableName('orders');

describe('resolveColumnRef — dotted string path (JSON)', () => {
    it('resolves dot-path to knex.raw JSON path expression', () => {
        const result = resolveColumnRef(
            'address.city',
            OrderSchema,
            'test',
            knex
        );
        // Should return a Knex.Raw expression
        expect(typeof result).toBe('object');
        const rawStr = (result as any).toSQL().sql;
        expect(rawStr).toContain('address');
    });

    it('throws when knex is omitted for dotted path', () => {
        expect(() =>
            resolveColumnRef('address.city', OrderSchema, 'test')
        ).toThrow(/Knex instance is required/);
    });

    it('passes through unknown string ref as column name (not a property key)', () => {
        const result = resolveColumnRef('raw_column_name', OrderSchema, 'test');
        expect(result).toBe('raw_column_name');
    });
});

describe('resolveColumnRef — function accessor JSON path', () => {
    it('resolves nested accessor to raw JSON path expression', () => {
        const result = resolveColumnRef(
            (t: any) => t.address.city,
            OrderSchema,
            'test',
            knex
        );
        expect(typeof result).toBe('object');
    });

    it('throws when knex is omitted for nested accessor path', () => {
        expect(() =>
            resolveColumnRef((t: any) => t.address.city, OrderSchema, 'test')
        ).toThrow(/Knex instance is required/);
    });

    it('throws when accessor returns root descriptor', () => {
        expect(() =>
            resolveColumnRef(
                (t: any) => t, // returns root — not a valid property descriptor
                OrderSchema,
                'test',
                knex
            )
        ).toThrow(/accessor/);
    });

    it('throws when accessor returns non-descriptor value', () => {
        expect(() =>
            resolveColumnRef(
                (_t: any) => 'not-a-descriptor' as any,
                OrderSchema,
                'test',
                knex
            )
        ).toThrow(/accessor/);
    });
});

describe('resolveColumnRef — error cases', () => {
    it('throws for non-string non-function ref', () => {
        expect(() =>
            resolveColumnRef(42 as any, OrderSchema, 'test', knex)
        ).toThrow(/must be a string or/);
    });
});
