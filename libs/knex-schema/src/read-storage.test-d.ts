import type { InferType } from '@cleverbrush/schema';
import { expectTypeOf, test } from 'vitest';
import { number } from './extension.js';
import type { READ_SQL_TYPE } from './read-storage.js';

test('numeric storage metadata survives schema modifiers', () => {
    const price = number()
        .decimal(20, 4)
        .optional()
        .hasColumnName('price_value');
    expectTypeOf<InferType<typeof price>>().toEqualTypeOf<number | undefined>();
    expectTypeOf<
        (typeof price)[typeof READ_SQL_TYPE]
    >().toEqualTypeOf<'decimal'>();
    const named = number()
        .hasColumnName('price_value')
        .decimal(20, 4)
        .nullable()
        .index();
    expectTypeOf<InferType<typeof named>>().toEqualTypeOf<number | null>();
    expectTypeOf<
        (typeof named)[typeof READ_SQL_TYPE]
    >().toEqualTypeOf<'decimal'>();
    const overridden = named.columnType('integer').required().notNullable();
    expectTypeOf<
        (typeof overridden)[typeof READ_SQL_TYPE]
    >().toEqualTypeOf<'integer'>();
    expectTypeOf<InferType<typeof overridden>>().toEqualTypeOf<number>();
});
