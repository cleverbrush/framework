import type { InferType, JsonObject, JsonValue } from '@cleverbrush/schema';
import Knex from 'knex';
import { expectTypeOf, it } from 'vitest';
import { jsonObject, jsonValue, number, object, query } from './index.js';

it('preserves JSON types through database factories and projections without recursive expansion', () => {
    const schema = object({
        id: number().primaryKey(),
        document: jsonObject().jsonb(),
        value: jsonValue().jsonb()
    }).hasTableName('documents');
    const read = query(Knex({ client: 'pg' }), schema);
    type Row = InferType<typeof read.rowSchema>;
    expectTypeOf<Row['document']>().toEqualTypeOf<JsonObject>();
    expectTypeOf<Row['value']>().toEqualTypeOf<JsonValue>();
    const projected = read.select(t => ({
        payload: t.document,
        scalar: t.value
    }));
    type Projected = InferType<typeof projected.rowSchema>;
    expectTypeOf<Projected['payload']>().toEqualTypeOf<JsonObject>();
    expectTypeOf<Projected['scalar']>().toEqualTypeOf<JsonValue>();
});
