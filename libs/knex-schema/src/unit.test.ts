// @cleverbrush/knex-schema — Unit tests

import Knex, { type Knex as KnexType } from 'knex';
import { describe, expect, it } from 'vitest';
import {
    buildColumnMap,
    date,
    getColumnName,
    getTableName,
    number,
    object,
    query,
    resolveColumnRef,
    string
} from './index.js';

// ═══════════════════════════════════════════════════════════════════════════
// Test schemas
// ═══════════════════════════════════════════════════════════════════════════

const User = object({
    id: number(),
    fullName: string().hasColumnName('full_name'),
    email: string(),
    role: string(),
    departmentId: number().hasColumnName('department_id'),
    managerId: number().hasColumnName('manager_id').optional(),
    createdAt: date().hasColumnName('created_at')
}).hasTableName('users');

const Department = object({
    id: number(),
    name: string(),
    budget: number()
}).hasTableName('departments');

const Post = object({
    id: number(),
    title: string(),
    body: string(),
    authorId: number().hasColumnName('author_id'),
    categoryId: number().hasColumnName('category_id'),
    createdAt: date().hasColumnName('created_at')
}).hasTableName('posts');

// Schema without any hasColumnName (all defaults)
const SimpleTag = object({
    id: number(),
    name: string(),
    slug: string()
}).hasTableName('tags');

const knex = Knex({ client: 'pg' });

// ═══════════════════════════════════════════════════════════════════════════
// Extension tests
// ═══════════════════════════════════════════════════════════════════════════

describe('schema extension', () => {
    it('stores tableName via getExtension', () => {
        expect((User as any).getExtension('tableName')).toBe('users');
    });

    it('stores columnName via getExtension', () => {
        const props = User.introspect().properties as any;
        expect(props.fullName.getExtension('columnName')).toBe('full_name');
        expect(props.departmentId.getExtension('columnName')).toBe(
            'department_id'
        );
    });

    it('returns undefined for properties without hasColumnName', () => {
        const props = User.introspect().properties as any;
        expect(props.email.getExtension('columnName')).toBeUndefined();
    });

    it('getTableName() helper works', () => {
        expect(getTableName(User)).toBe('users');
        expect(getTableName(Department)).toBe('departments');
    });

    it('getTableName() throws when no table name set', () => {
        const NoTable = object({ id: number() });
        expect(() => getTableName(NoTable as any)).toThrow(
            'Schema does not have a table name'
        );
    });

    it('getColumnName() returns extension value when set', () => {
        const props = User.introspect().properties as any;
        expect(getColumnName(props.fullName, 'fullName')).toBe('full_name');
    });

    it('getColumnName() falls back to property key when not set', () => {
        const props = User.introspect().properties as any;
        expect(getColumnName(props.email, 'email')).toBe('email');
    });

    it('hasColumnName survives .optional() chaining', () => {
        const schema = string().hasColumnName('col_name').optional();
        expect(schema.getExtension('columnName')).toBe('col_name');
    });

    it('hasColumnName survives .required() chaining', () => {
        const schema = number().hasColumnName('col_a').optional().required();
        expect(schema.getExtension('columnName')).toBe('col_a');
    });

    it('hasTableName survives .optional()/.required() chaining', () => {
        const schema = object({ x: number() })
            .hasTableName('my_table')
            .optional()
            .required();
        expect(schema.getExtension('tableName')).toBe('my_table');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Column resolution tests
// ═══════════════════════════════════════════════════════════════════════════

describe('buildColumnMap', () => {
    it('maps properties with hasColumnName to column names', () => {
        const { propToCol, colToProp } = buildColumnMap(User);
        expect(propToCol.get('fullName')).toBe('full_name');
        expect(propToCol.get('departmentId')).toBe('department_id');
        expect(colToProp.get('full_name')).toBe('fullName');
        expect(colToProp.get('department_id')).toBe('departmentId');
    });

    it('defaults to property key when hasColumnName is not set', () => {
        const { propToCol, colToProp } = buildColumnMap(User);
        expect(propToCol.get('email')).toBe('email');
        expect(colToProp.get('email')).toBe('email');
        expect(propToCol.get('id')).toBe('id');
    });

    it('all-default schema has identity mapping', () => {
        const { propToCol, colToProp } = buildColumnMap(SimpleTag);
        expect(propToCol.get('id')).toBe('id');
        expect(propToCol.get('name')).toBe('name');
        expect(propToCol.get('slug')).toBe('slug');
        expect(colToProp.get('id')).toBe('id');
    });
});

describe('resolveColumnRef', () => {
    it('resolves string property key to column name', () => {
        expect(resolveColumnRef('fullName', User, 'test')).toBe('full_name');
    });

    it('resolves string property key with default column name', () => {
        expect(resolveColumnRef('email', User, 'test')).toBe('email');
    });

    it('resolves property descriptor accessor to column name', () => {
        const col = resolveColumnRef((t: any) => t.fullName, User, 'test');
        expect(col).toBe('full_name');
    });

    it('resolves property descriptor accessor with default column', () => {
        const col = resolveColumnRef((t: any) => t.email, User, 'test');
        expect(col).toBe('email');
    });

    it('throws on empty string', () => {
        expect(() => resolveColumnRef('', User, 'col')).toThrow(
            'must be a non-empty string'
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Query builder — SQL snapshot tests
// ═══════════════════════════════════════════════════════════════════════════

describe('SchemaQueryBuilder', () => {
    describe('basic SELECT', () => {
        it('produces SELECT * FROM table', () => {
            const sql = query(knex, User).toQuery();
            expect(sql).toBe('select * from "users"');
        });

        it('produces SELECT with SimpleTag (no column mapping needed)', () => {
            const sql = query(knex, SimpleTag).toQuery();
            expect(sql).toBe('select * from "tags"');
        });
    });

    describe('WHERE', () => {
        it('.where with property descriptor', () => {
            const sql = query(knex, User)
                .where(t => t.fullName, '=', 'John')
                .toQuery();
            expect(sql).toContain('"full_name" = \'John\'');
        });

        it('.where with string property key', () => {
            const sql = query(knex, User)
                .where('fullName', '=', 'John')
                .toQuery();
            expect(sql).toContain('"full_name" = \'John\'');
        });

        it('.where with default column name', () => {
            const sql = query(knex, User)
                .where('email', '=', 'test@test.com')
                .toQuery();
            expect(sql).toContain('"email" = \'test@test.com\'');
        });

        it('.where with record syntax', () => {
            const sql = query(knex, User)
                .where({ fullName: 'John', role: 'admin' })
                .toQuery();
            expect(sql).toContain('"full_name" = \'John\'');
            expect(sql).toContain('"role" = \'admin\'');
        });

        it('.where with callback (knex sub-builder)', () => {
            const sql = query(knex, User)
                .where((builder: KnexType.QueryBuilder) => {
                    builder.where('role', 'admin');
                })
                .toQuery();
            expect(sql).toContain('"role" = \'admin\'');
        });

        it('.whereIn with property descriptor', () => {
            const sql = query(knex, User)
                .whereIn(t => t.role, ['admin', 'user'])
                .toQuery();
            expect(sql).toContain("\"role\" in ('admin', 'user')");
        });

        it('.whereNotIn', () => {
            const sql = query(knex, User)
                .whereNotIn('role', ['banned'])
                .toQuery();
            expect(sql).toContain('"role" not in (\'banned\')');
        });

        it('.whereNull with descriptor', () => {
            const sql = query(knex, User)
                .whereNull(t => t.managerId)
                .toQuery();
            expect(sql).toContain('"manager_id" is null');
        });

        it('.whereNotNull', () => {
            const sql = query(knex, User)
                .whereNotNull(t => t.managerId)
                .toQuery();
            expect(sql).toContain('"manager_id" is not null');
        });

        it('.whereBetween', () => {
            const sql = query(knex, User)
                .whereBetween(t => t.departmentId, [1, 10])
                .toQuery();
            expect(sql).toContain('"department_id" between 1 and 10');
        });

        it('.andWhere / .orWhere chaining', () => {
            const sql = query(knex, User)
                .where('role', '=', 'admin')
                .andWhere(t => t.departmentId, '>', 5)
                .orWhere('email', 'like', '%@co.com')
                .toQuery();
            expect(sql).toContain('"role" = \'admin\'');
            expect(sql).toContain('"department_id" > 5');
            expect(sql).toContain('"email" like \'%@co.com\'');
        });

        it('.whereRaw passthrough', () => {
            const sql = query(knex, User)
                .whereRaw('full_name ILIKE ?', '%smith%')
                .toQuery();
            expect(sql).toContain("full_name ILIKE '%smith%'");
        });
    });

    describe('ORDER BY', () => {
        it('.orderBy with descriptor', () => {
            const sql = query(knex, User)
                .orderBy(t => t.createdAt, 'desc')
                .toQuery();
            expect(sql).toContain('order by "created_at" desc');
        });

        it('.orderBy with string key', () => {
            const sql = query(knex, User).orderBy('fullName').toQuery();
            expect(sql).toContain('order by "full_name"');
        });
    });

    describe('LIMIT / OFFSET', () => {
        it('.limit and .offset', () => {
            const sql = query(knex, User).limit(10).offset(20).toQuery();
            expect(sql).toContain('limit 10');
            expect(sql).toContain('offset 20');
        });
    });

    describe('GROUP BY / HAVING', () => {
        it('.groupBy with descriptor', () => {
            const sql = query(knex, User)
                .groupBy(t => t.role)
                .toQuery();
            expect(sql).toContain('group by "role"');
        });

        it('.having', () => {
            const sql = query(knex, User)
                .groupBy('role')
                .having('role', '!=', 'banned')
                .toQuery();
            expect(sql).toContain('group by "role"');
            expect(sql).toContain('having "role" != \'banned\'');
        });
    });

    describe('SELECT / DISTINCT', () => {
        it('.select with descriptors', () => {
            const sql = query(knex, User)
                .select(
                    t => t.fullName,
                    t => t.email
                )
                .toQuery();
            expect(sql).toContain('"full_name"');
            expect(sql).toContain('"email"');
        });

        it('.distinct with descriptor', () => {
            const sql = query(knex, User)
                .distinct(t => t.role)
                .toQuery();
            expect(sql).toContain('distinct "role"');
        });
    });

    describe('escape hatch', () => {
        it('.apply passes through to knex builder', () => {
            const sql = query(knex, User)
                .apply(qb => {
                    qb.where('id', '>', 100);
                })
                .toQuery();
            expect(sql).toContain('"id" > 100');
        });
    });

    describe('chained queries', () => {
        it('complex chained query', () => {
            const sql = query(knex, User)
                .where(t => t.role, '=', 'admin')
                .andWhere(t => t.departmentId, '>', 5)
                .whereNotNull(t => t.managerId)
                .orderBy(t => t.fullName, 'asc')
                .limit(50)
                .offset(100)
                .toQuery();

            expect(sql).toContain('"users"');
            expect(sql).toContain('"role" = \'admin\'');
            expect(sql).toContain('"department_id" > 5');
            expect(sql).toContain('"manager_id" is not null');
            expect(sql).toContain('order by "full_name" asc');
            expect(sql).toContain('limit 50');
            expect(sql).toContain('offset 100');
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Eager loading — SQL snapshot tests
// ═══════════════════════════════════════════════════════════════════════════

describe('eager loading', () => {
    it('joinOne produces CTE with jsonb_agg', () => {
        const sql = query(knex, User)
            .joinOne({
                localColumn: t => t.departmentId,
                foreignColumn: t => t.id,
                as: 'department',
                foreignSchema: Department
            })
            .toQuery();

        expect(sql).toContain('with "originalQuery" as');
        expect(sql).toContain('"departments"');
        expect(sql).toContain('jsonb_agg');
        expect(sql).toContain('"department"');
    });

    it('joinMany produces CTE with jsonb_agg and coalesce', () => {
        const sql = query(knex, User)
            .joinMany({
                localColumn: t => t.id,
                foreignColumn: t => t.authorId,
                as: 'posts',
                foreignSchema: Post
            })
            .toQuery();

        expect(sql).toContain('with "originalQuery" as');
        expect(sql).toContain('"posts"');
        expect(sql).toContain('jsonb_agg');
        expect(sql).toContain('coalesce');
    });

    it('joinOne with string column refs', () => {
        const sql = query(knex, User)
            .joinOne({
                localColumn: 'departmentId',
                foreignColumn: 'id',
                as: 'department',
                foreignSchema: Department
            })
            .toQuery();

        expect(sql).toContain('"department_id"');
    });

    it('joinMany with limit and orderBy', () => {
        const sql = query(knex, User)
            .joinMany({
                localColumn: t => t.id,
                foreignColumn: t => t.authorId,
                as: 'posts',
                foreignSchema: Post,
                limit: 5,
                orderBy: { column: t => t.createdAt, direction: 'desc' }
            })
            .toQuery();

        expect(sql).toContain('row_number()');
        expect(sql).toContain('partition by');
    });

    it('chained joinOne + joinMany', () => {
        const sql = query(knex, User)
            .joinOne({
                localColumn: t => t.departmentId,
                foreignColumn: t => t.id,
                as: 'department',
                foreignSchema: Department
            })
            .joinMany({
                localColumn: t => t.id,
                foreignColumn: t => t.authorId,
                as: 'posts',
                foreignSchema: Post
            })
            .where(t => t.role, '=', 'admin')
            .toQuery();

        expect(sql).toContain('"department"');
        expect(sql).toContain('"posts"');
        expect(sql).toContain('"role" = \'admin\'');
    });

    it('joinOne with explicit foreignQuery', () => {
        const sql = query(knex, User)
            .joinOne({
                localColumn: t => t.departmentId,
                foreignColumn: t => t.id,
                as: 'department',
                foreignSchema: Department,
                foreignQuery: knex('departments').where('budget', '>', 1000)
            })
            .toQuery();

        expect(sql).toContain('"budget" > 1000');
    });

    it('throws on duplicate field names', () => {
        expect(() => {
            query(knex, User)
                .joinOne({
                    localColumn: t => t.departmentId,
                    foreignColumn: t => t.id,
                    as: 'dept',
                    foreignSchema: Department
                })
                .joinOne({
                    localColumn: t => t.departmentId,
                    foreignColumn: t => t.id,
                    as: 'dept',
                    foreignSchema: Department
                });
        }).toThrow('duplicate field name');
    });
});
