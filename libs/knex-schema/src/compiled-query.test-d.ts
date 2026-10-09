import Knex from 'knex';
import { expectTypeOf, test } from 'vitest';
import {
    alias,
    date,
    defineEntity,
    number,
    object,
    parameter,
    query,
    string
} from './index.js';

const db = Knex({ client: 'pg' });
const User = object({
    id: number().primaryKey(),
    name: string(),
    age: number(),
    balance: number().decimal(24, 6),
    birthday: date().optional()
}).hasTableName('users');

test('parameters infer ordered storage arguments and preserve fluent projections', async () => {
    const byId = query(db, User).where(t => t.id, parameter('id'));
    expectTypeOf(byId).not.toBeAny();
    expectTypeOf(byId).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(await byId(1)).toEqualTypeOf<
        {
            id: number;
            name: string;
            age: number;
            balance: string;
            birthday: Date | null;
        }[]
    >();
    // @ts-expect-error parameter values come from the selected schema
    byId('1');
    // @ts-expect-error missing argument
    byId();
    // @ts-expect-error extra argument
    byId(1, 2);
    // @ts-expect-error unbound readers cannot execute parameterless terminals
    byId.execute();
    // @ts-expect-error unbound readers cannot mutate data
    byId.update({ age: 30 });
    const names = byId
        .where(t => t.name, parameter('name'))
        .orderBy(t => t.id)
        .limit(3)
        .select(t => ({ name: t.name }));
    expectTypeOf(names).parameters.toEqualTypeOf<[number, string]>();
    expectTypeOf(await names(1, 'John')).toEqualTypeOf<{ name: string }[]>();
    expectTypeOf(await names.query(1, 'John').first()).toEqualTypeOf<
        { name: string } | undefined
    >();
    expectTypeOf(
        byId.where(t => t.age, parameter('id'))
    ).parameters.toEqualTypeOf<[number]>();
    // @ts-expect-error the same argument cannot be both a number and a string
    byId.where(t => t.name, parameter('id'));
    const nullable = query(db, User)
        .where(t => t.birthday, parameter('date'))
        .where(t => t.balance, parameter('amount'));
    expectTypeOf(nullable).parameters.toEqualTypeOf<[Date | null, string]>();
    expectTypeOf(
        nullable.query(null, '1.000000').where(t => t.age, parameter('new'))
    ).parameters.toEqualTypeOf<[number]>();
});

test('groups, fixed membership tuples and aliases retain parameter order', () => {
    const grouped = query(db, User)
        .where(p =>
            p
                .where(t => t.id, parameter('id'))
                .orWhere(t => t.age, parameter('age'))
        )
        .whereBetween(t => t.age, [parameter('minimum'), parameter('maximum')]);
    expectTypeOf(grouped).parameters.toEqualTypeOf<
        [number, number, number, number]
    >();
    const tuple = query(db, User).whereIn(
        t => t.id,
        [parameter('one'), 2, parameter('two'), parameter('one')]
    );
    expectTypeOf(tuple).parameters.toEqualTypeOf<[number, number]>();
    const aliased = query(db, alias(User, 'u'))
        .where(t => t.u.name, parameter('name'))
        .select(t => ({ id: t.u.id }));
    expectTypeOf(aliased).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(aliased('John')).toEqualTypeOf<Promise<{ id: number }[]>>();
});

test('untyped placeholder positions and dynamic names are rejected', () => {
    const read = query(db, User);
    // @ts-expect-error object predicates cannot infer a parameter contract
    read.where({ id: parameter('id') });
    // @ts-expect-error raw SQL has no schema-derived parameter type
    read.whereRaw('id = ?', [parameter('id')]);
    // @ts-expect-error raw ordering has no schema-derived parameter type
    read.orderByRaw('id = ?', [parameter('id')]);
    // @ts-expect-error untyped HAVING values cannot declare parameters
    read.having(t => t.id, '=', parameter('id'));
    // @ts-expect-error dynamic names cannot declare a fixed argument tuple
    parameter('id' as string);
    // @ts-expect-error empty names are not allowed
    parameter('');
    const dynamic = [parameter('id')];
    // @ts-expect-error placeholder lists must have a fixed tuple shape
    read.whereIn(t => t.id, dynamic);
    const byId = read.where(t => t.id, parameter('value'));
    // @ts-expect-error nested groups must reject incompatible reuse too
    byId.where(p => p.where(t => t.name, parameter('value')));
    // @ts-expect-error scalar comparisons cannot expand placeholder arrays
    read.where(t => t.id, [parameter('id')]);
});

test('child and variant parameters infer arguments and reject incompatible graph reuse', () => {
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
    const byOwner = query(db, Task.schema)
        .include(
            t => t.owner,
            q => q.where(t => t.name, parameter('name'))
        )
        .where(t => t.id, parameter('id'));
    expectTypeOf(byOwner).parameters.toEqualTypeOf<[string, number]>();
    query(db, Task.schema)
        .where(t => t.id, parameter('value'))
        .include(
            t => t.owner,
            // @ts-expect-error a child cannot reuse a numeric parent argument for a string
            q => q.where(t => t.name, parameter('value'))
        );
    const Asset = defineEntity(
        object({ id: number().primaryKey(), kind: string() }).hasTableName(
            'assets'
        )
    )
        .discriminator('kind')
        .stiVariant('task', Task)
        .stiVariant('note', object({ text: string() }));
    const nested = query(db, Asset.schema).includeVariant('task', 'owner', q =>
        q.where(t => t.name, parameter('name'))
    );
    expectTypeOf(nested).parameters.toEqualTypeOf<[string]>();
    const variants = query(db, Asset.schema)
        .forVariant('note', q => q.where(t => t.text, parameter('text')))
        .where(t => t.id, parameter('id'));
    expectTypeOf(variants).parameters.toEqualTypeOf<[string, number]>();
    expectTypeOf(variants.selectVariants(['task'])).parameters.toEqualTypeOf<
        [number]
    >();
    query(db, Asset.schema)
        .where(t => t.id, parameter('value'))
        // @ts-expect-error a variant cannot reuse a numeric parent argument for a string
        .forVariant('note', q => q.where(t => t.text, parameter('value')));
});
