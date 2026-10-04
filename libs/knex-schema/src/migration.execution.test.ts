import { afterEach, describe, expect, it } from 'vitest';
import { mockDriver } from '../testing/mock-driver.js';
import {
    applyDiff,
    generateMigration,
    introspectDatabase
} from './migration.js';
import type { MigrationDiff } from './types.js';

const connections: ReturnType<typeof mockDriver>[] = [];
function setup() {
    const d = mockDriver();
    connections.push(d);
    return d;
}
const empty = (): MigrationDiff => ({
    addColumns: [],
    dropColumns: [],
    alterColumns: [],
    addIndexes: [],
    dropIndexes: [],
    addForeignKeys: [],
    dropForeignKeys: []
});
afterEach(async () => {
    await Promise.all(connections.splice(0).map(d => d.knex.destroy()));
});
describe('migration execution', () => {
    it('normalizes PostgreSQL catalog rows without interpolating table names', async () => {
        const d = setup();
        d.respond = q =>
            q.sql.includes('information_schema.columns')
                ? [
                      {
                          column_name: 'name',
                          data_type: 'text',
                          is_nullable: 'YES'
                      }
                  ]
                : q.sql.includes('pg_indexes')
                  ? [
                        {
                            indexname: 'unique_name',
                            indexdef: 'CREATE UNIQUE INDEX',
                            columns: ['name']
                        },
                        { indexname: 'plain' }
                    ]
                  : q.sql.includes('referential_constraints')
                    ? [
                          {
                              constraint_name: 'owner_fk',
                              column_name: 'owner_id',
                              foreign_table: 'owners',
                              foreign_column: 'id',
                              delete_rule: 'CASCADE',
                              update_rule: 'RESTRICT'
                          }
                      ]
                    : [
                          {
                              conname: 'length_check',
                              definition: 'CHECK (length(name) > 0)'
                          }
                      ];
        const state = await introspectDatabase(
            d.knex,
            "items'; DROP TABLE items; --"
        );
        expect(state.columns.name).toMatchObject({
            nullable: true,
            defaultValue: null,
            maxLength: null
        });
        expect(state.indexes).toMatchObject([
            { columns: ['name'], unique: true },
            { columns: [], unique: false }
        ]);
        expect(state.foreignKeys[0].foreignTable).toBe('owners');
        expect(state.checks[0].name).toBe('length_check');
        for (const q of d.queries) {
            expect(q.sql).not.toContain('DROP TABLE');
            expect(q.bindings).toContain("items'; DROP TABLE items; --");
        }
    });
    it('applies column, index and foreign-key changes in the intended order', async () => {
        const d = setup();
        const diff = empty();
        diff.addColumns = [
            'integer',
            'character varying',
            'text',
            'boolean',
            'timestamp',
            'timestamp without time zone',
            'double precision',
            'float',
            'jsonb',
            'json',
            'uuid',
            'numeric(12,2)'
        ].map((type, i) => ({
            name: `c${i}`,
            type,
            nullable: i % 2 === 0,
            defaultValue:
                i === 0
                    ? 'now'
                    : i === 1
                      ? { raw: "'draft'" }
                      : i === 2
                        ? 'value'
                        : undefined
        }));
        diff.addColumns.push({
            name: 'owner_id',
            type: 'integer',
            nullable: false,
            references: { table: 'owners', column: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        diff.dropColumns = ['obsolete'];
        diff.alterColumns = [
            { name: 'name', changes: { nullable: { from: false, to: true } } },
            { name: 'status', changes: { nullable: { from: true, to: false } } }
        ];
        diff.addIndexes = [
            { columns: ['c0'], unique: true, name: 'unique_c0' },
            { columns: ['c1'], unique: true },
            { columns: ['c2'], unique: false, name: 'index_c2' }
        ];
        diff.dropIndexes = ['old_index'];
        diff.dropForeignKeys = ['old_fk'];
        diff.addForeignKeys = [
            {
                column: 'c0',
                foreignTable: 'owners',
                foreignColumn: 'id',
                onDelete: 'CASCADE',
                onUpdate: 'RESTRICT'
            }
        ];
        await applyDiff(d.knex, diff, 'items');
        expect(d.queries[0].sql).toContain('DROP CONSTRAINT "old_fk"');
        const sql = d.queries.map(q => q.sql).join('\n');
        expect(sql).toContain('drop column "obsolete"');
        expect(sql).toContain('alter column "name" drop not null');
        expect(sql).toContain('alter column "status" set not null');
        expect(sql).toContain('on delete CASCADE');
        expect(sql).toContain('add constraint "unique_c0" unique');
        expect(sql).toContain('drop index "old_index"');
        expect(sql).toContain('numeric(12,2)');
        const before = d.queries.length;
        await applyDiff(d.knex, empty(), 'items');
        expect(d.queries).toHaveLength(before);
        await applyDiff(
            d.knex,
            { ...empty(), dropForeignKeys: ['another_fk'] },
            'items'
        );
        expect(d.queries).toHaveLength(before + 1);
    });
    it('removes a default without deleting its column or existing data', async () => {
        const d = setup();
        await applyDiff(
            d.knex,
            {
                ...empty(),
                alterColumns: [
                    {
                        name: 'status',
                        changes: { defaultValue: { from: 'draft', to: null } }
                    }
                ]
            },
            'items'
        );
        expect(d.queries.map(q => q.sql).join('\n')).toContain(
            'ALTER COLUMN "status" DROP DEFAULT'
        );
        expect(d.queries.map(q => q.sql).join('\n')).not.toContain(
            'drop column'
        );
    });
    it('quotes default values while supporting explicit SQL defaults', async () => {
        const d = setup();
        for (const value of [
            "reviewer's draft",
            false,
            0,
            'now',
            { raw: 'CURRENT_DATE' }
        ]) {
            await applyDiff(
                d.knex,
                {
                    ...empty(),
                    alterColumns: [
                        {
                            name: 'status',
                            changes: { defaultValue: { from: null, to: value } }
                        }
                    ]
                },
                'items'
            );
        }
        expect(d.queries[0].sql).toContain("'reviewer''s draft'");
        expect(d.queries[0].bindings).toEqual([]);
        expect(d.queries[1].sql).toContain('DEFAULT false');
        expect(d.queries[2].sql).toContain('DEFAULT 0');
        expect(d.queries[3].sql).toContain('CURRENT_TIMESTAMP');
        expect(d.queries[4].sql).toContain('CURRENT_DATE');
    });

    it('generates reversible default DDL without altering column types or nullability', async () => {
        const d = setup();
        for (const value of [
            null,
            undefined,
            "reviewer's draft?\\path",
            0,
            false,
            'now',
            { raw: 'CURRENT_DATE' }
        ]) {
            const diff: MigrationDiff = {
                ...empty(),
                alterColumns: [
                    {
                        name: 'status',
                        changes: { defaultValue: { from: 'draft', to: value } }
                    }
                ]
            };
            const migration = generateMigration(diff, 'items');
            expect(migration.up).not.toContain('table.timestamp');
            expect(migration.down).not.toContain('.notNullable');
            const start = d.queries.length;
            await new Function(
                'knex',
                `return (async () => { ${migration.up} })();`
            )(d.knex);
            await new Function(
                'knex',
                `return (async () => { ${migration.down} })();`
            )(d.knex);
            expect(d.queries[start].sql).toContain(
                value == null ? 'DROP DEFAULT' : 'SET DEFAULT'
            );
            expect(d.queries[start + 1].sql).toContain("SET DEFAULT U&'draft'");
        }
    });
});
