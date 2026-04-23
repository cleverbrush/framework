# `@cleverbrush/orm-cli`

A standalone CLI for managing PostgreSQL schema migrations for projects built
with [`@cleverbrush/orm`](https://github.com/cleverbrush/framework).

```
cb-orm migrate generate [name]   # diff DB → schema, emit TS migration file (name defaults to "migration")
cb-orm migrate run               # apply pending migrations
cb-orm migrate rollback          # roll back last batch
cb-orm migrate status            # list applied/pending migrations
cb-orm db push                   # sync schema in-place (dev only)
```

---

## Installation

```sh
npm install --save-dev @cleverbrush/orm-cli
```

`tsx` (for loading TypeScript config files) and `knex` are peer dependencies
that are installed automatically as transitive dependencies.

---

## Quick start

### 1. Create `db.config.ts` in your project root

```ts
// db.config.ts
import knex from 'knex';
import { defineConfig } from '@cleverbrush/orm-cli';
import { UserEntity, TodoEntity } from './src/db/schemas.js';

const db = knex({
    client: 'pg',
    connection: process.env.DATABASE_URL
});

export default defineConfig({
    knex: db,
    entities: { users: UserEntity, todos: TodoEntity },
    migrations: {
        directory: './migrations',  // where .ts migration files are written
        tableName: 'knex_migrations' // default; override if needed
    }
});
```

### 2. Add convenience scripts to `package.json`

```json
{
  "scripts": {
    "db:generate": "cb-orm migrate generate",
    "db:run":      "cb-orm migrate run",
    "db:rollback": "cb-orm migrate rollback",
    "db:status":   "cb-orm migrate status",
    "db:push":     "cb-orm db push"
  }
}
```

---

## Commands

### `migrate generate <name>`

Compares every entity in `config.entities` against the live database and emits
a single timestamped TypeScript migration file when differences are found.

- New tables → `CREATE TABLE`.
- Existing tables with column/index/FK changes → `ALTER TABLE`.
- Multiple tables are FK-dependency-ordered (parents created first, dropped last).
- Polymorphic (CTI) entities include one entry per variant table.
- File written as `<dir>/YYYYMMDDHHmmss_<name>.ts`.

```sh
npx cb-orm migrate generate add_role_column
# → migrations/20260423120000_add_role_column.ts
```

### `migrate run`

Applies all pending migrations via `knex.migrate.latest`.

```sh
npx cb-orm migrate run
# Batch 1. Applied 2 migration(s):
#   ✓ 20260423000001_init.ts
#   ✓ 20260423120000_add_role_column.ts
```

Use `--to <filename>` to migrate up to a specific file:

```sh
npx cb-orm migrate run --to 20260423000001_init.ts
```

### `migrate rollback`

Rolls back the most recently applied batch.

```sh
npx cb-orm migrate rollback
# Roll back all batches:
npx cb-orm migrate rollback --all
```

### `migrate status`

Lists applied and pending migrations.

```sh
npx cb-orm migrate status

# Applied migrations:
#   ✓ 20260423000001_init.ts
# Pending migrations:
#   ○ 20260423120000_add_role_column.ts
```

### `db push`

Applies all schema changes directly to the database **without** writing a
migration file.  Runs inside a single transaction.

> **Warning — dev only.**  Requires `--yes` when `NODE_ENV=production`.

```sh
npx cb-orm db push          # asks for confirmation
npx cb-orm db push --yes    # skip confirmation
```

---

## Options

| Flag | Commands | Description |
|------|----------|-------------|
| `--config <path>` | all | Path to config file (default: `db.config.ts` in cwd) |
| `--dir <path>` | all | Migrations directory (overrides `config.migrations.directory`) |
| `--to <name>` | `migrate run` | Apply up to a specific migration filename |
| `--all` | `migrate rollback` | Roll back all batches |
| `--yes` | `db push` | Skip the interactive confirmation prompt |

---

## How it works

The CLI delegates all schema intelligence to `@cleverbrush/knex-schema`:

| Step | Function |
|------|---------|
| Detect new tables | `tableExistsInDb(knex, tableName)` |
| Generate CREATE TABLE source | `generateCreateTableSource(schema)` |
| Introspect live table | `introspectDatabase(knex, tableName)` |
| Diff schema vs DB | `diffSchema(schema, dbState)` |
| Generate ALTER TABLE source | `generateMigration(diff, tableName)` |
| Apply diff without file | `applyDiff(knex, diff, tableName)` |
| Polymorphic variant tables | `getPolymorphicVariantSchemas(schema)` |

`tsx` is used to load `db.config.ts` at runtime by registering the
`tsx/esm/api` hook before any dynamic `import()` of the config file.
