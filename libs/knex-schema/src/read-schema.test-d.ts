import type { InferType } from '@cleverbrush/schema';
import Knex from 'knex';
import { expectTypeOf, test } from 'vitest';
import { alias, eq } from './aliased-query.js';
import { defineEntity } from './entity.js';
import { date, number, object, string } from './extension.js';
import { query } from './SchemaQueryBuilder.js';

const Task = object({
    id: number().primaryKey(),
    title: string(),
    amount: number().decimal(24, 6).optional(),
    done: date().optional()
}).hasTableName('tasks');
test('projection row type equals its runtime schema inference', async () => {
    const read = query(Knex({ client: 'pg' }), Task).select(t => ({
        id: t.id,
        amount: t.amount,
        done: t.done
    }));
    type Row = { id: number; amount: string | null; done: Date | null };
    expectTypeOf<InferType<typeof read.rowSchema>>().toEqualTypeOf<Row>();
    expectTypeOf(await read).toEqualTypeOf<Row[]>();
    // @ts-expect-error unknown columns are never accepted
    read.select(t => ({ secret: t.secret }));
});

test('flat joins retain exact storage and left join nullability', async () => {
    const read = query(Knex({ client: 'pg' }), alias(Task, 'task'))

        .leftJoin(alias(Task, 'other'), t => eq(t.task.id, t.other.id))
        .select(t => ({
            amount: t.task.amount,
            otherId: t.other.id,
            otherDate: t.other.done
        }));
    type Row = {
        amount: string | null;
        otherId: number | null;
        otherDate: Date | null;
    };
    expectTypeOf<InferType<typeof read.rowSchema>>().toEqualTypeOf<Row>();
    expectTypeOf(await read).toEqualTypeOf<Row[]>();
});

test('optional declared joins and explicit relation customizers retain their shape', async () => {
    const Owner = object({
        id: number().primaryKey(),
        name: string()
    }).hasTableName('owners');
    const WithOwner = Task.addProp('ownerId', number()).addProp(
        'owner',
        Owner.optional()
    );
    const entity = defineEntity(WithOwner).belongsTo(
        t => t.owner,
        t => t.ownerId,
        u => u.id,
        { optional: true }
    );
    const read = query(Knex({ client: 'pg' }), entity.schema).include(
        r => r.owner,
        q => q.select(u => ({ name: u.name }))
    );
    const row = (await read)[0];
    expectTypeOf(row.owner).toExtend<{ name: string } | null>();
    // @ts-expect-error the relation may be null
    const _required: { name: string } = row.owner;
    const explicit = query(Knex({ client: 'pg' }), Task)

        .select(t => ({ title: t.title }))
        .joinMany(
            {
                as: 'users',
                localColumn: t => t.id,
                foreignColumn: u => u.id,
                foreignSchema: Owner
            },
            q => q.select(u => ({ label: u.name }))
        );
    const value = (await explicit)[0];
    expectTypeOf(value.users[0].label).toEqualTypeOf<string>();
    // @ts-expect-error omitted foreign fields are not part of the selected result
    value.users[0].id;
});
