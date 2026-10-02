import Knex from 'knex';
import { expect, it, vi } from 'vitest';
import { generateCreateTable, generateCreateTableSource } from './ddl.js';
import { array, date, number, object, string } from './extension.js';
import { encodeJsonColumn } from './json-storage.js';
import { entitySchemaToTableState } from './migration.js';
import { compileReadSchema } from './read-schema.js';

it('preserves open objects only where declared, including array elements', () => {
    const node = compileReadSchema(
        object({
            closed: object({ type: string() }),
            open: array(object({ type: string() }).acceptUnknownProps())
        })
            .acceptUnknownProps()
            .jsonb()
    );
    const value = {
        closed: { type: 'x', extra: 1 },
        open: [{ type: 'y', extra: [null, { a: 2 }] }],
        unknown: { nested: true }
    };
    const decoded = node.decode(value, 'document');
    expect(decoded).toEqual({ ...value, closed: { type: 'x' } });
    expect(node.schema.validate(decoded).valid).toBe(true);
});

it('keeps native object metadata and nullability through DDL, migrations and reads', () => {
    const document = object({}).acceptUnknownProps().jsonb();
    const schema = object({
        id: number().primaryKey(),
        payload: document.hasColumnName('data'),
        optional: document.optional(),
        nullable: document.nullable()
    }).hasTableName('documents');
    const knex = Knex({ client: 'pg' });
    const ddl = generateCreateTable(schema)(knex).toQuery();
    expect(ddl).toContain('"data" jsonb not null');
    expect(ddl).toContain('"nullable" jsonb null');
    const source = generateCreateTableSource(schema).up;
    expect(source).toContain(
        "table.specificType('data', 'jsonb').notNullable()"
    );
    expect(source).toContain(
        "table.specificType('nullable', 'jsonb').nullable()"
    );
    const state = entitySchemaToTableState(schema).columns;
    expect(state.data).toMatchObject({ type: 'jsonb', nullable: false });
    expect(state.optional.nullable).toBe(true);
    expect(state.nullable.nullable).toBe(true);
    expect(
        compileReadSchema(document.optional()).decode(null, 'payload')
    ).toBeNull();
    expect(
        compileReadSchema(document.nullable()).decode(null, 'payload')
    ).toBeNull();
    expect(() => compileReadSchema(document).decode(null, 'payload')).toThrow();
});

it('requires object roots and rejects invalid open data before encoding', () => {
    const schema = object({}).acceptUnknownProps().jsonb();
    for (const value of [
        null,
        undefined,
        [],
        'text',
        false,
        1,
        new Date(),
        { bad: NaN }
    ])
        expect(() => encodeJsonColumn(schema, value)).toThrow();
    expect(encodeJsonColumn(schema, { nested: [null, true, 2, 'text'] })).toBe(
        '{"nested":[null,true,2,"text"]}'
    );
    expect(encodeJsonColumn(schema.optional(), undefined)).toBeUndefined();
    expect(encodeJsonColumn(schema.optional(), null)).toBeNull();
    expect(encodeJsonColumn(schema.nullable(), null)).toBeNull();
    expect(() => encodeJsonColumn(schema.nullable(), undefined)).toThrow();
});

it('preserves declared date and optional field behavior without replaying input transforms', () => {
    const preprocess = vi.fn(value => value);
    const schema = object({
        seen: date(),
        absent: string().optional(),
        label: string().addPreprocessor(preprocess).default('default')
    })
        .acceptUnknownProps()
        .jsonb();
    const seen = new Date('2026-01-01T00:00:00Z');
    const encoded = encodeJsonColumn(schema, {
        seen,
        absent: undefined,
        extra: { enabled: true }
    });
    expect(JSON.parse(encoded as string)).toEqual({
        seen: seen.toISOString(),
        extra: { enabled: true }
    });
    expect(preprocess).not.toHaveBeenCalled();
    expect(() => encodeJsonColumn(schema, { seen, extra: seen })).toThrow(
        /JSON/
    );
});

it('keeps special property names as own properties in open document reads', () => {
    const node = compileReadSchema(object({}).acceptUnknownProps().jsonb());
    const value = JSON.parse(
        '{"__proto__":{"safe":true},"constructor":{"x":1}}'
    );
    const result = node.decode(value, 'document');
    expect(result).toEqual(value);
    expect(Object.hasOwn(result, '__proto__')).toBe(true);
    expect(({} as any).safe).toBeUndefined();
});
