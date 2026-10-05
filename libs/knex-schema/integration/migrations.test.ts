import { randomUUID } from 'node:crypto';
import {
    applyDiff,
    generateMigration,
    type MigrationDiff
} from '@cleverbrush/knex-schema';
import Knex from 'knex';
import { afterAll, afterEach, beforeEach, expect, it } from 'vitest';

const connection = process.env.QUERY_TEST_DATABASE_URL;
if (!connection) throw new Error('QUERY_TEST_DATABASE_URL is required');
const knex = Knex({ client: 'pg', connection });
const table = `cb_defaults_${randomUUID().replaceAll('-', '')}`;
beforeEach(async () => {
    await knex.schema.createTable(table, t => {
        t.increments('id');
        t.text('status').notNullable().defaultTo('draft');
    });
    await knex(table).insert({ status: 'preserved' });
});
afterEach(() => knex.schema.dropTableIfExists(table));
afterAll(() => knex.destroy());
function change(value: unknown): MigrationDiff {
    return {
        addColumns: [],
        dropColumns: [],
        addIndexes: [],
        dropIndexes: [],
        addForeignKeys: [],
        dropForeignKeys: [],
        alterColumns: [
            {
                name: 'status',
                changes: { defaultValue: { from: 'draft', to: value } }
            }
        ]
    };
}
it('changes and removes defaults without retyping columns or losing stored data', async () => {
    await applyDiff(knex, change("reviewer's draft?"), table);
    await knex(table).insert({});
    expect((await knex(table).orderBy('id')).map(row => row.status)).toEqual([
        'preserved',
        "reviewer's draft?"
    ]);
    await applyDiff(knex, change({ raw: "upper('pending')" }), table);
    await knex(table).insert({});
    expect((await knex(table).orderBy('id', 'desc').first()).status).toBe(
        'PENDING'
    );
    await applyDiff(knex, change(null), table);
    const columns = await knex(table).columnInfo();
    expect(columns.status.type).toBe('text');
    expect(columns.status.defaultValue).toBeNull();
    expect((await knex(table).where('id', 1).first()).status).toBe('preserved');
    await expect(knex(table).insert({})).rejects.toThrow(/not-null/);
});

it('executes generated default up/down migrations and preserves literal values', async () => {
    const value = "reviewer's \\? draft\n'; DROP TABLE ignored; --";
    const migration = generateMigration(change(value), table);
    const execute = (body: string) =>
        new Function('knex', `return (async () => { ${body} })();`)(knex);
    await execute(migration.up);
    await knex(table).insert({});
    expect((await knex(table).orderBy('id', 'desc').first()).status).toBe(
        value
    );
    await execute(migration.down);
    await knex(table).insert({});
    expect((await knex(table).orderBy('id', 'desc').first()).status).toBe(
        'draft'
    );
    await applyDiff(knex, change(value), table);
    await knex(table).insert({});
    expect((await knex(table).orderBy('id', 'desc').first()).status).toBe(
        value
    );
    expect((await knex(table).columnInfo()).status.type).toBe('text');
});
