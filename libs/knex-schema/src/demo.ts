// @cleverbrush/knex-schema — Interactive demonstrator
// Run: npx tsx libs/knex-schema/src/demo.ts

import Knex from 'knex';
import { createQuery, date, number, object, query, string } from './index.js';

// ═══════════════════════════════════════════════════════════════════════════
// Schema definitions
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

// ═══════════════════════════════════════════════════════════════════════════
// Knex instance (no real connection, just for SQL generation)
// ═══════════════════════════════════════════════════════════════════════════

const knex = Knex({ client: 'pg' });

// ═══════════════════════════════════════════════════════════════════════════
// Helper
// ═══════════════════════════════════════════════════════════════════════════

function show(label: string, sql: string) {
    console.log(
        `\n\x1b[36m── ${label} ${'─'.repeat(60 - label.length)}\x1b[0m`
    );
    console.log(sql);
}

// ═══════════════════════════════════════════════════════════════════════════
// createQuery — bind knex once, use schema directly
// ═══════════════════════════════════════════════════════════════════════════

const q = createQuery(knex);

show('createQuery: SELECT *', q(User).toQuery());

show(
    'createQuery: WHERE via property descriptor',
    q(User)
        .where(t => t.fullName, '=', 'Alice')
        .toQuery()
);

show(
    'createQuery: joinOne',
    q(User)
        .joinOne({
            localColumn: t => t.departmentId,
            foreignColumn: t => t.id,
            as: 'department',
            foreignSchema: Department
        })
        .toQuery()
);

show(
    'createQuery: baseQuery overload (soft-delete scope)',
    q(User, knex('users').where('deleted_at', null))
        .where(t => t.role, '=', 'admin')
        .toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 1. Basic SELECT
// ═══════════════════════════════════════════════════════════════════════════

show('SELECT * (all users)', query(knex, User).toQuery());

// ═══════════════════════════════════════════════════════════════════════════
// 2. WHERE with property descriptor accessor
// ═══════════════════════════════════════════════════════════════════════════

show(
    'WHERE via property descriptor',
    query(knex, User)
        .where(t => t.fullName, '=', 'Alice')
        .toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 3. WHERE with string key
// ═══════════════════════════════════════════════════════════════════════════

show(
    'WHERE via string key',
    query(knex, User).where('fullName', '=', 'Alice').toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 4. WHERE with record syntax
// ═══════════════════════════════════════════════════════════════════════════

show(
    'WHERE via record { key: value }',
    query(knex, User).where({ fullName: 'Alice', role: 'admin' }).toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 5. Complex chained query
// ═══════════════════════════════════════════════════════════════════════════

show(
    'Complex chained query',
    query(knex, User)
        .where(t => t.role, '=', 'admin')
        .andWhere(t => t.departmentId, '>', 5)
        .whereNotNull(t => t.managerId)
        .orderBy(t => t.fullName, 'asc')
        .limit(50)
        .offset(100)
        .toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 6. whereIn / whereNull / whereBetween
// ═══════════════════════════════════════════════════════════════════════════

show(
    'whereIn',
    query(knex, User)
        .whereIn(t => t.role, ['admin', 'editor'])
        .toQuery()
);

show(
    'whereNull',
    query(knex, User)
        .whereNull(t => t.managerId)
        .toQuery()
);

show(
    'whereBetween',
    query(knex, User)
        .whereBetween(t => t.departmentId, [1, 10])
        .toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 7. SELECT specific columns
// ═══════════════════════════════════════════════════════════════════════════

show(
    'SELECT specific columns',
    query(knex, User)
        .select(
            t => t.fullName,
            t => t.email
        )
        .toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 8. DISTINCT
// ═══════════════════════════════════════════════════════════════════════════

show(
    'DISTINCT',
    query(knex, User)
        .distinct(t => t.role)
        .toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 9. GROUP BY + HAVING
// ═══════════════════════════════════════════════════════════════════════════

show(
    'GROUP BY + HAVING',
    query(knex, User)
        .select(t => t.role)
        .groupBy(t => t.role)
        .having(t => t.role, '!=', 'banned')
        .toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 10. Aggregates
// ═══════════════════════════════════════════════════════════════════════════

show('COUNT', query(knex, User).count().toQuery());

show(
    'MAX (created_at)',
    query(knex, User)
        .max(t => t.createdAt)
        .toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 11. Escape hatch — raw knex access
// ═══════════════════════════════════════════════════════════════════════════

show(
    'Escape hatch (.apply)',
    query(knex, User)
        .apply(qb => {
            qb.whereRaw('"full_name" ILIKE ?', ['%smith%']);
            qb.orderByRaw('"created_at" DESC NULLS LAST');
        })
        .toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 12. whereRaw
// ═══════════════════════════════════════════════════════════════════════════

show(
    'whereRaw',
    query(knex, User).whereRaw('full_name ILIKE ?', '%alice%').toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 13. joinOne — eager load a department per user
// ═══════════════════════════════════════════════════════════════════════════

show(
    'joinOne (user → department)',
    query(knex, User)
        .joinOne({
            localColumn: t => t.departmentId,
            foreignColumn: t => t.id,
            as: 'department',
            foreignSchema: Department
        })
        .toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 14. joinMany — eager load posts per user
// ═══════════════════════════════════════════════════════════════════════════

show(
    'joinMany (user → posts)',
    query(knex, User)
        .joinMany({
            localColumn: t => t.id,
            foreignColumn: t => t.authorId,
            as: 'posts',
            foreignSchema: Post
        })
        .toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 15. joinMany with limit + orderBy (paginated eager loading)
// ═══════════════════════════════════════════════════════════════════════════

show(
    'joinMany with limit + orderBy',
    query(knex, User)
        .joinMany({
            localColumn: t => t.id,
            foreignColumn: t => t.authorId,
            as: 'recentPosts',
            foreignSchema: Post,
            limit: 5,
            orderBy: { column: t => t.createdAt, direction: 'desc' }
        })
        .toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 16. joinOne + joinMany chained with WHERE
// ═══════════════════════════════════════════════════════════════════════════

show(
    'joinOne + joinMany + WHERE',
    query(knex, User)
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
        .orderBy(t => t.fullName)
        .limit(20)
        .toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 17. joinOne with explicit foreignQuery (filtered join)
// ═══════════════════════════════════════════════════════════════════════════

show(
    'joinOne with filtered foreignQuery',
    query(knex, User)
        .joinOne({
            localColumn: t => t.departmentId,
            foreignColumn: t => t.id,
            as: 'department',
            foreignSchema: Department,
            foreignQuery: knex('departments').where('budget', '>', 1000)
        })
        .toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 18. Optional joinOne (LEFT JOIN)
// ═══════════════════════════════════════════════════════════════════════════

show(
    'joinOne optional (LEFT JOIN)',
    query(knex, User)
        .joinOne({
            localColumn: t => t.departmentId,
            foreignColumn: t => t.id,
            as: 'department',
            foreignSchema: Department,
            required: false
        })
        .toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// 19. joinOne with explicit foreignQuery based on a different schema
// ═══════════════════════════════════════════════════════════════════════════

show(
    'joinOne with filtered foreignQuery',
    query(knex, User)
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
        .toQuery()
);

// ═══════════════════════════════════════════════════════════════════════════
// Done
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\x1b[32m✓ All queries generated successfully\x1b[0m\n');

// Clean up knex to allow process exit
knex.destroy();
