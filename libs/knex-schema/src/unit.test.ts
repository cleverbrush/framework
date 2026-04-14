// @cleverbrush/knex-schema — Unit tests

import Knex, { type Knex as KnexType } from 'knex';
import { afterAll, describe, expect, it, vi } from 'vitest';
import {
    buildColumnMap,
    date,
    getColumnName,
    getTableName,
    MAPPERS,
    mapObject,
    mapValue,
    number,
    object,
    query,
    resolveColumnRef,
    SchemaQueryBuilder,
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

afterAll(async () => {
    await knex.destroy();
});

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

    it('joinOne with explicit foreignQuery as raw knex', () => {
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

    it('joinOne with SchemaQueryBuilder as foreignQuery', () => {
        const sql = query(knex, User)
            .joinOne({
                localColumn: t => t.departmentId,
                foreignColumn: t => t.id,
                as: 'department',
                foreignSchema: Department,
                foreignQuery: query(knex, Department).where(
                    t => t.budget,
                    '>',
                    1000
                )
            })
            .toQuery();

        expect(sql).toContain('"budget" > 1000');
    });

    it('SchemaQueryBuilder foreignQuery produces same SQL as raw knex foreignQuery', () => {
        const rawSql = query(knex, User)
            .joinOne({
                localColumn: t => t.departmentId,
                foreignColumn: t => t.id,
                as: 'department',
                foreignSchema: Department,
                foreignQuery: knex('departments').where('budget', '>', 1000)
            })
            .toQuery();

        const schemaSql = query(knex, User)
            .joinOne({
                localColumn: t => t.departmentId,
                foreignColumn: t => t.id,
                as: 'department',
                foreignSchema: Department,
                foreignQuery: query(knex, Department).where(
                    t => t.budget,
                    '>',
                    1000
                )
            })
            .toQuery();

        expect(schemaSql).toBe(rawSql);
    });

    it('joinMany with SchemaQueryBuilder as foreignQuery', () => {
        const sql = query(knex, User)
            .joinMany({
                localColumn: t => t.id,
                foreignColumn: t => t.authorId,
                as: 'posts',
                foreignSchema: Post,
                foreignQuery: query(knex, Post).where(t => t.categoryId, '=', 5)
            })
            .toQuery();

        expect(sql).toContain('"category_id" = 5');
    });

    it('joinMany SchemaQueryBuilder foreignQuery matches raw knex', () => {
        const rawSql = query(knex, User)
            .joinMany({
                localColumn: t => t.id,
                foreignColumn: t => t.authorId,
                as: 'posts',
                foreignSchema: Post,
                foreignQuery: knex('posts').where('category_id', '=', 5)
            })
            .toQuery();

        const schemaSql = query(knex, User)
            .joinMany({
                localColumn: t => t.id,
                foreignColumn: t => t.authorId,
                as: 'posts',
                foreignSchema: Post,
                foreignQuery: query(knex, Post).where(t => t.categoryId, '=', 5)
            })
            .toQuery();

        expect(schemaSql).toBe(rawSql);
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

    it('joinOne with .select() still includes localColumn in CTE', () => {
        // If the caller uses .select() and omits the join key (departmentId),
        // the generated SQL should still include it in the CTE so the join works.
        const sql = query(knex, User)
            .select(t => t.fullName) // intentionally omit departmentId
            .joinOne({
                localColumn: t => t.departmentId,
                foreignColumn: t => t.id,
                as: 'department',
                foreignSchema: Department
            })
            .toQuery();

        // CTE must still reference department_id even though it wasn't selected
        expect(sql).toContain('"department_id"');
        // The join condition must be present
        expect(sql).toContain('eagerRelation0');
    });

    it('joinMany with .select() still includes localColumn in CTE', () => {
        const sql = query(knex, User)
            .select(t => t.fullName) // intentionally omit id (localColumn for joinMany)
            .joinMany({
                localColumn: t => t.id,
                foreignColumn: t => t.authorId,
                as: 'posts',
                foreignSchema: Post
            })
            .toQuery();

        // CTE must still reference id even though it wasn't selected
        expect(sql).toContain('"id"');
        // The final SELECT must not expose the extra "id" column we injected
        // (it only appears in the CTE, not in the outer SELECT list as originalQuery.*)
        // The outer query should only select full_name and the joined alias
        expect(sql).toContain('"full_name"');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Mapper tests
// ═══════════════════════════════════════════════════════════════════════════

describe('mappers', () => {
    describe('MAPPERS built-ins', () => {
        it('date_from_json converts a date string to a Date object', () => {
            const result = MAPPERS.date_from_json('2024-01-15T00:00:00.000Z');
            expect(result).toBeInstanceOf(Date);
            expect((result as Date).getFullYear()).toBe(2024);
        });

        it('date_from_json passes through falsy values', () => {
            expect(MAPPERS.date_from_json(null)).toBeNull();
            expect(MAPPERS.date_from_json('')).toBe('');
            expect(MAPPERS.date_from_json(0)).toBe(0);
        });
    });

    describe('mapValue', () => {
        it('calls a function mapper directly', () => {
            const double = (v: number) => v * 2;
            expect(mapValue(double, 5)).toBe(10);
        });

        it('resolves a built-in string mapper by name', () => {
            const result = mapValue(
                'date_from_json',
                '2024-06-01T00:00:00.000Z'
            );
            expect(result).toBeInstanceOf(Date);
        });

        it('throws for an unknown built-in string name', () => {
            expect(() => mapValue('unknown_mapper', 'x')).toThrow(
                'unknown mapper "unknown_mapper"'
            );
        });
    });

    describe('mapObject', () => {
        it('applies function mappers to specified keys', () => {
            const obj = { a: 1, b: 2, c: 3 };
            const result = mapObject(obj, { a: v => v * 10 });
            expect(result).toEqual({ a: 10, b: 2, c: 3 });
        });

        it('applies built-in string mappers to specified keys', () => {
            const obj = {
                createdAt: '2024-01-15T00:00:00.000Z',
                name: 'Alice'
            };
            const result = mapObject(obj, { createdAt: 'date_from_json' });
            expect(result.createdAt).toBeInstanceOf(Date);
            expect(result.name).toBe('Alice');
        });
    });

    describe('validateMappers via joinOne/joinMany', () => {
        it('accepts a function mapper in joinOne spec', () => {
            expect(() =>
                query(knex, User).joinOne({
                    localColumn: t => t.departmentId,
                    foreignColumn: t => t.id,
                    as: 'department',
                    foreignSchema: Department,
                    mappers: { name: v => String(v).toUpperCase() }
                })
            ).not.toThrow();
        });

        it('accepts a built-in string mapper name in joinOne spec', () => {
            expect(() =>
                query(knex, Post).joinOne({
                    localColumn: t => t.authorId,
                    foreignColumn: t => t.id,
                    as: 'author',
                    foreignSchema: User,
                    mappers: { createdAt: 'date_from_json' }
                })
            ).not.toThrow();
        });

        it('rejects an unknown built-in string mapper name in joinOne spec', () => {
            expect(() =>
                query(knex, User).joinOne({
                    localColumn: t => t.departmentId,
                    foreignColumn: t => t.id,
                    as: 'department',
                    foreignSchema: Department,
                    mappers: { name: 'not_a_real_mapper' as any }
                })
            ).toThrow('unknown built-in mapper name "not_a_real_mapper"');
        });

        it('accepts a built-in string mapper name in joinMany spec', () => {
            expect(() =>
                query(knex, User).joinMany({
                    localColumn: t => t.id,
                    foreignColumn: t => t.authorId,
                    as: 'posts',
                    foreignSchema: Post,
                    mappers: { createdAt: 'date_from_json' }
                })
            ).not.toThrow();
        });

        it('rejects a non-function, non-string mapper value', () => {
            expect(() =>
                query(knex, User).joinOne({
                    localColumn: t => t.departmentId,
                    foreignColumn: t => t.id,
                    as: 'department',
                    foreignSchema: Department,
                    mappers: { name: 42 as any }
                })
            ).toThrow('must be a function or a built-in mapper name');
        });
    });
});

//
// For each method, we verify that SchemaQueryBuilder produces exactly the
// same SQL as a raw knex query built with the mapped column names directly.
// This confirms that the only thing the builder does is translate property
// keys → column names; all other knex behaviour is preserved unchanged.
// ═══════════════════════════════════════════════════════════════════════════

describe('SQL parity with raw knex', () => {
    // ── SELECT ────────────────────────────────────────────────────────────

    it('SELECT *', () => {
        expect(query(knex, User).toQuery()).toBe(knex('users').toQuery());
    });

    it('SELECT specific columns (descriptor)', () => {
        expect(
            query(knex, User)
                .select(
                    t => t.fullName,
                    t => t.email,
                    t => t.createdAt
                )
                .toQuery()
        ).toBe(
            knex('users').select('full_name', 'email', 'created_at').toQuery()
        );
    });

    it('SELECT specific columns (string key)', () => {
        expect(query(knex, User).select('fullName', 'email').toQuery()).toBe(
            knex('users').select('full_name', 'email').toQuery()
        );
    });

    it('SELECT — identity mapping (no hasColumnName)', () => {
        expect(query(knex, SimpleTag).select('id', 'name').toQuery()).toBe(
            knex('tags').select('id', 'name').toQuery()
        );
    });

    // ── DISTINCT ──────────────────────────────────────────────────────────

    it('DISTINCT (descriptor)', () => {
        expect(
            query(knex, User)
                .distinct(t => t.role)
                .toQuery()
        ).toBe(knex('users').distinct('role').toQuery());
    });

    it('DISTINCT (string key)', () => {
        expect(query(knex, User).distinct('departmentId').toQuery()).toBe(
            knex('users').distinct('department_id').toQuery()
        );
    });

    // ── WHERE ─────────────────────────────────────────────────────────────

    it('.where (operator, descriptor)', () => {
        expect(
            query(knex, User)
                .where(t => t.fullName, '=', 'Alice')
                .toQuery()
        ).toBe(knex('users').where('full_name', '=', 'Alice').toQuery());
    });

    it('.where (operator, string key)', () => {
        expect(
            query(knex, User).where('fullName', '=', 'Alice').toQuery()
        ).toBe(knex('users').where('full_name', '=', 'Alice').toQuery());
    });

    it('.where (operator, identity column)', () => {
        expect(query(knex, User).where('email', '=', 'a@b.com').toQuery()).toBe(
            knex('users').where('email', '=', 'a@b.com').toQuery()
        );
    });

    it('.where (record)', () => {
        expect(
            query(knex, User)
                .where({ fullName: 'Alice', role: 'admin' })
                .toQuery()
        ).toBe(
            knex('users').where({ full_name: 'Alice', role: 'admin' }).toQuery()
        );
    });

    it('.where (callback)', () => {
        expect(
            query(knex, User)
                .where((b: KnexType.QueryBuilder) => {
                    b.where('role', 'admin');
                })
                .toQuery()
        ).toBe(
            knex('users')
                .where(b => {
                    b.where('role', 'admin');
                })
                .toQuery()
        );
    });

    it('.andWhere (descriptor)', () => {
        expect(
            query(knex, User)
                .where('role', '=', 'admin')
                .andWhere(t => t.departmentId, '>', 5)
                .toQuery()
        ).toBe(
            knex('users')
                .where('role', '=', 'admin')
                .andWhere('department_id', '>', 5)
                .toQuery()
        );
    });

    it('.orWhere (descriptor)', () => {
        expect(
            query(knex, User)
                .where('role', '=', 'admin')
                .orWhere(t => t.role, '=', 'editor')
                .toQuery()
        ).toBe(
            knex('users')
                .where('role', '=', 'admin')
                .orWhere('role', '=', 'editor')
                .toQuery()
        );
    });

    it('.whereNot (descriptor)', () => {
        expect(
            query(knex, User)
                .whereNot(t => t.role, 'banned')
                .toQuery()
        ).toBe(knex('users').whereNot('role', 'banned').toQuery());
    });

    it('.whereNot (string key)', () => {
        expect(query(knex, User).whereNot('departmentId', 99).toQuery()).toBe(
            knex('users').whereNot('department_id', 99).toQuery()
        );
    });

    it('.whereIn (descriptor)', () => {
        expect(
            query(knex, User)
                .whereIn(t => t.role, ['admin', 'editor'])
                .toQuery()
        ).toBe(knex('users').whereIn('role', ['admin', 'editor']).toQuery());
    });

    it('.whereIn (string key, mapped column)', () => {
        expect(
            query(knex, User).whereIn('departmentId', [1, 2, 3]).toQuery()
        ).toBe(knex('users').whereIn('department_id', [1, 2, 3]).toQuery());
    });

    it('.whereNotIn (descriptor)', () => {
        expect(
            query(knex, User)
                .whereNotIn(t => t.role, ['banned'])
                .toQuery()
        ).toBe(knex('users').whereNotIn('role', ['banned']).toQuery());
    });

    it('.whereNull (descriptor)', () => {
        expect(
            query(knex, User)
                .whereNull(t => t.managerId)
                .toQuery()
        ).toBe(knex('users').whereNull('manager_id').toQuery());
    });

    it('.whereNotNull (descriptor)', () => {
        expect(
            query(knex, User)
                .whereNotNull(t => t.managerId)
                .toQuery()
        ).toBe(knex('users').whereNotNull('manager_id').toQuery());
    });

    it('.orWhereNull (descriptor)', () => {
        expect(
            query(knex, User)
                .whereNull(t => t.managerId)
                .orWhereNull(t => t.departmentId)
                .toQuery()
        ).toBe(
            knex('users')
                .whereNull('manager_id')
                .orWhereNull('department_id')
                .toQuery()
        );
    });

    it('.orWhereNotNull (descriptor)', () => {
        expect(
            query(knex, User)
                .whereNull(t => t.managerId)
                .orWhereNotNull(t => t.departmentId)
                .toQuery()
        ).toBe(
            knex('users')
                .whereNull('manager_id')
                .orWhereNotNull('department_id')
                .toQuery()
        );
    });

    it('.whereBetween (descriptor)', () => {
        expect(
            query(knex, User)
                .whereBetween(t => t.departmentId, [1, 10])
                .toQuery()
        ).toBe(knex('users').whereBetween('department_id', [1, 10]).toQuery());
    });

    it('.whereNotBetween (string key)', () => {
        expect(
            query(knex, User)
                .whereNotBetween('departmentId', [20, 30])
                .toQuery()
        ).toBe(
            knex('users').whereNotBetween('department_id', [20, 30]).toQuery()
        );
    });

    it('.whereRaw passthrough', () => {
        expect(
            query(knex, User).whereRaw('full_name ILIKE ?', '%smith%').toQuery()
        ).toBe(
            knex('users').whereRaw('full_name ILIKE ?', '%smith%').toQuery()
        );
    });

    // ── ORDER BY ──────────────────────────────────────────────────────────

    it('.orderBy asc (descriptor)', () => {
        expect(
            query(knex, User)
                .orderBy(t => t.fullName, 'asc')
                .toQuery()
        ).toBe(knex('users').orderBy('full_name', 'asc').toQuery());
    });

    it('.orderBy desc (string key)', () => {
        expect(query(knex, User).orderBy('createdAt', 'desc').toQuery()).toBe(
            knex('users').orderBy('created_at', 'desc').toQuery()
        );
    });

    it('.orderByRaw passthrough', () => {
        expect(
            query(knex, User)
                .orderByRaw('"created_at" DESC NULLS LAST')
                .toQuery()
        ).toBe(
            knex('users').orderByRaw('"created_at" DESC NULLS LAST').toQuery()
        );
    });

    // ── LIMIT / OFFSET ────────────────────────────────────────────────────

    it('.limit', () => {
        expect(query(knex, User).limit(25).toQuery()).toBe(
            knex('users').limit(25).toQuery()
        );
    });

    it('.offset', () => {
        expect(query(knex, User).offset(50).toQuery()).toBe(
            knex('users').offset(50).toQuery()
        );
    });

    it('.limit + .offset', () => {
        expect(query(knex, User).limit(10).offset(20).toQuery()).toBe(
            knex('users').limit(10).offset(20).toQuery()
        );
    });

    // ── GROUP BY / HAVING ─────────────────────────────────────────────────

    it('.groupBy (descriptor)', () => {
        expect(
            query(knex, User)
                .groupBy(t => t.role)
                .toQuery()
        ).toBe(knex('users').groupBy('role').toQuery());
    });

    it('.groupBy (string key, mapped column)', () => {
        expect(query(knex, User).groupBy('departmentId').toQuery()).toBe(
            knex('users').groupBy('department_id').toQuery()
        );
    });

    it('.groupBy multiple columns', () => {
        expect(
            query(knex, User).groupBy('role', 'departmentId').toQuery()
        ).toBe(knex('users').groupBy('role', 'department_id').toQuery());
    });

    it('.groupByRaw passthrough', () => {
        expect(query(knex, User).groupByRaw('"role"').toQuery()).toBe(
            knex('users').groupByRaw('"role"').toQuery()
        );
    });

    it('.having (string key)', () => {
        expect(
            query(knex, User)
                .groupBy('role')
                .having('role', '!=', 'banned')
                .toQuery()
        ).toBe(
            knex('users')
                .groupBy('role')
                .having('role', '!=', 'banned')
                .toQuery()
        );
    });

    it('.havingRaw passthrough', () => {
        expect(
            query(knex, User)
                .groupBy('role')
                .havingRaw('count(*) > 5')
                .toQuery()
        ).toBe(
            knex('users').groupBy('role').havingRaw('count(*) > 5').toQuery()
        );
    });

    // ── AGGREGATES ────────────────────────────────────────────────────────

    it('.count()', () => {
        expect(query(knex, User).count().toQuery()).toBe(
            knex('users').count().toQuery()
        );
    });

    it('.count(column, descriptor)', () => {
        expect(
            query(knex, User)
                .count(t => t.id)
                .toQuery()
        ).toBe(knex('users').count('id').toQuery());
    });

    it('.countDistinct(column, descriptor)', () => {
        expect(
            query(knex, User)
                .countDistinct(t => t.departmentId)
                .toQuery()
        ).toBe(knex('users').countDistinct('department_id').toQuery());
    });

    it('.min (descriptor)', () => {
        expect(
            query(knex, User)
                .min(t => t.createdAt)
                .toQuery()
        ).toBe(knex('users').min('created_at').toQuery());
    });

    it('.max (descriptor)', () => {
        expect(
            query(knex, User)
                .max(t => t.createdAt)
                .toQuery()
        ).toBe(knex('users').max('created_at').toQuery());
    });

    it('.sum (string key)', () => {
        expect(query(knex, User).sum('departmentId').toQuery()).toBe(
            knex('users').sum('department_id').toQuery()
        );
    });

    it('.avg (string key)', () => {
        expect(query(knex, User).avg('departmentId').toQuery()).toBe(
            knex('users').avg('department_id').toQuery()
        );
    });

    // ── COMBINED ──────────────────────────────────────────────────────────

    it('combined: SELECT + WHERE + ORDER BY + LIMIT + OFFSET', () => {
        expect(
            query(knex, User)
                .select(
                    t => t.fullName,
                    t => t.email,
                    t => t.role
                )
                .where(t => t.role, '=', 'admin')
                .andWhere(t => t.departmentId, '>', 5)
                .orderBy(t => t.fullName, 'asc')
                .limit(20)
                .offset(40)
                .toQuery()
        ).toBe(
            knex('users')
                .select('full_name', 'email', 'role')
                .where('role', '=', 'admin')
                .andWhere('department_id', '>', 5)
                .orderBy('full_name', 'asc')
                .limit(20)
                .offset(40)
                .toQuery()
        );
    });

    it('combined: WHERE complex + GROUP BY + HAVING', () => {
        expect(
            query(knex, User)
                .select(t => t.role)
                .whereIn(t => t.role, ['admin', 'editor'])
                .groupBy(t => t.role)
                .having('role', '!=', 'banned')
                .toQuery()
        ).toBe(
            knex('users')
                .select('role')
                .whereIn('role', ['admin', 'editor'])
                .groupBy('role')
                .having('role', '!=', 'banned')
                .toQuery()
        );
    });

    // ── knex.raw() as column argument ──────────────────────────────────────
    describe('knex.raw() as column argument', () => {
        it('.where(knex.raw()) — raw as full WHERE expression', () => {
            expect(
                query(knex, User)
                    .where(knex.raw('status = ?', ['active']))
                    .toQuery()
            ).toBe(
                knex('users')
                    .where(knex.raw('status = ?', ['active']))
                    .toQuery()
            );
        });

        it('.where(knex.raw(), operator, value) — raw as LHS column', () => {
            expect(
                query(knex, User)
                    .where(knex.raw('"full_name"'), '=', 'Alice')
                    .toQuery()
            ).toBe(
                knex('users')
                    .where(knex.raw('"full_name"'), '=', 'Alice')
                    .toQuery()
            );
        });

        it('.andWhere(knex.raw())', () => {
            expect(
                query(knex, User)
                    .where('role', '=', 'admin')
                    .andWhere(knex.raw('deleted_at IS NULL'))
                    .toQuery()
            ).toBe(
                knex('users')
                    .where('role', '=', 'admin')
                    .andWhere(knex.raw('deleted_at IS NULL'))
                    .toQuery()
            );
        });

        it('.orWhere(knex.raw())', () => {
            expect(
                query(knex, User)
                    .where('role', '=', 'admin')
                    .orWhere(knex.raw('role = ?', ['superuser']))
                    .toQuery()
            ).toBe(
                knex('users')
                    .where('role', '=', 'admin')
                    .orWhere(knex.raw('role = ?', ['superuser']))
                    .toQuery()
            );
        });

        it('.whereNot(knex.raw())', () => {
            expect(
                query(knex, User)
                    .whereNot(knex.raw('deleted_at IS NULL'))
                    .toQuery()
            ).toBe(
                knex('users').whereNot(knex.raw('deleted_at IS NULL')).toQuery()
            );
        });

        it('.select(knex.raw()) — computed expression', () => {
            expect(
                query(knex, User)
                    .select(knex.raw('count(*) as total'))
                    .toQuery()
            ).toBe(
                knex('users').select(knex.raw('count(*) as total')).toQuery()
            );
        });

        it('.select() mixing schema column and knex.raw()', () => {
            expect(
                query(knex, User)
                    .select(t => t.role, knex.raw('count(*) as total'))
                    .toQuery()
            ).toBe(
                knex('users')
                    .select('role', knex.raw('count(*) as total'))
                    .toQuery()
            );
        });

        it('.distinct(knex.raw())', () => {
            expect(
                query(knex, User).distinct(knex.raw('"role"')).toQuery()
            ).toBe(knex('users').distinct(knex.raw('"role"')).toQuery());
        });

        it('.orderBy(knex.raw())', () => {
            expect(
                query(knex, User)
                    .orderBy(knex.raw('"created_at" DESC NULLS LAST'))
                    .toQuery()
            ).toBe(
                knex('users')
                    .orderBy(knex.raw('"created_at" DESC NULLS LAST'))
                    .toQuery()
            );
        });

        it('.groupBy(knex.raw())', () => {
            expect(
                query(knex, User)
                    .groupBy(knex.raw("date_trunc('day', created_at)"))
                    .toQuery()
            ).toBe(
                knex('users')
                    .groupBy(knex.raw("date_trunc('day', created_at)"))
                    .toQuery()
            );
        });

        it('.groupBy() mixing schema column and knex.raw()', () => {
            expect(
                query(knex, User)
                    .groupBy(
                        t => t.role,
                        knex.raw("date_trunc('day', created_at)")
                    )
                    .toQuery()
            ).toBe(
                knex('users')
                    .groupBy('role', knex.raw("date_trunc('day', created_at)"))
                    .toQuery()
            );
        });

        it('.having(knex.raw(), operator, value)', () => {
            expect(
                query(knex, User)
                    .groupBy(t => t.role)
                    .having(knex.raw('count(*)'), '>', 5)
                    .toQuery()
            ).toBe(
                knex('users')
                    .groupBy('role')
                    .having(knex.raw('count(*)'), '>', 5)
                    .toQuery()
            );
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// createQuery factory
// ═══════════════════════════════════════════════════════════════════════════

import { type BoundQuery, createQuery } from './index.js';

describe('createQuery factory', () => {
    const q = createQuery(knex);

    it('produces same SQL as query(knex, schema) for SELECT *', () => {
        expect(q(User).toQuery()).toBe(query(knex, User).toQuery());
    });

    it('produces same SQL for WHERE via descriptor', () => {
        expect(
            q(User)
                .where(t => t.fullName, '=', 'Alice')
                .toQuery()
        ).toBe(
            query(knex, User)
                .where(t => t.fullName, '=', 'Alice')
                .toQuery()
        );
    });

    it('produces same SQL for chained WHERE + ORDER BY + LIMIT', () => {
        expect(
            q(User)
                .where(t => t.role, '=', 'admin')
                .orderBy(t => t.createdAt, 'desc')
                .limit(10)
                .toQuery()
        ).toBe(
            query(knex, User)
                .where(t => t.role, '=', 'admin')
                .orderBy(t => t.createdAt, 'desc')
                .limit(10)
                .toQuery()
        );
    });

    it('the baseQuery overload works', () => {
        const base1 = knex('users').where('deleted_at', null);
        const base2 = knex('users').where('deleted_at', null);
        expect(
            q(User, base1)
                .where(t => t.role, '=', 'admin')
                .toQuery()
        ).toBe(
            query(knex, User, base2)
                .where(t => t.role, '=', 'admin')
                .toQuery()
        );
    });

    it('works with joinOne', () => {
        expect(
            q(User)
                .joinOne({
                    localColumn: t => t.departmentId,
                    foreignColumn: t => t.id,
                    as: 'department',
                    foreignSchema: Department
                })
                .toQuery()
        ).toBe(
            query(knex, User)
                .joinOne({
                    localColumn: t => t.departmentId,
                    foreignColumn: t => t.id,
                    as: 'department',
                    foreignSchema: Department
                })
                .toQuery()
        );
    });

    it('works with joinMany', () => {
        expect(
            q(User)
                .joinMany({
                    localColumn: t => t.id,
                    foreignColumn: t => t.authorId,
                    as: 'posts',
                    foreignSchema: Post
                })
                .toQuery()
        ).toBe(
            query(knex, User)
                .joinMany({
                    localColumn: t => t.id,
                    foreignColumn: t => t.authorId,
                    as: 'posts',
                    foreignSchema: Post
                })
                .toQuery()
        );
    });

    it('two independent factories from different knex instances do not share state', () => {
        const knex2 = Knex({ client: 'pg' });
        const q2 = createQuery(knex2);
        // Both produce the same SQL — knex client config doesn't affect SQL
        // generation without a real connection, but they must be independent objects
        expect(q(User)).not.toBe(q2(User));
        expect(q(User).toQuery()).toBe(q2(User).toQuery());
        knex2.destroy();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Transaction support
// ═══════════════════════════════════════════════════════════════════════════

describe('transaction support', () => {
    // Use the knex instance itself as a stand-in for a Knex.Transaction.
    // Knex.Transaction extends Knex, so the cast is structurally valid.
    // transacting() only binds the connection client — it does not alter
    // the generated SQL, so toQuery() remains testable without a real DB.
    const trx = knex as unknown as KnexType.Transaction;

    describe('SchemaQueryBuilder.transacting()', () => {
        it('returns a SchemaQueryBuilder instance', () => {
            const builder = query(knex, User).transacting(trx);
            expect(builder).toBeInstanceOf(SchemaQueryBuilder);
        });

        it('does not mutate the original builder', () => {
            const original = query(knex, User).where(t => t.role, '=', 'admin');
            const bound = original.transacting(trx);
            expect(bound).not.toBe(original);
        });

        it('preserves WHERE clauses after transacting()', () => {
            const sql = query(knex, User)
                .where(t => t.role, '=', 'admin')
                .transacting(trx)
                .toQuery();
            expect(sql).toContain('"role" = \'admin\'');
        });

        it('preserves ORDER BY after transacting()', () => {
            const sql = query(knex, User)
                .orderBy(t => t.createdAt, 'desc')
                .transacting(trx)
                .toQuery();
            expect(sql).toContain('order by "created_at" desc');
        });

        it('preserves LIMIT / OFFSET after transacting()', () => {
            const sql = query(knex, User)
                .limit(10)
                .offset(5)
                .transacting(trx)
                .toQuery();
            expect(sql).toContain('limit 10');
            expect(sql).toContain('offset 5');
        });

        it('transacting() after joinOne preserves CTE structure', () => {
            const sql = query(knex, User)
                .joinOne({
                    localColumn: t => t.departmentId,
                    foreignColumn: t => t.id,
                    as: 'department',
                    foreignSchema: Department
                })
                .transacting(trx)
                .toQuery();

            expect(sql).toContain('with "originalQuery" as');
            expect(sql).toContain('"departments"');
            expect(sql).toContain('jsonb_agg');
            expect(sql).toContain('"department"');
        });

        it('transacting() after joinMany preserves CTE structure', () => {
            const sql = query(knex, User)
                .joinMany({
                    localColumn: t => t.id,
                    foreignColumn: t => t.authorId,
                    as: 'posts',
                    foreignSchema: Post
                })
                .transacting(trx)
                .toQuery();

            expect(sql).toContain('with "originalQuery" as');
            expect(sql).toContain('"posts"');
            expect(sql).toContain('jsonb_agg');
            expect(sql).toContain('coalesce');
        });

        it('produces same SQL as non-transacting version', () => {
            const plain = query(knex, User)
                .where(t => t.departmentId, '>', 3)
                .orderBy(t => t.fullName)
                .toQuery();

            const transacted = query(knex, User)
                .where(t => t.departmentId, '>', 3)
                .orderBy(t => t.fullName)
                .transacting(trx)
                .toQuery();

            expect(transacted).toBe(plain);
        });

        it('transacting() can be called before building the query chain', () => {
            const sql = query(knex, User)
                .transacting(trx)
                .where(t => t.role, '=', 'editor')
                .limit(20)
                .toQuery();

            expect(sql).toContain('"role" = \'editor\'');
            expect(sql).toContain('limit 20');
        });
    });

    describe('BoundQuery.withTransaction()', () => {
        const db = createQuery(knex);

        it('withTransaction() returns a BoundQuery', () => {
            const dbTrx = db.withTransaction(trx);
            expect(typeof dbTrx).toBe('function');
            expect(typeof dbTrx.withTransaction).toBe('function');
        });

        it('withTransaction() factory produces same SQL as query(trx, schema)', () => {
            const dbTrx = db.withTransaction(trx);
            expect(dbTrx(User).toQuery()).toBe(query(knex, User).toQuery());
        });

        it('withTransaction() factory supports chaining', () => {
            const dbTrx = db.withTransaction(trx);
            const sql = dbTrx(User)
                .where(t => t.role, '=', 'admin')
                .orderBy(t => t.createdAt, 'desc')
                .limit(5)
                .toQuery();

            expect(sql).toContain('"role" = \'admin\'');
            expect(sql).toContain('order by "created_at" desc');
            expect(sql).toContain('limit 5');
        });

        it('withTransaction() does not affect the original bound factory', () => {
            const plainSql = db(User).toQuery();
            db.withTransaction(trx); // should not mutate db
            expect(db(User).toQuery()).toBe(plainSql);
        });

        it('withTransaction() supports joinOne', () => {
            const dbTrx = db.withTransaction(trx);
            const sql = dbTrx(User)
                .joinOne({
                    localColumn: t => t.departmentId,
                    foreignColumn: t => t.id,
                    as: 'department',
                    foreignSchema: Department
                })
                .toQuery();

            expect(sql).toContain('"departments"');
            expect(sql).toContain('"department"');
        });
    });

    describe('BoundQuery.transaction() callback', () => {
        it('transaction() is a function on the bound factory', () => {
            const db = createQuery(knex);
            expect(typeof db.transaction).toBe('function');
        });

        it('transaction() passes a BoundQuery to the callback', async () => {
            const db = createQuery(knex);
            let capturedDb: BoundQuery | undefined;

            const spy = vi
                .spyOn(knex, 'transaction')
                .mockImplementation((cb: any) => cb(trx));

            try {
                await db.transaction(async dbTrx => {
                    capturedDb = dbTrx;
                });
            } finally {
                spy.mockRestore();
            }

            expect(typeof capturedDb).toBe('function');
            expect(typeof (capturedDb as BoundQuery).withTransaction).toBe(
                'function'
            );
            expect(typeof (capturedDb as BoundQuery).transaction).toBe(
                'function'
            );
        });

        it('transaction() resolves with the callback return value', async () => {
            const db = createQuery(knex);
            const spy = vi
                .spyOn(knex, 'transaction')
                .mockImplementation((cb: any) => cb(trx));

            const result = await db.transaction(async _dbTrx => 42);
            spy.mockRestore();

            expect(result).toBe(42);
        });

        it('transaction() callback receives a factory whose queries share the trx schema', async () => {
            const db = createQuery(knex);
            const spy = vi
                .spyOn(knex, 'transaction')
                .mockImplementation((cb: any) => cb(trx));

            let sql = '';
            await db.transaction(async dbTrx => {
                sql = dbTrx(User)
                    .where(t => t.role, '=', 'admin')
                    .toQuery();
            });
            spy.mockRestore();

            expect(sql).toContain('"role" = \'admin\'');
        });
    });
});
