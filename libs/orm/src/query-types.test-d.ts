import Knex from 'knex';
import { expectTypeOf, test } from 'vitest';
import {
    alias,
    createDb,
    createQuery,
    defineEntity,
    eq,
    isSqlIdentifier,
    number,
    object,
    query,
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
const db = createDb(Knex({ client: 'pg' }), { tasks });

test('include customizers know their relation schema', () => {
    db.tasks.include(
        t => t.owner,
        owners => {
            owners.where(t => t.name, 'Alice');
            // @ts-expect-error field belongs to tasks, not users
            owners.where(t => t.ownerId, 1);
        }
    );
});

test('new terminal helpers propagate through ORM', async () => {
    expectTypeOf(await db.tasks.countValue()).toEqualTypeOf<number>();
    expectTypeOf(
        await db.tasks.countValue({ output: string() })
    ).toEqualTypeOf<string>();
});

test('ORM re-exports retain typed factories and identifier narrowing', async () => {
    const knex = Knex({ client: 'pg' });
    const bound = createQuery(knex);
    expectTypeOf(query(knex, Task)).not.toBeAny();
    expectTypeOf(
        await bound(alias(Task, 'task'))
            .leftJoin(alias(User, 'owner'), t => eq(t.task.ownerId, t.owner.id))
            .select(t => ({ id: t.task.id, ownerName: t.owner.name }))
    ).toEqualTypeOf<{ id: number; ownerName: string | null }[]>();
    // @ts-expect-error The ORM re-export must still reject unknown columns.
    query(knex, Task).select(t => ({ missing: t.missing }));
    const name: unknown = 'tasks';
    if (isSqlIdentifier(name)) expectTypeOf(name).toEqualTypeOf<string>();
});
