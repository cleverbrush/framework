import type { InferType } from '@cleverbrush/schema';
import Knex from 'knex';
import { expectTypeOf, it } from 'vitest';
import { array, number, object, query, string } from './index.js';

it('preserves declared document types through database reads and projections', () => {
    const content = object({
        title: string(),
        tags: array(string()),
        metadata: object({ revision: number().optional() }).acceptUnknownProps()
    })
        .acceptUnknownProps()
        .jsonb();
    const schema = object({
        id: number().primaryKey(),
        document: content,
        optional: content.optional(),
        nullable: content.nullable()
    }).hasTableName('documents');
    type Content = InferType<typeof content>;
    const read = query(Knex({ client: 'pg' }), schema);
    type Row = InferType<typeof read.rowSchema>;
    expectTypeOf<Row['document']>().toEqualTypeOf<Content>();
    expectTypeOf<Row['optional']>().toEqualTypeOf<Content | null>();
    expectTypeOf<Row['nullable']>().toEqualTypeOf<Content | null>();
    const projected = read.select(t => ({ payload: t.document }));
    type Projected = InferType<typeof projected.rowSchema>;
    expectTypeOf<Projected['payload']>().toEqualTypeOf<Content>();
    expectTypeOf<Row['document']['tags']>().toEqualTypeOf<string[]>();
    // @ts-expect-error Undeclared fields are preserved, not inferred as any.
    const _arbitrary: string = ({} as Row).document.extension;
});
