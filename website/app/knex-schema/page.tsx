/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { InstallBanner } from '@/app/InstallBanner';
import { highlightTS } from '@/lib/highlight';

export default function KnexSchemaPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>@cleverbrush/knex-schema</h1>
                    <p className="subtitle">
                        Type-safe, schema-driven query builder for Knex —
                        automatic column mapping, eager loading without N+1, and
                        full CRUD with complete TypeScript inference.
                    </p>
                </div>

                {/* ── Installation ─────────────────────────────────── */}
                <InstallBanner
                    commands={[
                        {
                            command: 'npm install @cleverbrush/knex-schema',
                            label: '@cleverbrush/knex-schema'
                        },
                        {
                            command: 'npm install knex',
                            label: 'peer dependency'
                        }
                    ]}
                />

                {/* ── Why ──────────────────────────────────────────── */}
                <div className="why-box">
                    <h2>💡 Why @cleverbrush/knex-schema?</h2>

                    <h3>The Problem</h3>
                    <p>
                        Raw Knex queries are untyped strings. You repeat column
                        names in queries, migrations, and application code. When
                        a column is renamed, nothing tells you which queries
                        broke. Eager loading related rows requires N+1 queries
                        or hand-written CTEs.
                    </p>

                    <h3>The Solution</h3>
                    <p>
                        Describe your table once with an{' '}
                        <code>@cleverbrush/schema</code> object builder. Add{' '}
                        <code>.hasColumnName()</code> and{' '}
                        <code>.hasTableName()</code> to map TypeScript property
                        names to SQL column names. From that point, every query
                        is type-safe — column references are property accessor
                        functions, write operations accept typed objects, and
                        the builder resolves names automatically.
                    </p>

                    <h3>Key Features</h3>
                    <ul>
                        <li>
                            <strong>Schema-as-table</strong> — one schema
                            definition is the source of truth for both
                            TypeScript types and SQL column mapping.
                        </li>
                        <li>
                            <strong>Type-safe column references</strong> — use{' '}
                            <code>t =&gt; t.firstName</code> instead of{' '}
                            <code>&apos;first_name&apos;</code>. Rename a
                            property and TypeScript tells you every broken
                            query.
                        </li>
                        <li>
                            <strong>Eager loading without N+1</strong> —{' '}
                            <code>.joinOne()</code> and <code>.joinMany()</code>{' '}
                            load related rows in a single PostgreSQL CTE query.
                        </li>
                        <li>
                            <strong>Full CRUD</strong> — typed{' '}
                            <code>insert</code>, <code>insertMany</code>,{' '}
                            <code>update</code>, <code>delete</code> with
                            bidirectional column mapping.
                        </li>
                        <li>
                            <strong>Thenable</strong> —{' '}
                            <code>await query(db, Schema)</code> directly
                            without calling <code>.execute()</code>.
                        </li>
                    </ul>
                </div>

                {/* ── Quick Start ──────────────────────────────────── */}
                <div className="card">
                    <h2>Quick Start</h2>
                    <p>
                        Import schema builders from{' '}
                        <code>@cleverbrush/knex-schema</code> (not from{' '}
                        <code>@cleverbrush/schema</code>) to get the{' '}
                        <code>.hasColumnName()</code> /{' '}
                        <code>.hasTableName()</code> extension methods:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import knex from 'knex';
import { query, object, string, number, date } from '@cleverbrush/knex-schema';

// Describe your table — one definition for types and SQL
const UserSchema = object({
    id:        number(),
    firstName: string().hasColumnName('first_name'),
    lastName:  string().hasColumnName('last_name'),
    age:       number().optional(),
    createdAt: date().hasColumnName('created_at'),
}).hasTableName('users');

const db = knex({ client: 'pg', connection: process.env.DB_URL });

// Query — property accessors resolve to SQL column names automatically
const adults = await query(db, UserSchema)
    .where(t => t.age, '>', 18)
    .orderBy(t => t.lastName);
//→ Array<{ id: number; firstName: string; lastName: string; age?: number; createdAt: Date }>`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── CRUD ─────────────────────────────────────────── */}
                <div className="card">
                    <h2>CRUD Operations</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// INSERT — returns the full inserted row (database-generated fields included)
const user = await query(db, UserSchema).insert({
    firstName: 'Alice',
    lastName:  'Smith',
    age:       30,
    createdAt: new Date(),
});

// UPDATE — returns updated rows
const updated = await query(db, UserSchema)
    .where(t => t.id, userId)
    .update({ firstName: 'Alicia' });

// DELETE — returns row count
const count = await query(db, UserSchema)
    .where(t => t.id, userId)
    .delete();

// SELECT first match
const user = await query(db, UserSchema)
    .where(t => t.id, userId)
    .first();  // → UserType | undefined`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Eager Loading ────────────────────────────────── */}
                <div className="card">
                    <h2>Eager Loading (No N+1)</h2>
                    <p>
                        <code>.joinOne()</code> and <code>.joinMany()</code>{' '}
                        load related rows in a{' '}
                        <strong>single PostgreSQL query</strong> using CTEs and{' '}
                        <code>jsonb_agg</code>. The inferred TypeScript type is
                        updated automatically for each join you add.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const PostSchema = object({
    id:       number(),
    title:    string(),
    authorId: number().hasColumnName('author_id'),
}).hasTableName('posts');

// One-to-many — load each user's posts (latest 5, newest first)
const users = await query(db, UserSchema)
    .joinMany({
        foreignSchema: PostSchema,
        localColumn:   t => t.id,
        foreignColumn: t => t.authorId,
        as:            'posts',
        limit:         5,
        orderBy:       { column: t => t.id, direction: 'desc' },
    });
// users[0].posts → Array<{ id: number; title: string; authorId: number }>

// Many-to-one — attach the author to each post
const posts = await query(db, PostSchema)
    .joinOne({
        foreignSchema: UserSchema,
        localColumn:   t => t.authorId,
        foreignColumn: t => t.id,
        as:            'author',
        required:      false,  // left join — author may be null
    });
// posts[0].author → { id: number; firstName: string; ... } | null`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Filtering ────────────────────────────────────── */}
                <div className="card">
                    <h2>Filtering</h2>
                    <p>
                        Use property accessors or string keys — both are
                        resolved to SQL column names. Record objects (
                        <code>{'{ name: "Alice" }'}</code>) have their keys
                        mapped automatically too.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`query(db, UserSchema)
    .where(t => t.firstName, 'like', 'A%')          // property accessor
    .andWhere('age', '>', 18)                        // string key
    .orWhere({ lastName: 'Smith' })                  // record — keys mapped to columns
    .whereIn(t => t.id, [1, 2, 3])
    .whereNotNull(t => t.createdAt)
    .whereBetween(t => t.age, [20, 40])
    .whereILike(t => t.lastName, 'sm%')             // case-insensitive (PostgreSQL)
    .whereRaw('extract(year from created_at) = ?', [2025]);`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Escape Hatch ─────────────────────────────────── */}
                <div className="card">
                    <h2>Escape Hatch</h2>
                    <p>
                        Use <code>.apply(fn)</code> to call any Knex method not
                        exposed by this API — the raw{' '}
                        <code>Knex.QueryBuilder</code> is passed to your
                        callback:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const rows = await query(db, UserSchema)
    .where(t => t.id, id)
    .apply(qb => qb.forUpdate().noWait());

// Pre-scoped base query (e.g. soft-delete filter)
const base = db('users').where('deleted_at', null);
const activeUsers = await query(db, UserSchema, base)
    .where(t => t.age, '>', 18);`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── API Reference ────────────────────────────────── */}
                <div className="card">
                    <h2>API Reference</h2>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Methods</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <strong>Eager loading</strong>
                                    </td>
                                    <td>
                                        <code>.joinOne(spec)</code>,{' '}
                                        <code>.joinMany(spec)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Filtering</strong>
                                    </td>
                                    <td>
                                        <code>.where()</code>,{' '}
                                        <code>.andWhere()</code>,{' '}
                                        <code>.orWhere()</code>,{' '}
                                        <code>.whereNot()</code>,{' '}
                                        <code>.whereIn()</code>,{' '}
                                        <code>.whereNotIn()</code>,{' '}
                                        <code>.whereNull()</code>,{' '}
                                        <code>.whereNotNull()</code>,{' '}
                                        <code>.whereBetween()</code>,{' '}
                                        <code>.whereNotBetween()</code>,{' '}
                                        <code>.whereLike()</code>,{' '}
                                        <code>.whereILike()</code>,{' '}
                                        <code>.whereRaw()</code>,{' '}
                                        <code>.whereExists()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Ordering</strong>
                                    </td>
                                    <td>
                                        <code>.orderBy(col, dir?)</code>,{' '}
                                        <code>.orderByRaw(sql)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Grouping</strong>
                                    </td>
                                    <td>
                                        <code>.groupBy(...cols)</code>,{' '}
                                        <code>.groupByRaw(sql)</code>,{' '}
                                        <code>.having()</code>,{' '}
                                        <code>.havingRaw(sql)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Pagination</strong>
                                    </td>
                                    <td>
                                        <code>.limit(n)</code>,{' '}
                                        <code>.offset(n)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Selection</strong>
                                    </td>
                                    <td>
                                        <code>.select(...cols)</code>,{' '}
                                        <code>.distinct(...cols)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Aggregates</strong>
                                    </td>
                                    <td>
                                        <code>.count(col?)</code>,{' '}
                                        <code>.countDistinct(col?)</code>,{' '}
                                        <code>.min(col)</code>,{' '}
                                        <code>.max(col)</code>,{' '}
                                        <code>.sum(col)</code>,{' '}
                                        <code>.avg(col)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Writes</strong>
                                    </td>
                                    <td>
                                        <code>.insert(data)</code>,{' '}
                                        <code>.insertMany(data[])</code>,{' '}
                                        <code>.update(data)</code>,{' '}
                                        <code>.delete()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Execution</strong>
                                    </td>
                                    <td>
                                        <code>.execute()</code>,{' '}
                                        <code>.first()</code>,{' '}
                                        <code>await builder</code> (thenable)
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Escape hatch</strong>
                                    </td>
                                    <td>
                                        <code>.apply(fn)</code>,{' '}
                                        <code>.toQuery()</code>,{' '}
                                        <code>.toString()</code>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
