import { generateCreateTable, getTableName } from '@cleverbrush/knex-schema';
import knex from 'knex';
import { describe, expect, it } from 'vitest';
import { storageSchemas } from './schema.js';

describe('PostgreSQL schemas', () => {
    it('derives migration columns and composite keys with Framework schemas', () => {
        const schemas = storageSchemas({ tablePrefix: 'test_jobs' });
        const db = knex({ client: 'pg' });
        const sql = generateCreateTable(schemas.events)(db).toQuery();
        expect(sql).toContain('primary key ("runId", "sequence")');
        expect(getTableName(schemas.runs)).toBe('test_jobs_runs');
    });
    it('rejects untrusted identifiers', () => {
        expect(() =>
            storageSchemas({ tablePrefix: 'jobs; drop table' })
        ).toThrow();
    });
});
