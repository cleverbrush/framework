/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { InstallBanner } from '@cleverbrush/website-shared/components/InstallBanner';
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function OrmPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>@cleverbrush/orm</h1>
                    <p className="subtitle">
                        EF-Core-like typed ORM on top of{' '}
                        <code>@cleverbrush/knex-schema</code> — identity map,
                        change tracking, relations, polymorphic inheritance, and
                        schema migrations in one package.
                    </p>
                </div>

                {/* ── Installation ─────────────────────────────────── */}
                <InstallBanner
                    commands={[
                        {
                            command: 'npm install @cleverbrush/orm',
                            label: '@cleverbrush/orm'
                        },
                        {
                            command:
                                'npm install --save-dev @cleverbrush/orm-cli',
                            label: 'migration CLI (dev)'
                        }
                    ]}
                />

                {/* ── Why ──────────────────────────────────────────── */}
                <div className="why-box">
                    <h2>💡 Why @cleverbrush/orm?</h2>

                    <h3>The Problem</h3>
                    <p>
                        Even with a type-safe query builder, you still need to
                        track which entities changed, propagate foreign keys
                        through related inserts, handle optimistic concurrency,
                        and keep your schema in sync with the database. All of
                        that usually requires stitching together multiple
                        libraries or writing the same boilerplate repeatedly.
                    </p>

                    <h3>The Solution</h3>
                    <p>
                        <code>@cleverbrush/orm</code> wraps{' '}
                        <code>@cleverbrush/knex-schema</code> in an EF-Core–
                        style layer: define entities once, declare relations
                        fluently, and let the context track every mutation
                        automatically. Flush all changes in one{' '}
                        <code>saveChanges()</code> call.
                    </p>

                    <h3>Key Features</h3>
                    <ul>
                        <li>
                            <strong>Identity map</strong> — loading the same PK
                            twice always returns the same object reference.
                        </li>
                        <li>
                            <strong>Automatic change detection</strong> — mutate
                            entity properties normally; the tracker detects
                            diffs on flush.
                        </li>
                        <li>
                            <strong>Relation graph saves</strong> — pass a
                            nested object graph to <code>db.users.save()</code>
                            {';'} the ORM propagates PKs and FKs in the right
                            order inside a transaction.
                        </li>
                        <li>
                            <strong>Optimistic concurrency</strong> — mark any
                            column with <code>.rowVersion()</code>; the ORM
                            auto-increments it and throws{' '}
                            <code>ConcurrencyError</code> on conflict.
                        </li>
                        <li>
                            <strong>
                                STI &amp; CTI polymorphic inheritance
                            </strong>{' '}
                            — model discriminated unions with single-table or
                            class-table layouts.
                        </li>
                        <li>
                            <strong>Schema migrations</strong> — diff your
                            entity definitions against the live DB and emit
                            typed migration files with{' '}
                            <code>@cleverbrush/orm-cli</code>.
                        </li>
                    </ul>
                </div>

                {/* ── Quick Start ──────────────────────────────────── */}
                <div className="card">
                    <h2>Quick Start</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import knex from 'knex';
import { number, object, string, defineEntity, createDb } from '@cleverbrush/orm';

// 1. Define schema + entity
const UserSchema = object({
    id:    number().primaryKey(),
    email: string().hasColumnName('email_address'),
    name:  string(),
}).hasTableName('users');

const UserEntity = defineEntity(UserSchema);

// 2. Create the context
const db = createDb(
    knex({ client: 'pg', connection: process.env.DATABASE_URL }),
    { users: UserEntity }
);

// 3. Query
const alice = await db.users.find(1);

// 4. Insert / update (PK absent → INSERT, PK present → UPDATE)
const created = await db.users.save({ email: 'bob@example.com', name: 'Bob' });
const updated = await db.users.save({ id: 1, email: 'alice@example.com', name: 'Alice' });`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Relations ────────────────────────────────────── */}
                <div className="card">
                    <h2>Relations</h2>
                    <p>
                        Declare relations fluently on the entity. They are fully
                        typed — <code>.include()</code> only accepts keys you
                        have declared.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const TodoSchema = object({
    id:     number().primaryKey(),
    title:  string(),
    userId: number().hasColumnName('user_id'),
    author: object({ id: number().primaryKey(), name: string() })
                .hasTableName('users').optional(),
}).hasTableName('todos');

const TodoEntity = defineEntity(TodoSchema)
    .belongsTo(t => t.author, 'userId');

const UserEntity = defineEntity(UserSchema)
    .hasMany(t => t.todos, TodoEntity, 'userId');

const db = createDb(knex, { users: UserEntity, todos: TodoEntity });

// Eager-load the author
const todo = await db.todos
    .where(t => t.id, 42)
    .include(t => t.author)
    .first();
console.log(todo?.author?.name); // fully typed

// Save a whole graph in one transaction
const user = await db.users.save({
    name: 'Alice',
    todos: [{ title: 'Buy milk', completed: false, userId: 0 }],
});`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Change tracking ──────────────────────────────── */}
                <div className="card">
                    <h2>Change Tracking</h2>
                    <p>
                        Enable tracking with <code>{`{ tracking: true }`}</code>
                        . The context maintains an <strong>identity map</strong>{' '}
                        and flushes all dirty entries inside a single
                        transaction on <code>saveChanges()</code>.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const db = createDb(knex, { users: UserEntity }, { tracking: true });

// Load — entity enters the identity map as Unchanged.
const user = await db.users.find(1);

// Mutate normally — no special setter required.
user.name = 'Updated';

// All dirty entries are flushed in one transaction.
const { inserted, updated, deleted } = await db.saveChanges();

// Works with await using — throws PendingChangesError if not flushed.
async function handler() {
    await using db = createDb(knex, { users: UserEntity }, { tracking: true });
    const user = await db.users.find(1);
    user.name = 'Updated';
    await db.saveChanges();
}   // Symbol.asyncDispose fires here`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Row versioning ───────────────────────────────── */}
                <div className="card">
                    <h2>Optimistic Concurrency (Row Versioning)</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const OrderSchema = object({
    id:      number().primaryKey(),
    status:  string(),
    version: number().rowVersion(),   // auto-incremented on every UPDATE
}).hasTableName('orders');

const db = createDb(knex, { orders: OrderEntity }, { tracking: true });

const order = await db.orders.find(orderId);
order.status = 'shipped';

try {
    await db.saveChanges();
} catch (err) {
    if (err instanceof ConcurrencyError) {
        // Another process updated the row — reload and retry.
        await db.reload(order);
    }
}`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Polymorphic entities ─────────────────────────── */}
                <div className="card">
                    <h2>Polymorphic Entities (STI / CTI)</h2>
                    <p>
                        Model discriminated unions with{' '}
                        <strong>Single-Table Inheritance</strong> (one table,
                        discriminator column) or{' '}
                        <strong>Class-Table Inheritance</strong> (base table +
                        per-variant extension tables).
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// ── STI: all variants in one table ──────────────────────────────
const ActivityBase = object({
    id:     number().primaryKey(),
    type:   string(),
    todoId: number().hasColumnName('todo_id'),
}).hasTableName('activities');

const ActivityEntity = defineEntity(ActivityBase)
    .discriminator('type')
    .stiVariant('assigned', object({
        type:       string('assigned'),
        assigneeId: number().hasColumnName('assignee_id').optional(),
    }))
    .stiVariant('commented', object({
        type: string('commented'),
        body: string().optional(),
    }));

const db = createDb(knex, { activities: ActivityEntity });

// Get a typed view scoped to one variant (analogous to EF Core Set<T>())
const assigned = db.activities.ofVariant('assigned');

// Insert — discriminator is set automatically
const activity = await assigned.insert({ todoId: 42, assigneeId: 9 });
// activity.type === 'assigned', activity.assigneeId === 9

// Find by PK, typed to the variant
const found = await assigned.find(activity.id);

// Update rows matching a WHERE clause
await assigned.where(t => t.id, 3).update({ assigneeId: 99 });

// Delete rows matching a WHERE clause
await assigned.where(t => t.id, 3).delete();`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Migrations ───────────────────────────────────── */}
                <div className="card">
                    <h2>Schema Migrations</h2>
                    <p>
                        Use <code>@cleverbrush/orm-cli</code> to diff your
                        entity definitions against the live database and emit
                        TypeScript migration files.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// db.config.ts — one config file, picked up automatically by cb-orm
import knex from 'knex';
import { defineConfig } from '@cleverbrush/orm-cli';
import { UserEntity, TodoEntity } from './src/db/schemas.js';

export default defineConfig({
    knex: knex({ client: 'pg', connection: process.env.DATABASE_URL }),
    entities: { users: UserEntity, todos: TodoEntity },
    migrations: { directory: './migrations' }
});`)
                            }}
                        />
                    </pre>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: `# Diff schema vs DB → emit a TS migration file
npx cb-orm migrate generate add_users_table

# Apply pending migrations
npx cb-orm migrate run

# Check migration status
npx cb-orm migrate status

# Sync in-place (dev only — no migration file)
npx cb-orm db push`
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
                                    <th>Method / Type</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>createDb(knex, map, opts?)</code>
                                    </td>
                                    <td>
                                        Creates a <code>DbContext</code> (or{' '}
                                        <code>TrackedDbContext</code> with{' '}
                                        <code>{`{ tracking: true }`}</code>)
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>defineEntity(schema)</code>
                                    </td>
                                    <td>
                                        Wraps a schema to enable relation and
                                        variant declarations
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>db.&lt;set&gt;.find(pk)</code>
                                    </td>
                                    <td>
                                        Find one row by PK;{' '}
                                        <code>undefined</code> if not found
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>
                                            db.&lt;set&gt;.findOrFail(pk)
                                        </code>
                                    </td>
                                    <td>
                                        Like <code>find</code> but throws{' '}
                                        <code>EntityNotFoundError</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>
                                            db.&lt;set&gt;.findMany([pk…])
                                        </code>
                                    </td>
                                    <td>
                                        Fetch multiple rows by PK in one query
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>db.&lt;set&gt;.save(graph)</code>
                                    </td>
                                    <td>
                                        Insert or update a nested object graph
                                        (transactional)
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>
                                            db.&lt;set&gt;.ofVariant(key)
                                        </code>
                                    </td>
                                    <td>
                                        Return a typed <code>VariantDbSet</code>{' '}
                                        scoped to a polymorphic variant —
                                        analogous to EF Core{"'s"}{' '}
                                        <code>Set&lt;DerivedType&gt;()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>db.saveChanges()</code>
                                    </td>
                                    <td>
                                        Flush all pending changes in a single
                                        transaction (tracked context only)
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>db.discardChanges()</code>
                                    </td>
                                    <td>
                                        Roll back all in-memory mutations
                                        (tracked context only)
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>db.entry(entity)</code>
                                    </td>
                                    <td>
                                        Return the <code>EntityEntry</code> view
                                        (state, snapshot, isModified, reset)
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>db.transaction(cb)</code>
                                    </td>
                                    <td>
                                        Run a callback inside a Knex transaction
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>ConcurrencyError</code>
                                    </td>
                                    <td>
                                        Thrown when a row-version UPDATE/DELETE
                                        hits a conflict
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>EntityNotFoundError</code>
                                    </td>
                                    <td>
                                        Thrown by <code>findOrFail</code> when
                                        no row matches
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>InvariantViolationError</code>
                                    </td>
                                    <td>
                                        Thrown when PK or discriminator is
                                        mutated on a tracked entity
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>PendingChangesError</code>
                                    </td>
                                    <td>
                                        Thrown by{' '}
                                        <code>[Symbol.asyncDispose]</code> with
                                        unsaved changes
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── See Also ─────────────────────────────────────── */}
                <div className="card">
                    <h2>See Also</h2>
                    <ul>
                        <li>
                            <a href="/knex-schema">@cleverbrush/knex-schema</a>{' '}
                            — the schema DSL and query builder that powers this
                            ORM
                        </li>
                        <li>
                            <a
                                href="https://www.npmjs.com/package/@cleverbrush/orm-cli"
                                target="_blank"
                                rel="noreferrer"
                            >
                                @cleverbrush/orm-cli
                            </a>{' '}
                            — migration CLI tool
                        </li>
                        <li>
                            <a href="/api-docs">API Reference</a> — full
                            TypeDoc-generated API documentation
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
