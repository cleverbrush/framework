import Knex from 'knex';
import { expectTypeOf, test } from 'vitest';
import { createDb, defineEntity, number, object, string } from './index.js';

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
