# @cleverbrush/knex-clickhouse

A [Knex](https://knexjs.org/) dialect for [ClickHouse](https://clickhouse.com/). Uses the official `@clickhouse/client` library to connect to ClickHouse and lets you build queries with Knex's familiar API.

## Installation

```bash
npm install @cleverbrush/knex-clickhouse
```

**Peer dependency:** `knex >= 3.1.0`

## Quick Start

```typescript
import { getClickhouseConnection } from '@cleverbrush/knex-clickhouse';

const db = getClickhouseConnection({
    connection: {
        url: 'http://localhost:8123',
        user: 'default',
        password: '',
        database: 'my_database'
    }
});

// Select
const [rows] = await db('my_table').select('*').where('id', 1);

// Insert
await db('my_table').insert({ id: 1, name: 'Alice' });

// Raw queries
const [rows] = await db.raw('SELECT * FROM my_table WHERE id = ?', [1]);
```

## API

### `getClickhouseConnection(config?, clickHouseSettings?)`

Creates and returns a Knex instance configured with the ClickHouse dialect.

**Parameters:**

| Name | Type | Description |
| --- | --- | --- |
| `config` | `Knex.Config & AdditionalClientOptions` | Knex configuration with optional retry settings |
| `clickHouseSettings` | `ClickHouseSettings` | Optional ClickHouse-specific settings |

### `ClickhouseKnexClient`

The Knex client class for ClickHouse. Can be used directly if you need more control over Knex initialization:

```typescript
import Knex from 'knex';
import { ClickhouseKnexClient } from '@cleverbrush/knex-clickhouse';

const db = Knex({
    client: ClickhouseKnexClient,
    connection: {
        url: 'http://localhost:8123',
        user: 'default',
        password: '',
        database: 'my_database'
    }
});
```

## Query Methods

Standard Knex query methods are supported:

- `select()` / `first()` / `pluck()` — read queries
- `insert()` — standard inserts
- `update()` — update records
- `del()` — delete records
- `raw()` — raw SQL queries (auto-detected as SELECT when the query starts with `SELECT` or `WITH`)

### `insertToClickhouse(rows)`

An extended method for inserting rows with ClickHouse-specific data types like arrays and tuples:

```typescript
await db('my_table').insertToClickhouse([
    [1, 'Alice', [10, 20, 30]],
    [2, 'Bob', [40, 50]]
]);
```

## Retry Configuration

By default, queries are retried up to 10 times on `ECONNRESET` errors with exponential backoff. You can customize or disable this:

```typescript
const db = getClickhouseConnection({
    connection: { /* ... */ },
    retry: {
        maxRetries: 5,
        minDelay: 200,
        delayFactor: 2,
        delayRandomizationPercent: 0.1,
        shouldRetry: (error) => error.code === 'ECONNRESET'
    }
});

// Disable retries
const db = getClickhouseConnection({
    connection: { /* ... */ },
    retry: null
});
```

## Type Parsing

The client automatically parses ClickHouse types to JavaScript types:

| ClickHouse Type | JavaScript Type |
| --- | --- |
| `Date`, `DateTime`, `DateTime('UTC')` | `Date` |
| `Nullable(Date)`, `Nullable(DateTime)` | `Date` |
| `LowCardinality(Date)`, `LowCardinality(DateTime)` | `Date` |
| `UInt64`, `UInt32` | `number` |

## License

BSD-3-Clause
