# EF Core-like ORM Extensions for `@cleverbrush/knex-schema`

## Overview

Leverage the existing **extension system** (`defineExtension`/`withExtensions`), **PropertyDescriptorTree**, and **`introspect()`** to build EF Core-style code-first table definitions with automatic DDL generation and schema-diff-based migrations — while keeping Knex query-builder flexibility.

### Architecture Pillars

The existing system provides three key primitives:

1. **Extension system** (`defineExtension`/`withExtensions`) — attach arbitrary column/table metadata (types, constraints, indexes, FKs). Metadata stored via `withExtension(key, value)`, retrieved via `getExtension(key)` or `introspect().extensions`. Survives fluent chaining.
2. **PropertyDescriptorTree** — type-safe recursive property navigation. Each node exposes `getSchema()` to retrieve the property's schema (and its extensions), `propertyName`, `parent`, `getValue()`/`setValue()`, and `toJsonPointer()`.
3. **`introspect()`** — serialize all schema metadata (type, constraints, extensions, validators, etc.) into a plain object. The universal round-trip format for code generation.

---

## Phase 1: Column-Level DDL Extensions

New extension methods added via `defineExtension()` to describe SQL column semantics.

### 1a. Column type & constraint extensions

```ts
import { defineExtension } from '@cleverbrush/schema';

export const ddlExtension = defineExtension({
    number: {
        primaryKey(this: NumberSchemaBuilder, opts?: { autoIncrement?: boolean }) {
            return this.withExtension('primaryKey', { autoIncrement: opts?.autoIncrement ?? true });
        },
        references(this: NumberSchemaBuilder, table: string, column: string = 'id') {
            return this.withExtension('references', { table, column });
        },
        onDelete(this: NumberSchemaBuilder, action: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION') {
            return this.withExtension('onDelete', action);
        },
        onUpdate(this: NumberSchemaBuilder, action: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION') {
            return this.withExtension('onUpdate', action);
        },
        defaultTo(this: NumberSchemaBuilder, value: number | 'auto_increment') {
            return this.withExtension('defaultTo', value);
        },
        index(this: NumberSchemaBuilder, name?: string) {
            return this.withExtension('index', name ?? true);
        },
        unique(this: NumberSchemaBuilder, name?: string) {
            return this.withExtension('unique', name ?? true);
        },
    },
    string: {
        primaryKey(this: StringSchemaBuilder) {
            return this.withExtension('primaryKey', { autoIncrement: false });
        },
        columnType(this: StringSchemaBuilder, type: 'text' | 'uuid' | 'varchar' | 'jsonb' | 'citext') {
            return this.withExtension('columnType', type);
        },
        references(this: StringSchemaBuilder, table: string, column: string = 'id') {
            return this.withExtension('references', { table, column });
        },
        onDelete(this: StringSchemaBuilder, action: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION') {
            return this.withExtension('onDelete', action);
        },
        onUpdate(this: StringSchemaBuilder, action: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION') {
            return this.withExtension('onUpdate', action);
        },
        unique(this: StringSchemaBuilder, name?: string) {
            return this.withExtension('unique', name ?? true);
        },
        index(this: StringSchemaBuilder, name?: string) {
            return this.withExtension('index', name ?? true);
        },
        defaultTo(this: StringSchemaBuilder, value: string) {
            return this.withExtension('defaultTo', value);
        },
        check(this: StringSchemaBuilder, sql: string) {
            return this.withExtension('check', sql);
        },
    },
    boolean: {
        defaultTo(this: BooleanSchemaBuilder, value: boolean) {
            return this.withExtension('defaultTo', value);
        },
    },
    date: {
        defaultTo(this: DateSchemaBuilder, value: 'now') {
            return this.withExtension('defaultTo', value);
        },
        index(this: DateSchemaBuilder, name?: string) {
            return this.withExtension('index', name ?? true);
        },
    },
});
```

### 1b. Object-level (table) metadata extensions

```ts
// Within the same defineExtension call:
    object: {
        hasIndex(this: ObjectSchemaBuilder, columns: string[], opts?: { name?: string; unique?: boolean }) {
            const existing = (this.getExtension('indexes') as any[]) ?? [];
            return this.withExtension('indexes', [...existing, { columns, ...opts }]);
        },
        hasUnique(this: ObjectSchemaBuilder, columns: string[], name?: string) {
            const existing = (this.getExtension('uniques') as any[]) ?? [];
            return this.withExtension('uniques', [...existing, { columns, name }]);
        },
        hasCheck(this: ObjectSchemaBuilder, sql: string) {
            const existing = (this.getExtension('checks') as any[]) ?? [];
            return this.withExtension('checks', [...existing, sql]);
        },
        hasPrimaryKey(this: ObjectSchemaBuilder, columns: string[]) {
            return this.withExtension('compositePrimaryKey', columns);
        },
    },
```

### Schema definition example (EF Core / code-first style)

```ts
import { object, string, number, boolean, date } from '@cleverbrush/knex-schema';

const User = object({
    id:        number().primaryKey(),
    email:     string().unique().hasColumnName('email_address'),
    name:      string(),
    role:      string().defaultTo('user').check("role IN ('user', 'admin', 'moderator')"),
    isActive:  boolean().defaultTo(true).hasColumnName('is_active'),
    createdAt: date().defaultTo('now').hasColumnName('created_at'),
    updatedAt: date().defaultTo('now').hasColumnName('updated_at'),
}).hasTableName('users')
  .hasIndex(['email_address', 'is_active'], { name: 'idx_users_email_active' });
```

Every piece of metadata is stored in `extensions` and survives fluent chaining. At any point you can call `schema.introspect()` to get a serializable snapshot of the full model.

---

## Phase 2: Relationship Metadata

Relationships stored as extensions on **FK columns** (for `belongsTo` / FK constraints) or **the table schema** (for `hasMany`/`hasOne`/`belongsToMany` query shortcuts):

```ts
const Post = object({
    id:       number().primaryKey(),
    title:    string(),
    body:     string().columnType('text'),
    authorId: number()
                .hasColumnName('author_id')
                .references('users', 'id')      // ← FK constraint in DDL
                .onDelete('CASCADE'),
    
    categoryId: number()
                  .hasColumnName('category_id')
                  .references('categories', 'id')
                  .onDelete('SET NULL')
                  .optional(),
}).hasTableName('posts');
```

### Table-level relation metadata for query shortcuts

```ts
// Relation metadata on table-level — enables include() shortcuts
const UserWithRelations = User
    .hasMany('posts', { schema: Post, foreignKey: t => t.authorId })
    .hasOne('profile', { schema: Profile, foreignKey: t => t.userId });

const PostWithRelations = Post
    .belongsTo('author', { schema: User, foreignKey: t => t.authorId })
    .belongsToMany('tags', {
        schema: Tag,
        through: { table: 'post_tags', localKey: 'post_id', foreignKey: 'tag_id' }
    });
```

The `foreignKey: t => t.authorId` uses the **same PropertyDescriptorTree accessor pattern** that `SchemaQueryBuilder.where()` already uses. `resolveColumnRef()` resolves it to the SQL column name at runtime.

### Auto-configured joins via `include()` (the payoff)

Replaces manual `joinOne`/`joinMany` specs:

```ts
// Today — manual specs:
query(db, Post)
    .joinOne({
        localColumn: t => t.authorId,
        foreignColumn: t => t.id,
        foreignSchema: User,
        as: 'author',
    });

// With relation metadata — EF Core-style include():
query(db, PostWithRelations)
    .include(t => t.author)                                         // belongsTo — auto-resolved
    .include(t => t.tags, q => q.orderBy(t => t.name))              // belongsToMany with query customization
```

`include()` reads the relation metadata from `schema.getExtension('relations')`, resolves FK columns via `PropertyDescriptorTree`, and delegates to the existing `joinOne`/`joinMany` internally.

---

## Phase 3: Table DDL Generation from Schema Introspection

A `generateCreateTable()` function walks `introspect().properties` and builds Knex DDL:

```ts
import { generateCreateTable } from '@cleverbrush/knex-schema';

// Generate the Knex schema builder call:
const createUsersTable = generateCreateTable(User);

// Use in a migration or setup script:
await createUsersTable(knex);

// Equivalent to:
// knex.schema.createTable('users', table => {
//     table.increments('id').primary();
//     table.string('email_address').unique().notNullable();
//     table.string('name').notNullable();
//     table.string('role').defaultTo('user').notNullable();
//     table.boolean('is_active').defaultTo(true).notNullable();
//     table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
//     table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
//     table.index(['email_address', 'is_active'], 'idx_users_email_active');
//     table.check("role IN ('user', 'admin', 'moderator')");
// });
```

### Implementation sketch

```ts
export function generateCreateTable(schema: ObjectSchemaBuilder) {
    const tableName = getTableName(schema);
    const introspected = schema.introspect();
    
    return (knex: Knex) => knex.schema.createTable(tableName, (table) => {
        for (const [propKey, propSchema] of Object.entries(introspected.properties)) {
            const col = getColumnName(propSchema, propKey);
            const ext = propSchema.introspect().extensions;
            const propIntrospected = propSchema.introspect();
            
            // Determine column builder based on schema type + extensions
            let column: Knex.ColumnBuilder;
            
            if (ext.primaryKey?.autoIncrement) {
                column = table.increments(col);
            } else {
                column = resolveColumnType(table, col, propIntrospected, ext);
            }
            
            // Apply constraints from extensions
            if (ext.primaryKey && !ext.primaryKey.autoIncrement) {
                column = column.primary();
            }
            if (ext.unique) {
                column = column.unique(typeof ext.unique === 'string' ? ext.unique : undefined);
            }
            if (ext.index) {
                column = column.index(typeof ext.index === 'string' ? ext.index : undefined);
            }
            if (ext.defaultTo !== undefined) {
                column = applyDefault(column, ext.defaultTo, knex);
            }
            if (propIntrospected.isRequired && !ext.primaryKey?.autoIncrement) {
                column = column.notNullable();
            } else if (!propIntrospected.isRequired) {
                column = column.nullable();
            }
            if (ext.references) {
                column = column.references(ext.references.column).inTable(ext.references.table);
                if (ext.onDelete) column = column.onDelete(ext.onDelete);
                if (ext.onUpdate) column = column.onUpdate(ext.onUpdate);
            }
            if (ext.check) table.check(ext.check);
        }
        
        // Table-level constraints from object extensions
        const tableExt = introspected.extensions;
        for (const idx of (tableExt.indexes ?? [])) {
            table.index(idx.columns, idx.name);
        }
        for (const unq of (tableExt.uniques ?? [])) {
            table.unique(unq.columns, { indexName: unq.name });
        }
        for (const chk of (tableExt.checks ?? [])) {
            table.check(chk);
        }
        if (tableExt.compositePrimaryKey) {
            table.primary(tableExt.compositePrimaryKey);
        }
    });
}
```

### Type mapping

The type mapping uses both the `SchemaBuilder` type and the `columnType` extension:

```ts
function resolveColumnType(table, col, introspected, ext) {
    if (ext.columnType) {
        // Explicit override: 'text', 'uuid', 'jsonb', etc.
        return table.specificType(col, ext.columnType);
    }
    switch (introspected.type) {
        case 'string':
            const maxLen = ext.maxLength ?? introspected.maxLength;
            return maxLen ? table.string(col, maxLen) : table.string(col);
        case 'number':
            return introspected.isInteger ? table.integer(col) : table.float(col);
        case 'boolean':
            return table.boolean(col);
        case 'date':
            return table.timestamp(col);
        default:
            return table.specificType(col, 'text');
    }
}

function applyDefault(column, defaultValue, knex) {
    if (defaultValue === 'now') return column.defaultTo(knex.fn.now());
    if (defaultValue === 'auto_increment') return column; // handled by increments()
    return column.defaultTo(defaultValue);
}
```

---

## Phase 4: Schema Diff & Automatic Migration Generation

This is where `PropertyDescriptorTree` + `introspect()` really shine — you can diff the schema model against the live DB and generate migration code.

### Workflow

```ts
import { introspectDatabase, diffSchema, generateMigration } from '@cleverbrush/knex-schema';

// 1. Read current DB state
const dbState = await introspectDatabase(knex, 'users');
// → {
//     columns: {
//         id:    { type: 'integer', nullable: false, defaultValue: "nextval('users_id_seq')", ... },
//         email: { type: 'character varying', nullable: false, ... },
//         ...
//     },
//     indexes: [{ name: 'idx_users_email', columns: ['email'], unique: true }],
//     foreignKeys: [...],
//     checks: [...]
// }

// 2. Diff against the schema model
const diff = diffSchema(User, dbState);
// → {
//     addColumns:   [{ name: 'bio', type: 'text', nullable: true }],
//     dropColumns:  [],
//     alterColumns: [{ name: 'email', changes: { nullable: { from: true, to: false } } }],
//     addIndexes:   [{ columns: ['email_address', 'name'], name: 'idx_users_email_name' }],
//     dropIndexes:  [],
//     addForeignKeys: [...],
//     dropForeignKeys: [],
// }

// 3. Generate migration file content
const migration = generateMigration(diff, 'users');
```

### Example generated output

Say you added `bio` to the User schema and added a composite index:

```ts
// Generated: migrations/20260420_alter_users.ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('users', (table) => {
        table.text('bio').nullable();
        table.index(['email_address', 'name'], 'idx_users_email_name');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('bio');
        table.dropIndex([], 'idx_users_email_name');
    });
}
```

### Database introspection implementation

The `introspectDatabase` function queries PostgreSQL system catalogs:

```ts
export async function introspectDatabase(knex: Knex, tableName: string): Promise<DatabaseTableState> {
    const [columns, indexes, foreignKeys, checks] = await Promise.all([
        knex.raw(`
            SELECT column_name, data_type, is_nullable, column_default, 
                   character_maximum_length, numeric_precision
            FROM information_schema.columns 
            WHERE table_name = ? AND table_schema = 'public'
            ORDER BY ordinal_position
        `, [tableName]),
        knex.raw(`
            SELECT indexname, indexdef,
                   array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns
            FROM pg_indexes
            JOIN pg_class t ON t.relname = ?
            JOIN pg_index ix ON ix.indrelid = t.oid
            JOIN pg_class i ON i.oid = ix.indexrelid AND i.relname = pg_indexes.indexname
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
            WHERE pg_indexes.tablename = ?
            GROUP BY indexname, indexdef
        `, [tableName, tableName]),
        knex.raw(`
            SELECT tc.constraint_name, kcu.column_name,
                   ccu.table_name AS foreign_table, ccu.column_name AS foreign_column,
                   rc.delete_rule, rc.update_rule
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu USING (constraint_name, table_schema)
            JOIN information_schema.constraint_column_usage ccu USING (constraint_name, table_schema)
            JOIN information_schema.referential_constraints rc USING (constraint_name, constraint_schema)
            WHERE tc.table_name = ? AND tc.constraint_type = 'FOREIGN KEY'
        `, [tableName]),
        knex.raw(`
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint
            WHERE conrelid = ?::regclass AND contype = 'c'
        `, [tableName]),
    ]);
    
    return normalizeDbState(columns.rows, indexes.rows, foreignKeys.rows, checks.rows);
}
```

---

## Phase 5: ORM Conveniences

### 5a. Automatic Timestamps

```ts
const Post = object({
    id:    number().primaryKey(),
    title: string(),
}).hasTableName('posts')
  .hasTimestamps();
// Auto-adds createdAt (created_at) and updatedAt (updated_at) properties.
// Insert automatically sets both; update automatically sets updatedAt.

// Configurable column names:
const Post = object({ ... })
    .hasTableName('posts')
    .hasTimestamps({ createdAt: 'created_date', updatedAt: 'modified_date' });
```

Implementation: `.hasTimestamps()` is an object-level extension that calls `.addProp()` under the hood to inject timestamp properties and stores a `timestamps` extension marker. `SchemaQueryBuilder.insert()` and `.update()` check for this marker and auto-populate.

### 5b. Soft Deletes

```ts
const Post = object({ ... })
    .hasTableName('posts')
    .softDelete();  // adds deletedAt (deleted_at) column, default scope excludes deleted

// Queries automatically exclude soft-deleted rows:
await query(db, Post).where(t => t.title, 'like', '%hello%');
// → WHERE title LIKE '%hello%' AND deleted_at IS NULL

// Include deleted:
await query(db, Post).withDeleted().where(...);
// → WHERE title LIKE '%hello%'  (no deleted_at filter)

// Only deleted:
await query(db, Post).onlyDeleted().where(...);
// → WHERE title LIKE '%hello%' AND deleted_at IS NOT NULL

// Soft-delete (sets deletedAt instead of DELETE):
await query(db, Post).where(t => t.id, 42).delete();
// → UPDATE posts SET deleted_at = NOW() WHERE id = 42

// Hard delete:
await query(db, Post).where(t => t.id, 42).hardDelete();
// → DELETE FROM posts WHERE id = 42

// Restore:
await query(db, Post).where(t => t.id, 42).restore();
// → UPDATE posts SET deleted_at = NULL WHERE id = 42
```

### 5c. Query Scopes

```ts
const Post = object({ ... })
    .hasTableName('posts')
    .scope('published', q => q.where(t => t.status, 'published'))
    .scope('recent', q => q.orderBy(t => t.createdAt, 'desc').limit(10))
    .defaultScope(q => q.where(t => t.isActive, true));

// Apply named scope:
await query(db, Post).scoped('published');
// → WHERE is_active = true AND status = 'published'

// Chain scopes:
await query(db, Post).scoped('published').scoped('recent');

// Bypass default scope:
await query(db, Post).unscoped().where(...);
```

### 5d. Lifecycle Hooks

```ts
const User = object({ ... })
    .hasTableName('users')
    .beforeInsert(async (data, ctx) => {
        data.passwordHash = await hash(data.password);
        delete data.password;
        return data;
    })
    .afterInsert(async (row, ctx) => {
        await sendWelcomeEmail(row.email);
    })
    .beforeUpdate(async (data, ctx) => {
        data.updatedAt = new Date();
        return data;
    })
    .beforeDelete(async (query, ctx) => {
        // Audit log, cascade checks, etc.
    });
```

Hooks are stored as extension arrays and invoked by the `SchemaQueryBuilder` write operations (`insert()`, `update()`, `delete()`).

### 5e. Pagination

```ts
// Offset pagination
const page = await query(db, Post)
    .where(t => t.status, 'published')
    .paginate({ page: 2, pageSize: 20 });
// → {
//     data: Post[],
//     total: number,
//     page: 2,
//     pageSize: 20,
//     totalPages: number,
//     hasNextPage: boolean,
//     hasPreviousPage: boolean,
// }

// Cursor pagination (keyset — efficient for large datasets)
const page = await query(db, Post)
    .orderBy(t => t.createdAt, 'desc')
    .paginateAfter({ cursor: lastPost.createdAt, limit: 20 });
// → {
//     data: Post[],
//     nextCursor: string | null,
//     hasMore: boolean,
// }
```

### 5f. Transaction Helper

```ts
import { withTransaction } from '@cleverbrush/knex-schema';

// Callback style with auto-commit/rollback:
const result = await withTransaction(db, async (trx) => {
    const user = await query(trx, User).insert({ name: 'Alice', email: 'alice@example.com' });
    const post = await query(trx, Post).insert({ title: 'Hello', authorId: user.id });
    return { user, post };
});

// Nested/savepoint support:
await withTransaction(db, async (trx) => {
    await query(trx, User).insert({ name: 'Bob' });
    
    // Inner savepoint — can fail independently
    await withTransaction(trx, async (savepoint) => {
        await query(savepoint, Post).insert({ title: 'Draft' });
        // if this throws, only the savepoint rolls back
    });
});
```

---

## Phase 6: Raw Query Escape Hatches

For cases when the typed API is not expressive enough, provide first-class raw query support throughout the system. Accept raw SQL strings, `Knex.Raw`, or `Knex.QueryBuilder` wherever it makes sense.

### 6a. Raw column definitions in DDL

```ts
const Geospatial = object({
    id:       number().primaryKey(),
    name:     string(),
    // Raw SQL column type for anything not covered by the type mapping:
    location: string().columnType('geography(Point, 4326)'),
    metadata: string().columnType('jsonb'),
    tsVector: string().columnType('tsvector'),
}).hasTableName('places')
  // Raw SQL default expression:
  .hasRawColumn('search_vector', `tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(name, '')), 'A')
  ) STORED`)
  // Raw SQL index (GiST, GIN, etc.):
  .hasRawIndex('CREATE INDEX idx_places_location ON places USING gist(location)')
  .hasRawIndex('CREATE INDEX idx_places_search ON places USING gin(search_vector)');
```

### 6b. Raw expressions in queries

```ts
const db = createQuery(knex);

// Raw select expression:
await db(Post)
    .selectRaw('*, ts_rank(search_vector, plainto_tsquery(?)) AS rank', ['search term'])
    .whereRaw('search_vector @@ plainto_tsquery(?)', ['search term'])
    .orderByRaw('rank DESC');

// Raw column in where (already supported by existing whereRaw, extended here):
await db(Post)
    .where(t => t.status, 'published')
    .whereRaw('created_at > now() - interval ?', ['7 days']);

// Raw expression as default in DDL:
const Audit = object({
    id:        number().primaryKey(),
    action:    string(),
    timestamp: date().defaultToRaw('now() AT TIME ZONE \'UTC\''),
    metadata:  string().columnType('jsonb').defaultToRaw("'{}'::jsonb"),
}).hasTableName('audit_log');
```

### 6c. Raw query execution with schema mapping

```ts
import { rawQuery } from '@cleverbrush/knex-schema';

// Execute raw SQL but still map results through the schema's column→property mapping:
const results = await rawQuery(knex, Post, `
    SELECT p.*, COUNT(c.id) AS comment_count
    FROM posts p
    LEFT JOIN comments c ON c.post_id = p.id
    WHERE p.status = ?
    GROUP BY p.id
    ORDER BY comment_count DESC
    LIMIT ?
`, ['published', 10]);
// → results are typed as (InferType<typeof Post> & { comment_count: number })[]
// Property names are mapped back from column names (author_id → authorId, etc.)

// Or using Knex query builder as the raw source:
const subQuery = knex('posts')
    .select('author_id', knex.raw('COUNT(*) as post_count'))
    .groupBy('author_id')
    .having(knex.raw('COUNT(*) > ?', [5]));

const prolificAuthors = await rawQuery(knex, User, subQuery);
```

### 6d. Raw expressions in DDL generation

```ts
// In generateCreateTable — support raw column definitions that bypass the type mapper:
export function generateCreateTable(schema: ObjectSchemaBuilder) {
    const tableName = getTableName(schema);
    const introspected = schema.introspect();
    
    return (knex: Knex) => knex.schema.createTable(tableName, (table) => {
        // ... normal column generation ...
        
        // Raw columns (not backed by schema properties — pure DDL):
        for (const rawCol of (introspected.extensions.rawColumns ?? [])) {
            table.specificType(rawCol.name, rawCol.definition);
        }
        
        // Raw indexes:
        // Executed as separate statements after createTable:
    }).then(async () => {
        for (const rawIdx of (introspected.extensions.rawIndexes ?? [])) {
            await knex.raw(rawIdx);
        }
    });
}
```

### 6e. Raw scopes

```ts
const Post = object({ ... })
    .hasTableName('posts')
    // Scope using raw SQL for complex conditions:
    .scope('trending', q => q
        .whereRaw('created_at > now() - interval \'7 days\'')
        .whereRaw('(SELECT COUNT(*) FROM comments WHERE post_id = posts.id) > ?', [10])
        .orderByRaw('(SELECT COUNT(*) FROM comments WHERE post_id = posts.id) DESC')
    )
    // Scope using Knex subquery:
    .scope('withRecentComments', q => q
        .whereExists(knex => 
            knex('comments')
                .whereRaw('comments.post_id = posts.id')
                .whereRaw('comments.created_at > now() - interval \'24 hours\'')
        )
    );
```

### 6f. Extension methods for raw DDL

New extension methods on `object` builder:

```ts
// In ddlExtension:
    object: {
        // ... existing methods ...
        hasRawColumn(this: ObjectSchemaBuilder, name: string, definition: string) {
            const existing = (this.getExtension('rawColumns') as any[]) ?? [];
            return this.withExtension('rawColumns', [...existing, { name, definition }]);
        },
        hasRawIndex(this: ObjectSchemaBuilder, sql: string) {
            const existing = (this.getExtension('rawIndexes') as any[]) ?? [];
            return this.withExtension('rawIndexes', [...existing, sql]);
        },
    },

// On date/number/string builders:
    date: {
        // ... existing methods ...
        defaultToRaw(this: DateSchemaBuilder, expression: string) {
            return this.withExtension('defaultTo', { raw: expression });
        },
    },
    string: {
        // ... existing methods ...
        defaultToRaw(this: StringSchemaBuilder, expression: string) {
            return this.withExtension('defaultTo', { raw: expression });
        },
    },
    number: {
        // ... existing methods ...
        defaultToRaw(this: NumberSchemaBuilder, expression: string) {
            return this.withExtension('defaultTo', { raw: expression });
        },
    },
```

Update `applyDefault` to handle raw expressions:

```ts
function applyDefault(column, defaultValue, knex) {
    if (defaultValue === 'now') return column.defaultTo(knex.fn.now());
    if (defaultValue === 'auto_increment') return column;
    if (typeof defaultValue === 'object' && defaultValue.raw) {
        return column.defaultTo(knex.raw(defaultValue.raw));
    }
    return column.defaultTo(defaultValue);
}
```

---

## Full Example: Blog Application

Putting it all together — a complete blog data model:

```ts
import { object, string, number, boolean, date } from '@cleverbrush/knex-schema';

// ─── Models ────────────────────────────────────────────────────────

const User = object({
    id:        number().primaryKey(),
    email:     string().unique().columnType('citext'),
    name:      string(),
    bio:       string().columnType('text').optional(),
    role:      string().defaultTo('user').check("role IN ('user', 'admin', 'moderator')"),
    isActive:  boolean().defaultTo(true).hasColumnName('is_active'),
}).hasTableName('users')
  .hasTimestamps()
  .softDelete()
  .hasMany('posts', { schema: () => Post, foreignKey: t => t.authorId })
  .hasMany('comments', { schema: () => Comment, foreignKey: t => t.userId })
  .scope('admins', q => q.where(t => t.role, 'admin'))
  .scope('active', q => q.where(t => t.isActive, true))
  .beforeInsert(async (data) => {
      if (data.password) {
          data.passwordHash = await hash(data.password);
          delete data.password;
      }
      return data;
  });

const Category = object({
    id:   number().primaryKey(),
    name: string().unique(),
    slug: string().unique(),
}).hasTableName('categories')
  .hasTimestamps();

const Post = object({
    id:         number().primaryKey(),
    title:      string(),
    slug:       string().unique().index(),
    body:       string().columnType('text'),
    status:     string().defaultTo('draft').check("status IN ('draft', 'published', 'archived')"),
    authorId:   number().hasColumnName('author_id').references('users', 'id').onDelete('CASCADE'),
    categoryId: number().hasColumnName('category_id').references('categories', 'id').onDelete('SET NULL').optional(),
}).hasTableName('posts')
  .hasTimestamps()
  .softDelete()
  .belongsTo('author', { schema: User, foreignKey: t => t.authorId })
  .belongsTo('category', { schema: Category, foreignKey: t => t.categoryId })
  .hasMany('comments', { schema: () => Comment, foreignKey: t => t.postId })
  .belongsToMany('tags', {
      schema: () => Tag,
      through: { table: 'post_tags', localKey: 'post_id', foreignKey: 'tag_id' },
  })
  .scope('published', q => q.where(t => t.status, 'published'))
  .scope('recent', q => q.orderBy(t => t.createdAt, 'desc').limit(10))
  .defaultScope(q => q.where(t => t.status, '!=', 'archived'));

const Tag = object({
    id:   number().primaryKey(),
    name: string().unique(),
}).hasTableName('tags')
  .belongsToMany('posts', {
      schema: () => Post,
      through: { table: 'post_tags', localKey: 'tag_id', foreignKey: 'post_id' },
  });

const PostTag = object({
    postId: number().hasColumnName('post_id').references('posts', 'id').onDelete('CASCADE'),
    tagId:  number().hasColumnName('tag_id').references('tags', 'id').onDelete('CASCADE'),
}).hasTableName('post_tags')
  .hasPrimaryKey(['post_id', 'tag_id']);

const Comment = object({
    id:     number().primaryKey(),
    body:   string().columnType('text'),
    postId: number().hasColumnName('post_id').references('posts', 'id').onDelete('CASCADE'),
    userId: number().hasColumnName('user_id').references('users', 'id').onDelete('CASCADE'),
}).hasTableName('comments')
  .hasTimestamps()
  .softDelete()
  .belongsTo('post', { schema: Post, foreignKey: t => t.postId })
  .belongsTo('user', { schema: User, foreignKey: t => t.userId });


// ─── DDL Generation ────────────────────────────────────────────────

import { generateCreateTable } from '@cleverbrush/knex-schema';

// Generate all tables:
const tables = [User, Category, Tag, Post, PostTag, Comment];
for (const schema of tables) {
    await generateCreateTable(schema)(knex);
}


// ─── Queries ───────────────────────────────────────────────────────

const db = createQuery(knex);

// Paginated published posts with author and tags:
const page = await db(Post)
    .scoped('published')
    .include(t => t.author)
    .include(t => t.tags)
    .include(t => t.category)
    .paginate({ page: 1, pageSize: 20 });

// User's recent posts with comments:
const userPosts = await db(Post)
    .where(t => t.authorId, userId)
    .scoped('recent')
    .include(t => t.comments, q => q
        .include(t => t.user)
        .orderBy(t => t.createdAt, 'desc')
        .limit(5)
    );

// Soft delete with hooks:
await db(Post).where(t => t.id, postId).delete();
// → UPDATE posts SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL

// Restore:
await db(Post).where(t => t.id, postId).restore();

// Include soft-deleted:
const allPosts = await db(Post).withDeleted();

// ─── Raw Queries ───────────────────────────────────────────────────

// Full-text search with raw expressions:
const searchResults = await db(Post)
    .selectRaw('*, ts_rank(search_vector, plainto_tsquery(?)) AS rank', ['graphql'])
    .whereRaw('search_vector @@ plainto_tsquery(?)', ['graphql'])
    .orderByRaw('rank DESC')
    .limit(20);

// Raw SQL with schema result mapping:
const topAuthors = await rawQuery(knex, User, `
    SELECT u.*, COUNT(p.id) AS post_count
    FROM users u
    JOIN posts p ON p.author_id = u.id
    WHERE p.status = 'published'
    GROUP BY u.id
    ORDER BY post_count DESC
    LIMIT 10
`);

// Transaction:
await db.transaction(async (trx) => {
    const post = await trx(Post).insert({ title: 'New Post', authorId: userId });
    await trx(PostTag).insert({ postId: post.id, tagId: 1 });
    await trx(PostTag).insert({ postId: post.id, tagId: 2 });
});


// ─── Migration Generation ─────────────────────────────────────────

import { introspectDatabase, diffSchema, generateMigration } from '@cleverbrush/knex-schema';

// After adding `bio` field to User and a new composite index:
const dbState = await introspectDatabase(knex, 'users');
const diff = diffSchema(User, dbState);
const migration = generateMigration(diff, 'users');

// migration.up:
//   await knex.schema.alterTable('users', (table) => {
//       table.text('bio').nullable();
//   });
//
// migration.down:
//   await knex.schema.alterTable('users', (table) => {
//       table.dropColumn('bio');
//   });
```

---

## New Files & Touched Files

| File | Status | Purpose |
|---|---|---|
| `libs/knex-schema/src/ddl.ts` | **New** | `generateCreateTable()`, `resolveColumnType()`, `applyDefault()` |
| `libs/knex-schema/src/migration.ts` | **New** | `introspectDatabase()`, `diffSchema()`, `generateMigration()` |
| `libs/knex-schema/src/relations.ts` | **New** | Relation metadata helpers, `include()` implementation |
| `libs/knex-schema/src/extension.ts` | Modified | Add `ddlExtension` with column/table DDL methods |
| `libs/knex-schema/src/SchemaQueryBuilder.ts` | Modified | Add `include()`, `scoped()`, `unscoped()`, `withDeleted()`, `onlyDeleted()`, `hardDelete()`, `restore()`, `paginate()`, `paginateAfter()`, hooks in write operations |
| `libs/knex-schema/src/types.ts` | Modified | Add `RelationSpec`, `PaginationResult`, `CursorPaginationResult`, `MigrationDiff`, `DatabaseTableState`, etc. |
| `libs/knex-schema/src/raw.ts` | **New** | `rawQuery()` — raw SQL execution with schema result mapping |
| `libs/knex-schema/src/index.ts` | Modified | Re-export new modules |
| `libs/knex-schema/src/ddl.test.ts` | **New** | Unit tests for DDL generation |
| `libs/knex-schema/src/migration.test.ts` | **New** | Unit tests for schema diff and migration generation |
| `libs/knex-schema/src/relations.test.ts` | **New** | Unit tests for relation metadata and `include()` |
| `libs/knex-schema/src/raw.test.ts` | **New** | Unit tests for raw query execution |
| `libs/knex-schema/README.md` | Modified | Document all new APIs, extensions, and usage examples |
| `websites/docs/knex-schema-orm.md` | **New** | Website documentation page for ORM extensions |

---

## Design Decisions

1. **Knex-based DDL** (not raw SQL strings) — dialect portability across PostgreSQL, MySQL, SQLite.
2. **Relations are metadata-only** — no automatic eager loading; just enables `include()` shortcuts. You still control what gets loaded.
3. **Soft delete as default scope** — transparent to callers, bypassable with `.unscoped()` / `.withDeleted()`.
4. **Migration = schema→DB diff** (not schema→schema diff) — simpler, works without tracking previous schema versions. Snapshot-based diffing (EF Core model snapshots) can be added later.
5. **Hooks run in the query builder** — they are DB-operation hooks, not schema validation hooks. Keeps the schema layer pure.
6. **Lazy schema references** (`schema: () => Post`) — avoids circular dependency issues between models that reference each other.
7. **Raw escape hatches everywhere** — accept `string | Knex.Raw | Knex.QueryBuilder` wherever the typed API can't express something. Never trap users in an abstraction.

---

## Implementation Phases

### Phase 1: Column DDL extensions + `generateCreateTable()`
- Add `ddlExtension` with all column/table constraint methods
- Implement `generateCreateTable()` and `resolveColumnType()`
- Include raw column/index/default support (`hasRawColumn`, `hasRawIndex`, `defaultToRaw`)
- Unit tests for DDL generation (mock Knex table builder)
- Add JSDoc to all public functions and extension methods

### Phase 2: Relation metadata + `include()`
- Add `belongsTo`, `hasMany`, `hasOne`, `belongsToMany` as object extensions
- Implement `include()` on `SchemaQueryBuilder` that delegates to `joinOne`/`joinMany`
- Unit tests for relation resolution and include queries
- Add JSDoc to all public functions and extension methods

### Phase 3: Soft deletes + timestamps + scopes
- Implement `hasTimestamps()`, `softDelete()`, `scope()`, `defaultScope()`
- Modify `SchemaQueryBuilder` for `withDeleted()`, `onlyDeleted()`, `restore()`, `hardDelete()`, `scoped()`, `unscoped()`
- Unit tests for scope filtering and soft delete lifecycle
- Add JSDoc to all public functions and extension methods

### Phase 4: Hooks + pagination + transaction helpers
- Implement lifecycle hooks on schema + invocation in query builder
- Implement `paginate()` and `paginateAfter()`
- Implement `withTransaction()` with savepoint support
- Unit tests for all
- Add JSDoc to all public functions and extension methods

### Phase 5: Schema diff + migration generation
- Implement `introspectDatabase()` for PostgreSQL
- Implement `diffSchema()` comparator
- Implement `generateMigration()` code emitter
- Integration tests against real PostgreSQL
- Add JSDoc to all public functions

### Phase 6: Raw query support
- Implement `rawQuery()` with schema result mapping
- Implement `selectRaw()` on `SchemaQueryBuilder`
- Add `hasRawColumn()`, `hasRawIndex()`, `defaultToRaw()` extensions
- Unit tests for raw queries and raw DDL
- Add JSDoc to all public functions

---

## Further Considerations

1. **CLI tool**: A `knex-schema migrate:generate` CLI that reads schema files, connects to the DB, and generates migration files. Could be `@cleverbrush/knex-schema-cli` or a script in the existing package.
2. **Multi-dialect**: Initial implementation targets PostgreSQL (matches existing `jsonb_agg` usage). MySQL/SQLite support follows — type mapping is isolated behind `resolveColumnType()`.
3. **Schema snapshots**: For environments without a live DB (CI, code review), support schema→snapshot→diff workflow. Store snapshots as JSON (the output of `introspect()` on all models).
4. **Seeding**: Schema-aware seed data generation using `example` metadata from schema definitions.

---

## Implementation Checklist

For **each phase**, complete all of the following before considering it done:

- [ ] **Unit tests** — every new public function, extension method, and edge case must have test coverage. Tests go in colocated `*.test.ts` files.
- [ ] **JSDoc** — every exported function, type, interface, and extension method must have JSDoc comments with `@param`, `@returns`, `@example` where applicable.
- [ ] **Update `libs/knex-schema/README.md`** — document all new APIs, extension methods, and usage examples. Include code samples for each feature.
- [ ] **Website documentation** — add/update documentation page(s) under `websites/docs/` covering the new ORM features with full examples.
- [ ] **Changeset** — create a `.changeset` entry for `@cleverbrush/knex-schema` (and any other touched library, e.g. `@cleverbrush/schema` if extensions are modified there) describing what changed.
- [ ] **Lint** — run `npm run lint:fix` and resolve all reported issues before committing.
- [ ] **Tests pass** — run `npm run test` and confirm all tests (existing + new) pass with zero failures.
- [ ] **Raw query support** — for every API that accepts column references or SQL expressions, verify it also accepts `string | Knex.Raw | Knex.QueryBuilder` for custom/unsupported cases.
