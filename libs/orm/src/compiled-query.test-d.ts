import Knex from 'knex';
import { expectTypeOf, test } from 'vitest';
import {
    createDb,
    defineEntity,
    number,
    object,
    parameter,
    string
} from './index.js';

const User = object({ id: number().primaryKey(), name: string() }).hasTableName(
    'users'
);
const Task = object({
    id: number().primaryKey(),
    ownerId: number(),
    owner: User.optional()
}).hasTableName('tasks');
const tasks = defineEntity(Task).belongsTo(
    t => t.owner,
    t => t.ownerId,
    t => t.id
);
const assets = defineEntity(
    object({ id: number().primaryKey(), kind: string() }).hasTableName('assets')
)
    .discriminator('kind')
    .stiVariant('note', object({ text: string() }));
const db = createDb(Knex({ client: 'pg' }), {
    users: defineEntity(User),
    tasks,
    assets
});

test('ORM callable readers retain lookup helpers after binding and fluent filters', async () => {
    const find = db.users
        .where(t => t.name, parameter('name'))
        .limit(5)
        .orderBy(t => t.id);
    expectTypeOf(find).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(await find('John')).toEqualTypeOf<
        { id: number; name: string }[]
    >();
    expectTypeOf(await find.query('John').find(1)).toEqualTypeOf<
        { id: number; name: string } | undefined
    >();
    // @ts-expect-error unbound ORM lookups are unavailable
    find.find(1);
    // @ts-expect-error unbound ORM mutations are unavailable
    find.update({ name: 'Jane' });
    const nested = db.tasks
        .include(
            t => t.owner,
            q => q.where(t => t.name, parameter('name'))
        )
        .where(t => t.id, parameter('id'));
    expectTypeOf(nested).parameters.toEqualTypeOf<[string, number]>();
    expectTypeOf((await nested('John', 1))[0].owner).toEqualTypeOf<{
        id: number;
        name: string;
    } | null>();
    const variant = db.assets
        .ofVariant('note')
        .where(t => t.id, parameter('id'))
        .limit(1);
    expectTypeOf(variant).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(variant.query(1).update({ text: 'hello' })).toEqualTypeOf<
        Promise<void>
    >();
    // @ts-expect-error unbound variant writes are unavailable
    variant.update({ text: 'hello' });
});
