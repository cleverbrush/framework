import Knex from 'knex';
import { bench, describe } from 'vitest';
import {
    number,
    object,
    parameter,
    query,
    string
} from '../../knex-schema/src/index.js';

// No database latency: compare construction/compilation separately from binding.
const knex = Knex({ client: 'pg' });
const User = object({
    id: number().primaryKey(),
    name: string(),
    age: number()
}).hasTableName('users');
const template = () =>
    query(knex, User)
        .where(t => t.name, parameter('name'))
        .where(t => t.age, '>=', parameter('age'))
        .orderBy(t => t.id)
        .limit(10);
const warmed = template();
warmed.toSQL('John', 18);
let value = 18;

describe('parameterized queries (no database)', () => {
    bench('construct a template', () => {
        template();
    });
    bench('construct and compile on first use', () => {
        template().toSQL('John', value++ % 80);
    });
    bench('bind a warmed statement', () => {
        warmed.toSQL('John', value++ % 80);
    });
    bench('rebuild and compile an ordinary query', () => {
        query(knex, User)
            .where(t => t.name, 'John')
            .where(t => t.age, '>=', value++ % 80)
            .orderBy(t => t.id)
            .limit(10)
            .compile()
            .toSQL();
    });
    bench('materialize and compile a bound reader', () => {
        warmed
            .query('John', value++ % 80)
            .compile()
            .toSQL();
    });
});

// Exercise the real Knex runner and decoder with an in-memory driver response.
const executionDb = Knex({ client: 'pg' });
executionDb.client.acquireConnection = async () => ({});
executionDb.client.releaseConnection = async () => {};
executionDb.client._query = async (_connection: unknown, statement: any) => {
    statement.response = {
        command: 'SELECT',
        rows: [{ id: 1, name: 'John', age: 18 }]
    };
    return statement;
};
const executeWarmed = query(executionDb, User).where(
    t => t.id,
    parameter('id')
);
executeWarmed.toSQL(1);
describe('query execution (stubbed database)', () => {
    bench('execute a warmed statement and decode', async () => {
        await executeWarmed(1);
    });
    bench('rebuild, execute and decode', async () => {
        await query(executionDb, User).where(t => t.id, 1);
    });
});
