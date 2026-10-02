import Knex, { type Knex as KnexType } from 'knex';
import { expectTypeOf, test } from 'vitest';
import {
    createDb,
    defineEntity,
    number,
    object,
    string,
    type VariantResult
} from './index.js';

const base = object({
    id: number().primaryKey(),
    kind: string(),
    title: string()
})
    .hasTableName('assets')
    .softDelete();
const body = object({
    ownerId: number().hasColumnName('owner_id'),
    caption: string()
}).hasTableName('photos');
const entity = defineEntity(base)
    .discriminator('kind')
    .ctiVariant('photo', defineEntity(body), t => t.ownerId);
const db = createDb(Knex({ client: 'pg' }), { assets: entity });
declare const trx: KnexType.Transaction;

test('variant mutations preserve types through filters and transaction binding', () => {
    const view = db.assets
        .ofVariant('photo')
        .where(t => t.id, 1)
        .withTransaction(trx)
        .transacting(trx);
    expectTypeOf(view.update({ title: 'base', caption: 'body' })).toEqualTypeOf<
        Promise<void>
    >();
    expectTypeOf(view.delete()).toEqualTypeOf<Promise<void>>();
    expectTypeOf(view.hardDelete()).toEqualTypeOf<Promise<number>>();
    expectTypeOf(view.onlyDeleted().restore()).toEqualTypeOf<
        Promise<VariantResult<typeof entity, 'photo'>[]>
    >();
    // @ts-expect-error unknown variant
    db.assets.ofVariant('missing');
    // @ts-expect-error discriminator is immutable
    view.update({ kind: 'photo' });
    // @ts-expect-error primary keys are immutable
    view.update({ id: 2 });
    // @ts-expect-error CTI join keys are managed by the framework
    view.update({ ownerId: 2 });
    // @ts-expect-error another branch's field is unavailable
    view.update({ documentText: 'text' });
    // @ts-expect-error polymorphic root is read-only
    db.assets.hardDelete();
    const projected = view.forVariant('photo', q =>
        q.select(t => ({ kind: t.kind, label: t.caption }))
    );
    // @ts-expect-error projected variants cannot be updated
    projected.update({ caption: 'text' });
    // @ts-expect-error projected variants cannot be restored
    projected.restore();
});
