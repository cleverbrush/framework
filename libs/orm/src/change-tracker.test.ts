import { date, number, object, string } from '@cleverbrush/knex-schema';
import { afterEach, describe, expect, it } from 'vitest';
import { mockDriver } from '../../knex-schema/testing/mock-driver.js';
import { ChangeTracker } from './change-tracker.js';
import { ConcurrencyError } from './errors.js';

const Row = object({
    id: number().primaryKey(),
    name: string().hasColumnName('display_name'),
    version: number().rowVersion(),
    extra: string().optional()
}).hasTableName('rows');
const drivers: ReturnType<typeof mockDriver>[] = [];
function setup(schema = Row) {
    const driver = mockDriver();
    drivers.push(driver);
    const tracker = new ChangeTracker();
    tracker.registerEntitySet({ entitySetKey: 'rows', schema });
    driver.respond = q =>
        q.sql.startsWith('update') || q.sql.startsWith('delete')
            ? [{}]
            : q.sql.startsWith('select')
              ? [{ id: 1, name: 'saved', version: 2, extra: null }]
              : q.sql.startsWith('insert')
                ? [{ id: 1, display_name: 'saved', version: 2, extra: null }]
                : [];
    return { driver, tracker };
}
afterEach(async () => {
    await Promise.all(drivers.splice(0).map(d => d.knex.destroy()));
});

describe('tracked entity transitions', () => {
    it('rejects unknown sets and untracked operations, tolerating untracked detach/reload', async () => {
        const { driver, tracker } = setup();
        expect(() => tracker.attach('missing', {})).toThrow(
            'unknown entity set'
        );
        expect(() => tracker.entry({})).toThrow('not tracked');
        expect(() => tracker.remove({})).toThrow('not tracked');
        tracker.detach({});
        await tracker.reload({}, driver.knex);
        expect(await tracker.saveChanges(driver.knex)).toEqual({
            inserted: 0,
            updated: 0,
            deleted: 0
        });
        expect(driver.queries).toEqual([]);
    });

    it('deduplicates transient attaches, clears/discards entries, and retains identity', () => {
        const { tracker } = setup();
        const added = { name: 'new', version: 1 };
        tracker.attach('rows', added);
        tracker.attach('rows', added);
        expect(tracker.pendingSummary()).toBe('(1 Added)');
        expect(tracker.entry(added).currentValues).toBe(added);
        tracker.entry(added).reset();
        expect(tracker.entry(added).state).toBe('Added');
        tracker.detach(added);
        expect(() => tracker.entry(added)).toThrow();
        const row = tracker.attach('rows', { id: 1, name: 'a', version: 1 });
        expect(
            tracker.attach('rows', { id: 1, name: 'other', version: 2 })
        ).toBe(row);
        row.name = 'changed';
        tracker.attach('rows', row);
        expect(tracker.entry(row).originalValues.name).toBe('changed');
        tracker.attach('rows', added);
        tracker.discardChanges();
        expect(() => tracker.entry(added)).toThrow();
        tracker.remove(row);
        tracker.discardChanges();
        expect(tracker.entry(row).state).toBe('Unchanged');
        tracker.attach('rows', added);
        tracker.clear();
        expect(() => tracker.entry(row)).toThrow();
        expect(() => tracker.entry(added)).toThrow();
    });

    it('commits generated IDs before refreshing snapshots and can delete the new entity', async () => {
        const { driver, tracker } = setup();
        const row = tracker.attach('rows', { name: 'new', version: 1 } as any);
        expect(await tracker.saveChanges(driver.knex)).toEqual({
            inserted: 1,
            updated: 0,
            deleted: 0
        });
        expect(row).toMatchObject({ id: 1, name: 'saved', version: 2 });
        expect(tracker.attach('rows', { id: 1 })).toBe(row);
        tracker.remove(row);
        expect(await tracker.saveChanges(driver.knex)).toEqual({
            inserted: 0,
            updated: 0,
            deleted: 1
        });
        expect(
            driver.queries.find(q => q.sql.startsWith('delete'))?.bindings
        ).toEqual([1, 2]);
    });

    it('does not commit version or snapshot changes after a failed transaction', async () => {
        const { driver, tracker } = setup();
        const row = tracker.attach('rows', {
            id: 1,
            name: 'old',
            version: 1,
            extra: undefined
        });
        row.name = 'new';
        row.extra = 'added';
        driver.respond = () => [];
        await expect(tracker.saveChanges(driver.knex)).rejects.toBeInstanceOf(
            ConcurrencyError
        );
        expect(row.version).toBe(1);
        expect(tracker.entry(row).originalValues.name).toBe('old');
        expect(driver.queries.at(-1)?.sql).toContain('ROLLBACK');
        driver.respond = q => (q.sql.startsWith('update') ? [{}] : []);
        await tracker.saveChanges(driver.knex);
        expect(row.version).toBe(2);
        expect(tracker.entry(row).isModified()).toBe(false);
    });

    it('reloads mapped columns/version and tolerates missing rows', async () => {
        const { driver, tracker } = setup();
        const row = tracker.attach('rows', { id: 1, name: 'old', version: 1 });
        row.name = 'unsaved';
        await tracker.reload(row, driver.knex);
        expect(row).toMatchObject({ name: 'saved', version: 2 });
        driver.respond = () => [];
        await tracker.reload(row, driver.knex);
        expect(row.name).toBe('saved');
    });

    it('guards deletes with row versions and rolls back concurrency failures', async () => {
        const { driver, tracker } = setup();
        const row = tracker.attach('rows', { id: 1, name: 'old', version: 1 });
        tracker.remove(row);
        driver.respond = () => [];
        await expect(tracker.saveChanges(driver.knex)).rejects.toBeInstanceOf(
            ConcurrencyError
        );
        expect(tracker.entry(row).state).toBe('Deleted');
    });

    it('generates timestamp versions only on successful updates', async () => {
        const schema = object({
            id: number().primaryKey(),
            name: string(),
            version: date().rowVersion()
        }).hasTableName('rows');
        const { driver, tracker } = setup(schema as any);
        const version = new Date('2020-01-01');
        const row = tracker.attach('rows', { id: 1, name: 'old', version });
        row.name = 'new';
        await tracker.saveChanges(driver.knex);
        expect(row.version.getTime()).toBeGreaterThan(version.getTime());
        expect(
            driver.queries.find(q => q.sql.startsWith('update'))?.bindings
        ).toContain(version);
    });
});
