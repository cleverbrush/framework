/**
 * @cleverbrush/knex-eager — IDE Example File
 *
 * Open this file in VS Code to verify intellisense, hover types, and
 * autocompletion for the eager loading API.
 *
 * This file is NOT a test — it's a standalone example demonstrating
 * every feature of the library with a realistic 5-table blog database.
 *
 * ┌────────────┐      ┌──────────────┐
 * │ departments│◄─────│    users     │──┐ (manager_id → users.id)
 * │            │  N:1  │              │  │
 * └────────────┘      └──────┬───────┘  │
 *                            │ 1:N      │ N:1 (self-ref)
 *                     ┌──────▼───────┐  │
 *                     │    posts     │  │
 *                     │              │──┘
 *                     └──┬───────┬───┘
 *                   1:N  │       │ N:1
 *              ┌─────────▼─┐  ┌─▼───────────┐
 *              │  comments  │  │  categories  │
 *              └────────────┘  └──────────────┘
 *
 * HOW TO USE:
 *   1. Open this file in VS Code
 *   2. Hover over variables marked with "// ← HOVER" to inspect types
 *   3. Place cursor after `localColumn: '` and trigger autocomplete (Ctrl+Space)
 *   4. Uncomment lines marked "// ← UNCOMMENT FOR TS ERROR" to see type errors
 */

import { date, number, object, string } from '@cleverbrush/schema';
import Knex from 'knex';
import { withRelations } from './RelationBuilder.js';

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA DEFINITIONS — one per database table
// ═══════════════════════════════════════════════════════════════════════════

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

// Knex instance (pg client — no actual connection needed for type checks)
const knex = Knex({ client: 'pg' });

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 1: Simple joinOne — users with department (N:1, required)
//
//   Autocomplete: `localColumn` offers user schema keys
//                 `foreignColumn` offers department schema keys
//   Result type:  User & { department: Department }
// ═══════════════════════════════════════════════════════════════════════════

const usersWithDepartment = withRelations(knex, 'users', userSchema).joinOne({
    localColumn: 'department_id', // ← autocomplete shows: id, name, email, role, department_id, manager_id
    foreignColumn: 'id', // ← autocomplete shows: id, name, budget
    as: 'department',
    required: true,
    foreignQuery: knex('departments'),
    foreignSchema: departmentSchema
});

// ← HOVER: type is RelationBuilder<..., User & { department: Department }>
const example1Result = usersWithDepartment;

async function example1() {
    const rows = await example1Result.execute();
    const first = rows[0];

    first.id; // ← HOVER: number (from user)
    first.name; // ← HOVER: string (from user)
    first.department; // ← HOVER: { id: number; name: string; budget: number }
    first.department.budget; // ← HOVER: number
    first.department.name; // ← HOVER: string
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 2: Simple joinMany — users with posts (1:N)
//
//   Result type:  User & { posts: Post[] }
// ═══════════════════════════════════════════════════════════════════════════

const usersWithPosts = withRelations(knex, 'users', userSchema).joinMany({
    localColumn: 'id',
    foreignColumn: 'author_id', // ← autocomplete shows post schema keys
    as: 'posts',
    foreignQuery: knex('posts'),
    foreignSchema: postSchema
});

async function example2() {
    const rows = await usersWithPosts.execute();
    const first = rows[0];

    first.posts; // ← HOVER: array of Post
    first.posts[0].title; // ← HOVER: string
    first.posts[0].created_at; // ← HOVER: Date
    first.posts[0].author_id; // ← HOVER: number
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 3: Multiple joins + chained Knex methods
//
//   .where(), .orderBy(), .limit() work seamlessly between joins
//   Types accumulate: each .joinOne/.joinMany adds to the result type
//   Result type:  User & { department: Department } & { posts: Post[] }
// ═══════════════════════════════════════════════════════════════════════════

const usersWithDeptAndPosts = withRelations(knex, 'users', userSchema)
    .where('role', 'admin') // ← Knex method — autocomplete suggests user schema keys
    .joinOne({
        localColumn: 'department_id',
        foreignColumn: 'id',
        as: 'department',
        required: true,
        foreignQuery: knex('departments'),
        foreignSchema: departmentSchema
    })
    .orderBy('name', 'desc') // ← Knex method — works after joinOne
    .joinMany({
        localColumn: 'id',
        foreignColumn: 'author_id',
        as: 'posts',
        foreignQuery: knex('posts'),
        foreignSchema: postSchema
    })
    .limit(50); // ← Knex method — works after joinMany

async function example3() {
    const rows = await usersWithDeptAndPosts.execute();
    const first = rows[0];

    // Both fields are available — type is the intersection
    first.department.name; // ← HOVER: string (from department)
    first.posts[0].title; // ← HOVER: string (from post)
    first.id; // ← HOVER: number (from user — base type preserved)
    first.email; // ← HOVER: string (from user)
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 4: Nested eager loading — posts with category + comments (limited)
//
//   category is optional (LEFT JOIN) → nullable
//   comments are limited to 5, ordered by created_at desc
//   Result type:  Post & { category: Category | null } & { comments: Comment[] }
// ═══════════════════════════════════════════════════════════════════════════

const postsWithCategoryAndComments = withRelations(knex, 'posts', postSchema)
    .joinOne({
        localColumn: 'category_id',
        foreignColumn: 'id',
        as: 'category',
        required: false, // ← LEFT JOIN — result is nullable
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

async function example4() {
    const rows = await postsWithCategoryAndComments.execute();
    const first = rows[0];

    first.category; // ← HOVER: Category | null (because required: false)
    first.category?.slug; // ← HOVER: string | undefined (optional chaining needed)
    first.comments; // ← HOVER: Comment[]
    first.comments[0].text; // ← HOVER: string
    first.title; // ← HOVER: string (from base post schema)
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 5: Optional joinOne — users with nullable manager (self-reference)
//
//   manager_id is optional in user schema, manager may not exist
//   Result type:  User & { manager: User | null }
// ═══════════════════════════════════════════════════════════════════════════

const usersWithManager = withRelations(knex, 'users', userSchema).joinOne({
    localColumn: 'manager_id',
    foreignColumn: 'id',
    as: 'manager',
    required: false, // ← LEFT JOIN — manager can be null
    foreignQuery: knex('users'),
    foreignSchema: userSchema
});

async function example5() {
    const rows = await usersWithManager.execute();
    const first = rows[0];

    first.manager; // ← HOVER: User | null
    first.manager?.name; // ← HOVER: string | undefined
    first.manager?.email; // ← HOVER: string | undefined
    first.name; // ← HOVER: string (base user, always present)
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 6: joinMany with offset/limit — paginated posts per user
//
//   Load posts 11–15 for each user (offset: 10, limit: 5)
// ═══════════════════════════════════════════════════════════════════════════

const usersWithPaginatedPosts = withRelations(
    knex,
    'users',
    userSchema
).joinMany({
    localColumn: 'id',
    foreignColumn: 'author_id',
    as: 'posts',
    foreignQuery: knex('posts'),
    foreignSchema: postSchema,
    offset: 10,
    limit: 5,
    orderBy: { column: 'created_at', direction: 'asc' }
});

async function example6() {
    const rows = await usersWithPaginatedPosts.execute();
    const first = rows[0];

    first.posts; // ← HOVER: Post[] (at most 5 items due to limit)
    first.posts[0].created_at; // ← HOVER: Date
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 7: .first() — single row result
//
//   Returns TResult | undefined instead of TResult[]
// ═══════════════════════════════════════════════════════════════════════════

async function example7() {
    const row = await withRelations(knex, 'users', userSchema)
        .where('id', 1) // ← Knex method on the builder
        .joinOne({
            localColumn: 'department_id',
            foreignColumn: 'id',
            as: 'department',
            required: true,
            foreignQuery: knex('departments'),
            foreignSchema: departmentSchema
        })
        .first();

    row; // ← HOVER: (User & { department: Department }) | undefined
    row?.department.name; // ← HOVER: string | undefined
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 8: Post-load mappers — transform values after loading
//
//   Convert JSON date strings to Date objects, parse numbers, etc.
// ═══════════════════════════════════════════════════════════════════════════

const usersWithMappedPosts = withRelations(knex, 'users', userSchema).joinMany({
    localColumn: 'id',
    foreignColumn: 'author_id',
    as: 'posts',
    foreignQuery: knex('posts'),
    foreignSchema: postSchema,
    mappers: {
        created_at: (v: string) => new Date(v) // transform JSON string → Date
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 9: Thenable — `await` the builder directly
//
//   The builder is thenable, so `await builder` calls .execute() automatically
// ═══════════════════════════════════════════════════════════════════════════

async function example9() {
    // No need to call .execute() — `await` triggers it
    const rows = await withRelations(knex, 'users', userSchema)
        .where('role', 'admin')
        .joinOne({
            localColumn: 'department_id',
            foreignColumn: 'id',
            as: 'department',
            required: true,
            foreignQuery: knex('departments'),
            foreignSchema: departmentSchema
        })
        .orderBy('name');

    rows[0].department.name; // ← HOVER: string
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 10: .apply() escape hatch — access any Knex builder method
//
//   For methods not explicitly forwarded, use .apply()
// ═══════════════════════════════════════════════════════════════════════════

const usersWithComplexFilter = withRelations(knex, 'users', userSchema)
    .apply(qb => qb.whereRaw('"age" > ?', [18]).joinRaw('NATURAL JOIN foo'))
    .joinOne({
        localColumn: 'department_id',
        foreignColumn: 'id',
        as: 'department',
        required: true,
        foreignQuery: knex('departments'),
        foreignSchema: departmentSchema
    });

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 11: Pre-built query — withRelations accepts Knex.QueryBuilder
// ═══════════════════════════════════════════════════════════════════════════

const preBuiltQuery = knex('users').where('active', true).select('id', 'name');

const usersFromPreBuilt = withRelations(
    knex,
    preBuiltQuery,
    userSchema
).joinOne({
    localColumn: 'department_id',
    foreignColumn: 'id',
    as: 'department',
    required: true,
    foreignQuery: knex('departments'),
    foreignSchema: departmentSchema
});

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 12: Property descriptor accessors — t => t.column syntax
//
//   Instead of string column names, use property descriptor accessors
//   for IDE navigation (click to definition) and refactoring safety.
//   Both styles can be mixed in the same spec.
// ═══════════════════════════════════════════════════════════════════════════

const usersWithAccessors = withRelations(knex, 'users', userSchema)
    .joinOne({
        localColumn: t => t.department_id, // ← click "department_id" to jump to schema definition
        foreignColumn: t => t.id, // ← typed against departmentSchema
        as: 'department',
        required: true,
        foreignQuery: knex('departments'),
        foreignSchema: departmentSchema
    })
    .joinMany({
        localColumn: t => t.id,
        foreignColumn: 'author_id', // ← mixing accessor with string is fine
        as: 'posts',
        foreignQuery: knex('posts'),
        foreignSchema: postSchema,
        orderBy: { column: t => t.created_at, direction: 'desc' }
    });

async function example12() {
    const rows = await usersWithAccessors.execute();
    const first = rows[0];

    first.department.name; // ← HOVER: string
    first.posts[0].title; // ← HOVER: string
}

// ═══════════════════════════════════════════════════════════════════════════
// SQL inspection via .toQuery()
// ═══════════════════════════════════════════════════════════════════════════

const sql = usersWithDeptAndPosts.toQuery();
console.log(sql);

// ═══════════════════════════════════════════════════════════════════════════
// TYPE ERROR EXAMPLES — uncomment any block to see TypeScript errors in IDE
// ═══════════════════════════════════════════════════════════════════════════

// --- ERROR 1: Invalid localColumn (not a key of user schema) ---
// withRelations(knex, 'users', userSchema)
//     .joinOne({
//         localColumn: 'nonexistent_column', // ← TS ERROR: Type '"nonexistent_column"' is not assignable
//         foreignColumn: 'id',
//         as: 'department',
//         foreignQuery: knex('departments'),
//         foreignSchema: departmentSchema,
//     });

// --- ERROR 2: Invalid foreignColumn (not a key of department schema) ---
// withRelations(knex, 'users', userSchema)
//     .joinOne({
//         localColumn: 'department_id',
//         foreignColumn: 'wrong_column', // ← TS ERROR: Type '"wrong_column"' is not assignable
//         as: 'department',
//         foreignQuery: knex('departments'),
//         foreignSchema: departmentSchema,
//     });

// --- ERROR 3: Invalid orderBy column (not a key of post schema) ---
// withRelations(knex, 'users', userSchema)
//     .joinMany({
//         localColumn: 'id',
//         foreignColumn: 'author_id',
//         as: 'posts',
//         foreignQuery: knex('posts'),
//         foreignSchema: postSchema,
//         orderBy: { column: 'nonexistent', direction: 'asc' }, // ← TS ERROR
//     });

// --- ERROR 4: Invalid mapper key (not a key of foreign schema) ---
// withRelations(knex, 'users', userSchema)
//     .joinOne({
//         localColumn: 'department_id',
//         foreignColumn: 'id',
//         as: 'department',
//         foreignQuery: knex('departments'),
//         foreignSchema: departmentSchema,
//         mappers: {
//             nonexistent_field: (v: any) => v, // ← TS ERROR: not assignable to type
//         },
//     });

// ═══════════════════════════════════════════════════════════════════════════
// Suppress "unused variable" warnings — these functions exist for IDE demo
// ═══════════════════════════════════════════════════════════════════════════
void example1;
void example2;
void example3;
void example4;
void example5;
void example6;
void example7;
void example9;
void example12;
void usersWithMappedPosts;
void usersWithComplexFilter;
void usersFromPreBuilt;
void usersWithAccessors;
