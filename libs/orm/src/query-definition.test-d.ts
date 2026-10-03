import type { Knex } from 'knex';
import { expectTypeOf, test } from 'vitest';
import { number, object, parameter, query, string } from './index.js';

const User = object({ id: number().primaryKey(), name: string() }).hasTableName(
    'users'
);
const findUser = query(User).where(t => t.id, parameter('id'));

test('ORM re-exports connection-independent definitions with strongly typed bound readers', () => {
    expectTypeOf(findUser).parameters.toEqualTypeOf<[Knex, number]>();
    expectTypeOf(findUser).returns.toEqualTypeOf<
        Promise<{ id: number; name: string }[]>
    >();
    const knex = null as unknown as Knex;
    expectTypeOf(findUser.query(knex, 1).first()).toEqualTypeOf<
        Promise<{ id: number; name: string } | undefined>
    >();
    // @ts-expect-error standalone definitions do not acquire DbContext lookup/tracking helpers
    findUser.query(knex, 1).find(1);
});
