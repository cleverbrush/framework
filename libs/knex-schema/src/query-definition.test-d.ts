import Knex from 'knex';
import { expectTypeOf, test } from 'vitest';
import {
    aggregate,
    alias,
    date,
    defineEntity,
    eq,
    number,
    object,
    parameter,
    query,
    string
} from './index.js';

const knex = Knex({ client: 'pg' });
const User = object({
    id: number().primaryKey(),
    name: string(),
    balance: number().decimal(24, 6),
    birthday: date().optional()
}).hasTableName('users');

test('connection state and parameter order survive immutable table composition', async () => {
    const all = query(User);
    expectTypeOf(all).parameters.toEqualTypeOf<[Knex.Knex]>();
    const byId = all.where(t => t.id, parameter('id'));
    expectTypeOf(byId).parameters.toEqualTypeOf<[Knex.Knex, number]>();
    expectTypeOf(byId).not.toBeAny();
    expectTypeOf(
        (await byId.query(knex, 1).update({ name: 'Jane' }))[0].name
    ).toEqualTypeOf<string>();
    const names = byId
        .orderBy('id')
        .limit(2)
        .select(t => ({ name: t.name }));
    expectTypeOf(names).parameters.toEqualTypeOf<[Knex.Knex, number]>();
    expectTypeOf(await names(knex, 1)).toEqualTypeOf<{ name: string }[]>();
    expectTypeOf(await names.query(knex, 1).first()).toEqualTypeOf<
        { name: string } | undefined
    >();
    expectTypeOf(
        names.query(knex, 1).where(t => t.name, parameter('new'))
    ).parameters.toEqualTypeOf<[string]>();
    // @ts-expect-error connection is required
    byId(1);
    // @ts-expect-error wrong parameter type
    byId(knex, '1');
    // @ts-expect-error missing value
    byId(knex);
    // @ts-expect-error no implicit connection for metadata-only definitions
    all.first();
    // @ts-expect-error native references require binding
    all.ref(t => t.id);
    // @ts-expect-error bind explicitly before writes
    byId.update({ name: 'Jane' });
    // @ts-expect-error selected readers remain non-writable after binding
    names.query(knex, 1).update({ name: 'Jane' });
    const nullable = all
        .where(t => t.birthday, parameter('when'))
        .where(t => t.balance, parameter('amount'));
    expectTypeOf(nullable).parameters.toEqualTypeOf<
        [Knex.Knex, Date | null, string]
    >();
    expectTypeOf(all.select('id', 'name')).parameters.toEqualTypeOf<
        [Knex.Knex]
    >();
    expectTypeOf(all.count()).parameters.toEqualTypeOf<[Knex.Knex]>();
    expectTypeOf(
        all
            .groupBy('name')
            .select(t => ({ name: t.name, count: aggregate.count() }))
    ).parameters.toEqualTypeOf<[Knex.Knex]>();
    expectTypeOf(all.distinct('name')).parameters.toEqualTypeOf<[Knex.Knex]>();
});

test('nested definitions, groups, aliases and variants retain strong types', async () => {
    const Task = defineEntity(
        object({
            id: number().primaryKey(),
            ownerId: number(),
            owner: User.optional()
        }).hasTableName('tasks')
    ).belongsTo(
        t => t.owner,
        t => t.ownerId,
        t => t.id
    );
    const nested = query(Task.schema)
        .include('owner', q =>
            q.where(t => t.name, parameter('name')).select('name')
        )
        .where(t => t.id, parameter('id'));
    expectTypeOf(nested).parameters.toEqualTypeOf<
        [Knex.Knex, string, number]
    >();
    expectTypeOf(await nested(knex, 'Jane', 1)).toEqualTypeOf<
        { id: number; ownerId: number; owner: { name: string } }[]
    >();
    const grouped = query(User).where(p =>
        p
            .where(t => t.id, parameter('id'))
            .orWhere(t => t.name, parameter('name'))
    );
    expectTypeOf(grouped).parameters.toEqualTypeOf<
        [Knex.Knex, number, string]
    >();
    const joined = query(alias(User, 'u'))
        .leftJoin(alias(Task.schema, 't'), t => eq(t.u.id, t.t.ownerId))
        .where(t => t.u.name, parameter('name'))
        .select(t => ({ id: t.u.id, task: t.t.id }));
    expectTypeOf(joined).parameters.toEqualTypeOf<[Knex.Knex, string]>();
    expectTypeOf(await joined(knex, 'Jane')).toEqualTypeOf<
        { id: number; task: number | null }[]
    >();
    const Asset = defineEntity(
        object({ id: number().primaryKey(), kind: string() }).hasTableName(
            'assets'
        )
    )
        .discriminator('kind')
        .stiVariant('note', object({ text: string() }))
        .stiVariant('task', Task);
    const variants = query(Asset.schema)
        .forVariant('note', q => q.where(t => t.text, parameter('text')))
        .where(t => t.id, parameter('id'));
    expectTypeOf(variants).parameters.toEqualTypeOf<
        [Knex.Knex, string, number]
    >();
    expectTypeOf(variants.selectVariants(['task'])).parameters.toEqualTypeOf<
        [Knex.Knex, number]
    >();
    const relation = query(Asset.schema).includeVariant('task', 'owner', q =>
        q.where(t => t.name, parameter('name'))
    );
    expectTypeOf(relation).parameters.toEqualTypeOf<[Knex.Knex, string]>();
    expectTypeOf(variants.query(knex, 'hi', 1)).not.toBeFunction();
});
