/**
 * @cleverbrush/knex-eager — Examples / Showcase
 *
 * A realistic multi-table blog platform database that demonstrates:
 * - Schema definitions with @cleverbrush/schema
 * - Strongly-typed eager loading via withRelations / joinOne / joinMany
 * - SQL snapshot verification via .toQuery()
 * - IDE intellisense validation (hover types, autocompletion)
 *
 * Database model (5 tables):
 *   users (id, name, email, role, department_id, manager_id)
 *   departments (id, name, budget)
 *   posts (id, title, body, author_id, category_id, created_at)
 *   categories (id, name, slug)
 *   comments (id, post_id, user_id, text, created_at)
 */

import type { InferType } from '@cleverbrush/schema';
import { date, number, object, string } from '@cleverbrush/schema';
import Knex from 'knex';
import { describe, expect, it } from 'vitest';
import { withRelations } from './RelationBuilder.js';

// ---------------------------------------------------------------------------
// Schema definitions — one per table
// ---------------------------------------------------------------------------

const departmentSchema = object({
    id: number(),
    name: string(),
    budget: number()
});

const userSchema = object({
    id: number(),
    name: string(),
    email: string(),
    role: string(),
    department_id: number(),
    manager_id: number().optional()
});

const categorySchema = object({
    id: number(),
    name: string(),
    slug: string()
});

const postSchema = object({
    id: number(),
    title: string(),
    body: string(),
    author_id: number(),
    category_id: number(),
    created_at: date()
});

const commentSchema = object({
    id: number(),
    post_id: number(),
    user_id: number(),
    text: string(),
    created_at: date()
});

// ---------------------------------------------------------------------------
// Knex instance (pg client, no actual connection needed for .toQuery())
// ---------------------------------------------------------------------------
const knex = Knex({ client: 'pg' });

// ---------------------------------------------------------------------------
// Examples
// ---------------------------------------------------------------------------

describe('@cleverbrush/knex-eager examples', () => {
    // -----------------------------------------------------------------------
    // 1. Simple joinOne — users with department (N:1, required)
    // -----------------------------------------------------------------------
    it('simple joinOne: users with required department', () => {
        const query = withRelations(knex, 'users', userSchema).joinOne({
            localColumn: 'department_id',
            foreignColumn: 'id',
            as: 'department',
            required: true,
            foreignQuery: knex('departments'),
            foreignSchema: departmentSchema
        });

        const sql = query.toQuery();

        // IDE VALIDATION:
        // Hover over `query` — type should be:
        //   RelationBuilder<typeof userSchema, InferType<typeof userSchema> & { department: InferType<typeof departmentSchema> }>
        // Hover over result of `query.execute()` — should be Promise of array with `department` field

        // SQL assertions
        expect(sql).toContain('originalQuery');
        expect(sql).not.toContain('originalQueryIdentity');
        expect(sql).not.toContain('row_number() over ()');
        expect(sql).toContain('jsonb_agg');
        expect(sql).toContain('"eagerRelation0"');
        // Required joinOne uses INNER JOIN
        expect(sql).toContain('inner join');
    });

    // -----------------------------------------------------------------------
    // 2. Simple joinMany — users with posts (1:N)
    // -----------------------------------------------------------------------
    it('simple joinMany: users with posts', () => {
        const query = withRelations(knex, 'users', userSchema).joinMany({
            localColumn: 'id',
            foreignColumn: 'author_id',
            as: 'posts',
            foreignQuery: knex('posts'),
            foreignSchema: postSchema
        });

        const sql = query.toQuery();

        // IDE VALIDATION:
        // Hover over result type — should include { posts: InferType<typeof postSchema>[] }

        expect(sql).toContain('originalQuery');
        expect(sql).toContain('jsonb_agg');
        expect(sql).toContain('withFilter0');
        expect(sql).toContain('coalesce(');
    });

    // -----------------------------------------------------------------------
    // 3. Multiple joins — users with department + posts
    // -----------------------------------------------------------------------
    it('multiple joins: users with department and posts', () => {
        const query = withRelations(knex, 'users', userSchema)
            .joinOne({
                localColumn: 'department_id',
                foreignColumn: 'id',
                as: 'department',
                required: true,
                foreignQuery: knex('departments'),
                foreignSchema: departmentSchema
            })
            .joinMany({
                localColumn: 'id',
                foreignColumn: 'author_id',
                as: 'posts',
                foreignQuery: knex('posts'),
                foreignSchema: postSchema
            });

        const sql = query.toQuery();

        // IDE VALIDATION:
        // The result type should accumulate both fields:
        //   InferType<typeof userSchema> & { department: ... } & { posts: ...[] }

        // Both relations should appear in the SQL
        expect(sql).toContain('"eagerRelation0"');
        expect(sql).toContain('"eagerRelation1"');
        expect(sql).toContain('withFilter1');
        expect(sql).not.toContain('originalQueryIdentity');
    });

    // -----------------------------------------------------------------------
    // 4. Nested eager loading — posts with category + comments (limited)
    // -----------------------------------------------------------------------
    it('nested: posts with category and limited comments', () => {
        const query = withRelations(knex, 'posts', postSchema)
            .joinOne({
                localColumn: 'category_id',
                foreignColumn: 'id',
                as: 'category',
                required: false,
                foreignQuery: knex('categories'),
                foreignSchema: categorySchema
            })
            .joinMany({
                localColumn: 'id',
                foreignColumn: 'post_id',
                as: 'comments',
                foreignQuery: knex('comments'),
                foreignSchema: commentSchema,
                limit: 5,
                orderBy: { column: 'created_at', direction: 'desc' }
            });

        const sql = query.toQuery();

        // IDE VALIDATION:
        // Result type:
        //   InferType<typeof postSchema> & { category: InferType<typeof categorySchema> | null } & { comments: InferType<typeof commentSchema>[] }
        // `category` is nullable because required: false

        // Optional joinOne uses LEFT JOIN
        expect(sql).toContain('left join');
        // Limit should produce __rn__ filtering
        expect(sql).toContain('"__rn__" <= 5');
    });

    // -----------------------------------------------------------------------
    // 5. Optional joinOne — users with optional manager (self-reference)
    // -----------------------------------------------------------------------
    it('optional joinOne: users with nullable manager', () => {
        const query = withRelations(knex, 'users', userSchema).joinOne({
            localColumn: 'manager_id',
            foreignColumn: 'id',
            as: 'manager',
            required: false,
            foreignQuery: knex('users'),
            foreignSchema: userSchema
        });

        const sql = query.toQuery();

        // IDE VALIDATION:
        // Hover: `manager` field is `InferType<typeof userSchema> | null` (not required)

        expect(sql).toContain('left join');
    });

    // -----------------------------------------------------------------------
    // 6. joinMany with offset/limit — paginated posts
    // -----------------------------------------------------------------------
    it('joinMany with offset and limit: paginated posts', () => {
        const query = withRelations(knex, 'users', userSchema).joinMany({
            localColumn: 'id',
            foreignColumn: 'author_id',
            as: 'posts',
            foreignQuery: knex('posts'),
            foreignSchema: postSchema,
            offset: 10,
            limit: 5,
            orderBy: { column: 'created_at', direction: 'asc' }
        });

        const sql = query.toQuery();

        // Offset + limit should produce: __rn__ > 10 AND __rn__ <= 15
        expect(sql).toContain('"__rn__" > 10');
        expect(sql).toContain('"__rn__" <= 15');
    });

    // -----------------------------------------------------------------------
    // 7. Type error cases (uncomment to verify TS errors in IDE)
    // -----------------------------------------------------------------------
    it('type safety demonstration', () => {
        // These are compile-time checks — uncomment any line to see TS errors:

        // ERROR: 'nonexistent' is not assignable to keyof InferType<typeof userSchema>
        // withRelations(knex, 'users', userSchema)
        //     .joinOne({
        //         localColumn: 'nonexistent',
        //         foreignColumn: 'id',
        //         as: 'dept',
        //         foreignQuery: knex('departments'),
        //         foreignSchema: departmentSchema
        //     });

        // ERROR: 'wrong_col' is not assignable to keyof InferType<typeof departmentSchema>
        // withRelations(knex, 'users', userSchema)
        //     .joinOne({
        //         localColumn: 'department_id',
        //         foreignColumn: 'wrong_col',
        //         as: 'dept',
        //         foreignQuery: knex('departments'),
        //         foreignSchema: departmentSchema
        //     });

        // This should work fine (verifies the test is valid)
        const query = withRelations(knex, 'users', userSchema).joinOne({
            localColumn: 'department_id',
            foreignColumn: 'id',
            as: 'dept',
            foreignQuery: knex('departments'),
            foreignSchema: departmentSchema
        });

        expect(query.toQuery()).toBeTruthy();
    });
});

// ---------------------------------------------------------------------------
// Type-level tests (these compile-time checks run as part of vitest typecheck)
// ---------------------------------------------------------------------------
describe('type-level checks', () => {
    it('joinOne required => non-nullable field', () => {
        const builder = withRelations(knex, 'users', userSchema).joinOne({
            localColumn: 'department_id',
            foreignColumn: 'id',
            as: 'department',
            required: true,
            foreignQuery: knex('departments'),
            foreignSchema: departmentSchema
        });

        // Type assertion: execute() returns array with non-nullable `department`
        type R = Awaited<ReturnType<typeof builder.execute>>[number];
        const _check: R = {} as InferType<typeof userSchema> & {
            department: InferType<typeof departmentSchema>;
        };
    });

    it('joinOne optional => nullable field', () => {
        const builder = withRelations(knex, 'users', userSchema).joinOne({
            localColumn: 'manager_id',
            foreignColumn: 'id',
            as: 'manager',
            required: false,
            foreignQuery: knex('users'),
            foreignSchema: userSchema
        });

        // Type assertion: execute() returns array with nullable `manager`
        type R = Awaited<ReturnType<typeof builder.execute>>[number];
        const _check: R = {} as InferType<typeof userSchema> & {
            manager: InferType<typeof userSchema> | null;
        };
    });

    it('joinMany => array field', () => {
        const builder = withRelations(knex, 'users', userSchema).joinMany({
            localColumn: 'id',
            foreignColumn: 'author_id',
            as: 'posts',
            foreignQuery: knex('posts'),
            foreignSchema: postSchema
        });

        // Type assertion: execute() returns array with `posts` as array
        type R = Awaited<ReturnType<typeof builder.execute>>[number];
        const _check: R = {} as InferType<typeof userSchema> & {
            posts: InferType<typeof postSchema>[];
        };
    });

    it('chained joins accumulate types', () => {
        const builder = withRelations(knex, 'users', userSchema)
            .joinOne({
                localColumn: 'department_id',
                foreignColumn: 'id',
                as: 'department',
                required: true,
                foreignQuery: knex('departments'),
                foreignSchema: departmentSchema
            })
            .joinMany({
                localColumn: 'id',
                foreignColumn: 'author_id',
                as: 'posts',
                foreignQuery: knex('posts'),
                foreignSchema: postSchema
            });

        type R = Awaited<ReturnType<typeof builder.execute>>[number];
        const _check: R = {} as InferType<typeof userSchema> & {
            department: InferType<typeof departmentSchema>;
        } & {
            posts: InferType<typeof postSchema>[];
        };
    });
});

// ---------------------------------------------------------------------------
// Chained Knex methods — verify forwarded methods appear in SQL
// ---------------------------------------------------------------------------
describe('chained Knex methods', () => {
    it('where() applies to the base query', () => {
        const query = withRelations(knex, 'users', userSchema)
            .where('role', 'admin')
            .joinOne({
                localColumn: 'department_id',
                foreignColumn: 'id',
                as: 'department',
                required: true,
                foreignQuery: knex('departments'),
                foreignSchema: departmentSchema
            });

        const sql = query.toQuery();
        expect(sql).toContain('"role" = \'admin\'');
        expect(sql).toContain('originalQuery');
    });

    it('orderBy() applies to the base query', () => {
        const query = withRelations(knex, 'users', userSchema)
            .joinMany({
                localColumn: 'id',
                foreignColumn: 'author_id',
                as: 'posts',
                foreignQuery: knex('posts'),
                foreignSchema: postSchema
            })
            .orderBy('name', 'desc');

        const sql = query.toQuery();
        expect(sql).toContain('"name" desc');
    });

    it('limit() and offset() apply to the base query', () => {
        const query = withRelations(knex, 'users', userSchema)
            .joinOne({
                localColumn: 'department_id',
                foreignColumn: 'id',
                as: 'department',
                required: true,
                foreignQuery: knex('departments'),
                foreignSchema: departmentSchema
            })
            .limit(10)
            .offset(20);

        const sql = query.toQuery();
        expect(sql).toContain('limit 10');
        expect(sql).toContain('offset 20');
    });

    it('whereIn() applies to the base query', () => {
        const query = withRelations(knex, 'users', userSchema)
            .whereIn('role', ['admin', 'editor'])
            .joinOne({
                localColumn: 'department_id',
                foreignColumn: 'id',
                as: 'department',
                required: true,
                foreignQuery: knex('departments'),
                foreignSchema: departmentSchema
            });

        const sql = query.toQuery();
        expect(sql).toContain("\"role\" in ('admin', 'editor')");
    });

    it('methods can be chained in any order with joins', () => {
        const query = withRelations(knex, 'users', userSchema)
            .where('role', 'admin')
            .joinOne({
                localColumn: 'department_id',
                foreignColumn: 'id',
                as: 'department',
                required: true,
                foreignQuery: knex('departments'),
                foreignSchema: departmentSchema
            })
            .orderBy('name')
            .joinMany({
                localColumn: 'id',
                foreignColumn: 'author_id',
                as: 'posts',
                foreignQuery: knex('posts'),
                foreignSchema: postSchema
            })
            .limit(50);

        const sql = query.toQuery();
        expect(sql).toContain('"role" = \'admin\'');
        expect(sql).toContain('"name" asc');
        expect(sql).toContain('limit 50');
        expect(sql).toContain('"eagerRelation0"');
        expect(sql).toContain('"eagerRelation1"');
    });

    it('apply() escape hatch forwards to the internal builder', () => {
        const query = withRelations(knex, 'users', userSchema)
            .apply(qb => qb.whereRaw('"age" > ?', [18]))
            .joinOne({
                localColumn: 'department_id',
                foreignColumn: 'id',
                as: 'department',
                required: true,
                foreignQuery: knex('departments'),
                foreignSchema: departmentSchema
            });

        const sql = query.toQuery();
        expect(sql).toContain('"age" > 18');
    });

    it('withRelations accepts a pre-built query', () => {
        const query = withRelations(
            knex,
            knex('users').where('active', true),
            userSchema
        ).joinOne({
            localColumn: 'department_id',
            foreignColumn: 'id',
            as: 'department',
            required: true,
            foreignQuery: knex('departments'),
            foreignSchema: departmentSchema
        });

        const sql = query.toQuery();
        expect(sql).toContain('"active" = true');
    });

    it('multiple joinOne calls to different tables', () => {
        const query = withRelations(knex, 'users', userSchema)
            .joinOne({
                localColumn: 'department_id',
                foreignColumn: 'id',
                as: 'department',
                required: true,
                foreignQuery: knex('departments'),
                foreignSchema: departmentSchema
            })
            .joinOne({
                localColumn: 'manager_id',
                foreignColumn: 'id',
                as: 'manager',
                required: false,
                foreignQuery: knex('users'),
                foreignSchema: userSchema
            });

        const sql = query.toQuery();
        // Both relations appear with unique aliases
        expect(sql).toContain('"eagerRelation0"');
        expect(sql).toContain('"eagerRelation1"');
        // Required uses inner join, optional uses left join
        expect(sql).toContain('inner join');
        expect(sql).toContain('left join');
    });

    it('three joins: two joinOne + one joinMany', () => {
        const query = withRelations(knex, 'posts', postSchema)
            .joinOne({
                localColumn: 'author_id',
                foreignColumn: 'id',
                as: 'author',
                required: true,
                foreignQuery: knex('users'),
                foreignSchema: userSchema
            })
            .joinOne({
                localColumn: 'category_id',
                foreignColumn: 'id',
                as: 'category',
                required: false,
                foreignQuery: knex('categories'),
                foreignSchema: categorySchema
            })
            .joinMany({
                localColumn: 'id',
                foreignColumn: 'post_id',
                as: 'comments',
                foreignQuery: knex('comments'),
                foreignSchema: commentSchema,
                limit: 10
            });

        const sql = query.toQuery();
        expect(sql).toContain('"eagerRelation0"');
        expect(sql).toContain('"eagerRelation1"');
        expect(sql).toContain('"eagerRelation2"');
        expect(sql).toContain('withFilter2');
    });

    it('joinOne with property descriptor accessors', () => {
        const query = withRelations(knex, 'users', userSchema).joinOne({
            localColumn: t => t.department_id,
            foreignColumn: t => t.id,
            as: 'department',
            required: true,
            foreignQuery: knex('departments'),
            foreignSchema: departmentSchema
        });

        const sql = query.toQuery();
        // accessor resolves to the same SQL as string columns
        expect(sql).toContain('"department_id"');
        expect(sql).toContain('jsonb_agg');
        expect(sql).toContain('inner join');
    });

    it('joinMany with mixed string and accessor columns', () => {
        const query = withRelations(knex, 'users', userSchema).joinMany({
            localColumn: t => t.id,
            foreignColumn: 'author_id',
            as: 'posts',
            foreignQuery: knex('posts'),
            foreignSchema: postSchema,
            orderBy: { column: t => t.created_at, direction: 'desc' }
        });

        const sql = query.toQuery();
        expect(sql).toContain('originalQuery');
        expect(sql).toContain('jsonb_agg');
        expect(sql).toContain('withFilter0');
    });
});
