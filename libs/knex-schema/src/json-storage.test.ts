import Knex from 'knex';
import { expect, it } from 'vitest';
import { generateCreateTable, generateCreateTableSource } from './ddl.js';
import { jsonObject, jsonValue, number, object, string } from './extension.js';
import { encodeJsonColumn } from './json-storage.js';
import { entitySchemaToTableState } from './migration.js';
import { compileReadSchema } from './read-schema.js';

it('preserves open objects only where explicitly declared, including nested objects', () => {
    const node = compileReadSchema(
        object({
            closed: object({ type: string() }),
            open: object({ type: string() }).acceptUnknownProps()
        })
            .acceptUnknownProps()
            .jsonb()
    );
    const value = {
        closed: { type: 'x', extra: 1 },
        open: { type: 'y', extra: [null, { a: 2 }] },
        unknown: { nested: true }
    };
    const decoded = node.decode(value, 'document');
    expect(decoded).toEqual({ ...value, closed: { type: 'x' } });
    expect(node.schema.validate(decoded).valid).toBe(true);
});

it('keeps explicit JSON metadata through chaining, DDL, migrations and reads', () => {
    const schema = object({
        id: number().primaryKey(),
        payload: jsonValue().hasColumnName('data')
    }).hasTableName('documents');
    const knex = Knex({ client: 'pg' });
    expect(generateCreateTable(schema)(knex).toQuery()).toContain(
        '"data" jsonb'
    );
    expect(generateCreateTableSource(schema).up).toContain("'jsonb'");
    expect(entitySchemaToTableState(schema).columns.data.type).toBe('jsonb');
    const doc = jsonObject().jsonb().optional();
    expect(doc.getExtension('jsonDocument')).toBe('object');
    expect(compileReadSchema(doc).decode(null, 'payload')).toBeNull();
    expect(
        compileReadSchema(jsonValue().jsonb()).decode(null, 'payload')
    ).toBeNull();
    expect(() =>
        compileReadSchema(jsonObject().jsonb()).decode([], 'payload')
    ).toThrow();
});

it('validates documents before encoding root JSON values', () => {
    expect(encodeJsonColumn(jsonValue().jsonb(), 'text')).toBe('"text"');
    expect(encodeJsonColumn(jsonValue().jsonb(), null)).toBe('null');
    expect(encodeJsonColumn(jsonValue().jsonb(), [1, 2])).toBe('[1,2]');
    expect(() =>
        encodeJsonColumn(jsonObject().jsonb(), { bad: NaN })
    ).toThrow();
    expect(
        encodeJsonColumn(jsonObject().optional().jsonb(), undefined)
    ).toBeUndefined();
});
