import {
    number as outputNumber,
    object as outputObject
} from '@cleverbrush/schema';
import Knex from 'knex';
import { describe, expect, it, vi } from 'vitest';
import { defineEntity } from './entity.js';
import { number, object, string } from './extension.js';
import { createQuery, query } from './query.js';

const knex = Knex({ client: 'pg' });
const Account = object({
    id: number().primaryKey(),
    name: string(),
    active: number()
}).hasTableName('accounts');

describe('immutable public queries', () => {
    it('owns polymorphic ordering columns and rejects visibility-changing scopes', () => {
        const Asset = defineEntity(
            object({ id: number().primaryKey(), kind: string() }).hasTableName(
                'assets'
            )
        )
            .discriminator('kind')
            .stiVariant('note', object({ text: string() }));
        const one = query(knex, Asset.schema);
        const two = query(knex, Asset.schema);
        let foreign: any;
        one.orderBy(c => {
            foreign = c.id;
            return c.id;
        });
        expect(() => two.orderBy(() => foreign)).toThrow(/does not belong/);
        const invalid = Asset.schema.defaultScope(((q: any) =>
            q.withDeleted()) as any);
        expect(() => query(knex, invalid)).toThrow(/shape-preserving/);
    });
    it('rejects removed raw-source overloads instead of silently dropping SQL', () => {
        expect(() => (query as any)(knex, Account, knex('accounts'))).toThrow(
            /output/
        );
        expect(() =>
            (createQuery(knex) as any)(Account, knex('accounts'))
        ).toThrow(/output/);
    });
    it('derives metadata automatically and preserves it across filters and paging', () => {
        const base = query(knex, Account);
        const one = base.where('id', 1).limit(1);
        const two = base.where('id', 2).offset(3);
        expect(one).not.toBe(base);
        expect(one.rowSchema).toBe(base.rowSchema);
        expect(two.rowSchema).toBe(base.rowSchema);
        expect(base.toQuery()).not.toContain('where');
        expect(one.toQuery()).toContain('= 1');
        expect(two.toQuery()).toContain('= 2');
        expect('withRowSchema' in base).toBe(false);
    });

    it('replaces projections without mutating either source', () => {
        const base = query(knex, Account);
        const named = base.select(t => ({ name: t.name }));
        const ids = named.select(t => ({ key: t.id }));
        expect(Object.keys(base.rowSchema.introspect().properties)).toEqual([
            'id',
            'name',
            'active'
        ]);
        expect(Object.keys(named.rowSchema.introspect().properties)).toEqual([
            'name'
        ]);
        expect(Object.keys(ids.rowSchema.introspect().properties)).toEqual([
            'key'
        ]);
        expect(ids.rowSchema).not.toBe(named.rowSchema);
    });

    it('runs groups once and ignores discarded immutable branches', () => {
        let retained: any;
        const callback = vi.fn(group => {
            retained = group;
            group.where('id', 99);
            return group.where('id', 1).orWhere('id', 2);
        });
        const filtered = query(knex, Account).where(callback);
        retained.where('id', 3);
        expect(filtered.toQuery()).toContain('= 1 or');
        expect(filtered.toQuery()).not.toContain('99');
        expect(filtered.toQuery()).not.toContain('= 3');
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('rejects void, async and unrelated group results without executing them', () => {
        const base = query(knex, Account);
        expect(() => base.where((() => undefined) as any)).toThrow(
            /must return/
        );
        expect(() => base.where((async () => undefined) as any)).toThrow(
            /synchronous/
        );
        expect(() => base.where((() => base) as any)).toThrow(
            /synchronous|must return/
        );
    });

    it('captures default scopes once and removes only their effects', () => {
        const scope = vi.fn(q => q.where('active', 1));
        const schema = Account.defaultScope(scope);
        const base = query(knex, schema);
        const explicit = base.where('id', 7);
        const unscoped = explicit.unscoped();
        expect(explicit.toQuery()).toMatch(/"active" = 1/);
        expect(unscoped.toQuery()).not.toMatch(/"active" = 1/);
        expect(unscoped.toQuery()).toMatch(/"id" = 7/);
        expect(scope).toHaveBeenCalledTimes(1);
        expect(unscoped.rowSchema).toBe(base.rowSchema);
    });

    it('isolates mutable Knex snapshots', () => {
        const base = query(knex, Account).where('active', 1);
        const snapshot = base.toKnexQuery();
        snapshot.where('id', 9).limit(1);
        expect(base.toQuery()).not.toContain('= 9');
        expect(base.toQuery()).not.toContain('limit');
    });

    it('captures opaque SQL once and requires an explicit object output', () => {
        const output = outputObject({ total: outputNumber().coerce() });
        let retained: any;
        const configure = vi.fn(sql => {
            retained = sql;
            return sql.clearSelect().count({ total: '*' });
        });
        const raw = query(knex, Account).apply(configure, { output });
        retained.where('id', 99);
        expect(raw.rowSchema).toBe(output);
        expect(raw.toQuery()).toContain('count(*)');
        expect(raw.toQuery()).not.toContain('99');
        raw.toQuery();
        expect(configure).toHaveBeenCalledTimes(1);
        expect(() =>
            (query(knex, Account) as any).selectRaw('1 as total', [])
        ).toThrow(/output/);
    });

    it('rejects writes through projected query instances at runtime too', async () => {
        const selected = query(knex, Account).select(t => ({ name: t.name }));
        await expect(
            (selected as any).insert({ name: 'unsafe' })
        ).rejects.toThrow(/unprojected/);
        await expect(
            (selected as any).update({ name: 'unsafe' })
        ).rejects.toThrow(/unprojected/);
        await expect((selected as any).insertMany([])).rejects.toThrow(
            /unprojected/
        );
        await expect(
            (query(knex, Account).havingRaw('count(*) > 0') as any).update({
                name: 'unsafe'
            })
        ).rejects.toThrow(/unprojected/);
    });
});
