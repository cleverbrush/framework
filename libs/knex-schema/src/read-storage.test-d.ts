import {
    type InferExtensionMetadata,
    type InferType,
    number as plainNumber
} from '@cleverbrush/schema';
import { expectTypeOf, test } from 'vitest';
import { number, type PRIMARY_KEY_BRAND } from './extension.js';
import type { ReadValue } from './read-schema.js';

test('numeric storage metadata survives schema modifiers', () => {
    const price = number()
        .decimal(20, 4)
        .optional()
        .hasColumnName('price_value');
    expectTypeOf<InferType<typeof price>>().toEqualTypeOf<number | undefined>();
    expectTypeOf<
        InferExtensionMetadata<typeof price>['columnType']
    >().toEqualTypeOf<`decimal(${number},${number})`>();
    const named = number()
        .hasColumnName('price_value')
        .decimal(20, 4)
        .nullable()
        .index();
    expectTypeOf<InferType<typeof named>>().toEqualTypeOf<number | null>();
    expectTypeOf<
        InferExtensionMetadata<typeof named>['columnType']
    >().toEqualTypeOf<`decimal(${number},${number})`>();
    const overridden = named.columnType('integer').required().notNullable();
    expectTypeOf<
        InferExtensionMetadata<typeof overridden>['columnType']
    >().toEqualTypeOf<'integer'>();
    expectTypeOf<InferType<typeof overridden>>().toEqualTypeOf<number>();
});

test('storage inference retains precision, dynamic types and other brands', () => {
    const id = number().primaryKey().bigint().optional().hasColumnName('key');
    expectTypeOf<ReadValue<typeof id>>().toEqualTypeOf<string | null>();
    expectTypeOf<
        NonNullable<(typeof id)[typeof PRIMARY_KEY_BRAND]>
    >().toEqualTypeOf<true>();
    const small = id.smallint().required();
    expectTypeOf<ReadValue<typeof small>>().toEqualTypeOf<number>();
    const exact = small.columnType('NUMERIC(24,6)').nullable().index();
    expectTypeOf<ReadValue<typeof exact>>().toEqualTypeOf<string | null>();
    const dynamic = (type: string) => number().columnType(type).optional();
    expectTypeOf<ReadValue<ReturnType<typeof dynamic>>>().toEqualTypeOf<
        number | string | null
    >();
    // @ts-expect-error storage types must be strings
    number().columnType(5);
});

test('database methods do not augment plain schema numbers', () => {
    // @ts-expect-error database storage methods require the database factory
    plainNumber().bigint();
    // @ts-expect-error database storage methods require the database factory
    plainNumber().decimal(10, 2);
    // @ts-expect-error database storage methods require the database factory
    plainNumber().columnType('integer');
    // @ts-expect-error database storage methods require the database factory
    plainNumber().smallint();
});
