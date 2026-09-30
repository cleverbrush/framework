import type { InferType } from '@cleverbrush/schema';
import Knex from 'knex';
import { expectTypeOf, test } from 'vitest';
import { number, object, string } from './extension.js';
import { query } from './query.js';

const db = Knex({ client: 'pg' });
const User = object({
    id: number().bigint().primaryKey(),
    name: string(),
    settings: object({ enabled: number() })
}).hasTableName('users');

test('automatic projections preserve exact structural row types', async () => {
    const users = query(db, User);
    const selected = users.select(u => ({ userId: u.id, displayName: u.name }));
    type Row = InferType<typeof selected.rowSchema>;
    expectTypeOf<Row>().toEqualTypeOf<{
        userId: string;
        displayName: string;
    }>();
    expectTypeOf(await selected.first()).toEqualTypeOf<Row | undefined>();
    const ids = users.select(u => u.id);
    expectTypeOf<InferType<typeof ids.rowSchema>>().toEqualTypeOf<{
        id: string;
    }>();
    const nested = users.select(u => ({ enabled: u.settings.enabled }));
    expectTypeOf<InferType<typeof nested.rowSchema>>().toEqualTypeOf<{
        enabled: number;
    }>();
    // @ts-expect-error projected queries cannot update entities
    selected.update({ name: 'unsafe' });
    // @ts-expect-error projected queries cannot insert entities
    selected.insert({ name: 'unsafe' });
    // @ts-expect-error grouped predicate callbacks must return their configured builder
    users.where(group => {
        group.where('name', 'discarded');
    });
    // @ts-expect-error raw SQL cannot infer its output shape
    users.apply(sql => sql.select('*'));
    // @ts-expect-error removed opt-in method has no compatibility alias
    users.withRowSchema();
    // Lossless storage representations are valid update values.
    users.update({ id: '9007199254740993' });
    // @ts-expect-error grouped sources cannot write entities
    users.groupBy(u => u.name).update({ name: 'unsafe' });
    // @ts-expect-error distinct sources cannot write entities
    users.distinct().delete();
    // @ts-expect-error HAVING queries are grouped read-only sources
    users.havingRaw('count(*) > 0').delete();
    User.scope('named', scope => {
        // @ts-expect-error scopes cannot change projections
        scope.where('name', 'x').select('id');
        return scope.where('name', 'x');
    });
    // @ts-expect-error scope callbacks cannot discard their immutable result
    User.defaultScope(scope => {
        scope.where('name', 'x');
    });
});
