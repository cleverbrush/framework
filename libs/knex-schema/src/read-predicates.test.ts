import Knex, { type Knex as KnexTypes } from 'knex';
import { describe, expect, it, vi } from 'vitest';
import { alias, eq } from './aliased-query.js';
import type { AliasedColumn } from './expressions.js';
import { date, number, object, string } from './extension.js';
import type {
    ReadPredicateBuilder,
    ReadPredicateGroup
} from './read-predicates.js';
import { query } from './SchemaQueryBuilder.js';

const Task = object({
    id: number().primaryKey(),
    projectId: number().hasColumnName('project_id'),
    title: string(),
    amount: number().decimal(24, 6).optional(),
    completedAt: date().optional().hasColumnName('completed_at')
}).hasTableName('tasks');
const knex = Knex({ client: 'pg' });
const readTask = () => query(knex, Task);

describe('shape-preserving read predicates', () => {
    it('groups AND/OR conditions without mutating the source or its schema', () => {
        const source = readTask().select(t => ({ id: t.id, amount: t.amount }));
        const filtered = source
            .where(t => t.projectId, 1)
            .andWhere(p =>
                p
                    .where(t => t.title, 'one')
                    .orWhere(n =>
                        n
                            .where(t => t.id, '>', 2)
                            .whereNotNull(t => t.completedAt)
                    )
            );
        expect(filtered.rowSchema).toBe(source.rowSchema);
        expect(filtered.toQuery()).toMatch(
            /"project_id" = 1 and \(.*"title" = 'one' or \(.*"id" > 2 and .*"completed_at" is not null\)\)/
        );
        expect(source.toQuery()).not.toContain(' where ');
        expect(source.where(t => t.projectId, 2).toQuery()).not.toContain(
            "'one'"
        );
        expect(Object.keys(filtered.rowSchema.introspect().properties)).toEqual(
            ['id', 'amount']
        );
    });

    it('supports comparisons, null variants and empty membership lists', () => {
        const read = readTask();
        expect(read.where(t => t.completedAt, null).toQuery()).toContain(
            'is null'
        );
        expect(
            read.where(t => t.completedAt, 'is not', null).toQuery()
        ).toContain('is not null');
        expect(read.whereIn(t => t.id, []).toQuery()).toContain('1 = 0');
        expect(read.whereNotIn(t => t.id, []).toQuery()).toContain('1 = 1');
        const sql = read
            .where(t => t.id, 1)
            .orWhereIn(t => t.id, [2, 3])
            .orWhereNotIn(t => t.id, [4])
            .orWhereNull(t => t.completedAt)
            .orWhereNotNull(t => t.amount)
            .toQuery();
        expect(sql).toContain('in (2, 3)');
        expect(sql).toContain('not in (4)');
        expect(sql).toContain('or ');
        expect(() => read.where(t => t.id, 'unsafe operator', 1)).toThrow(
            /Unsupported comparison operator/
        );
    });

    it('captures value lists, dates and raw bindings before external mutation', () => {
        const read = readTask();
        const ids = [1, 2];
        const time = new Date('2026-01-01T00:00:00Z');
        const bindings: KnexTypes.RawBinding[] = [
            read.ref(t => t.title),
            'old'
        ];
        const filtered = read
            .whereIn(t => t.id, ids)
            .where(t => t.completedAt, '>=', time)
            .whereRaw('lower(??) = ?', bindings)
            .orderByRaw('case when ?? = ? then 0 else 1 end', bindings);
        const before = filtered.toQuery();
        ids.push(3);
        time.setUTCFullYear(2030);
        bindings[1] = 'new';
        expect(filtered.toQuery()).toBe(before);
        expect(filtered.rowSchema).toBe(read.rowSchema);
        const compiled = filtered.compile().toSQL();
        expect(compiled.sql).not.toContain("'old'");
        expect(compiled.bindings.filter(x => x === 'old')).toHaveLength(2);
    });

    it('quotes references for mapped columns and rejects foreign descriptors', () => {
        const read = readTask();
        expect(read.ref(t => t.projectId).toSQL().sql).toMatch(
            /^"__schema_read_\d+"\."project_id"$/
        );
        let other!: AliasedColumn<any>;
        readTask().ref(t => {
            other = t.id;
            return t.id;
        });
        expect(() => read.ref(() => other)).toThrow(/does not belong/);
        expect(() => read.ref(() => undefined as any)).toThrow(
            /does not belong/
        );
    });

    it('snapshots nested subquery callbacks once without executing SQL', () => {
        const event = vi.fn();
        knex.on('query', event);
        try {
            const source = readTask();
            const inner = knex('links').select('task_id').where('label', 'old');
            const callback = vi.fn((q: KnexTypes.QueryBuilder) => {
                q.whereIn('task_id', inner);
            });
            const subquery = knex('labels').select('task_id').where(callback);
            const filtered = source.whereIn(t => t.id, subquery);
            expect(callback).toHaveBeenCalledTimes(1);
            const before = filtered.toQuery();
            inner.where('label', 'changed');
            subquery.where('id', 99);
            expect(filtered.toQuery()).toBe(before);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(filtered.rowSchema).toBe(source.rowSchema);
            expect(event).not.toHaveBeenCalled();
        } finally {
            knex.removeListener('query', event);
        }
    });

    it('supports correlated EXISTS and all OR/negative subquery forms', () => {
        const read = readTask();
        const linked = knex('links')
            .select('task_id')
            .where(
                'task_id',
                read.ref(t => t.id)
            );
        const sql = read
            .whereExists(linked)
            .whereNotExists(linked)
            .orWhereExists(linked)
            .orWhereNotExists(linked)
            .whereNotIn(t => t.id, linked)
            .orWhereIn(t => t.id, linked)
            .orWhereNotIn(t => t.id, linked)
            .toQuery();
        expect(sql).toContain('exists (select');
        expect(sql).toContain('not exists (select');
        expect(sql).toContain('or exists (select');
        expect(sql).toContain('or not exists (select');
        expect(sql).toContain('not in (select');
        expect(sql).toContain('or ');
        expect(sql).toMatch(/"task_id" = "__schema_read_\d+"\."id"/);
        expect(() => read.whereExists(knex('links').delete())).toThrow(
            /SELECT subquery/
        );
        expect(() =>
            read.whereIn(t => t.id, knex('links').update({ label: 'bad' }))
        ).toThrow(/SELECT subquery/);
    });

    it('supports grouped raw predicates and escaped question-mark operators', () => {
        const read = readTask();
        const value = "' OR 1=1 --";
        const filtered = read.where(p =>
            p
                .whereRaw('?? = ?', [p.ref(t => t.title), value])
                .orWhereRaw('?::jsonb \\? ?', ['{"key":1}', 'key'])
        );
        const compiled = filtered.compile().toSQL();
        expect(compiled.sql).not.toContain(value);
        expect(compiled.bindings).toEqual([value, '{"key":1}', 'key']);
        expect(compiled.toNative().sql).toContain('::jsonb ?');
    });

    it('runs group callbacks once and isolates retained immutable builders', () => {
        const read = readTask();
        let retained!: ReadPredicateBuilder<any>;
        const callback = vi.fn((p: ReadPredicateBuilder<any>) => {
            retained = p;
            const configured = p.where(t => t.id, 1);
            for (const method of [
                'select',
                'join',
                'orderBy',
                'orderByRaw',
                'apply',
                'finish',
                'execute',
                'then'
            ])
                expect(method in p).toBe(false);
            return configured;
        });
        const filtered = read.where(callback);
        filtered.toQuery();
        filtered.toQuery();
        expect(callback).toHaveBeenCalledTimes(1);
        expect(retained.where(t => t.id, 2)).not.toBe(retained);
        expect(filtered.toQuery()).not.toContain('= 2');
        expect(filtered.toQuery()).toContain('= 1');
        expect(read.where(p => p).toQuery()).toBe(read.toQuery());
    });

    it('rejects async or throwing groups without changing their parent', async () => {
        const read = readTask();
        const asyncGroup = async (p: ReadPredicateBuilder<any>) => {
            await Promise.resolve();
            p.where(t => t.id, 1);
        };
        expect(() =>
            read.where(asyncGroup as unknown as ReadPredicateGroup<any>)
        ).toThrow(/must be synchronous/);
        expect(() =>
            read.where(p => {
                p.where(t => t.id, 1);
                throw new Error('stop');
            })
        ).toThrow('stop');
        await Promise.resolve();
        expect(read.toQuery()).not.toContain(' where ');
        expect(() => read.where(p => (p as any).select('id'))).toThrow();
    });

    it('rejects returned thenables without invoking them or executing a returned query', () => {
        const read = readTask();
        const then = vi.fn();
        expect(() => read.where((() => ({ then })) as any)).toThrow(
            /must be synchronous/
        );
        expect(then).not.toHaveBeenCalled();
        const foreign = knex('tasks').select('id');
        const execute = vi.spyOn(foreign, 'then');
        expect(() => read.where((() => foreign) as any)).toThrow(
            /must be synchronous/
        );
        expect(execute).not.toHaveBeenCalled();
    });

    it('applies the same predicates and binding snapshots to aliased joins', () => {
        const base = query(knex, alias(Task, 'task')).leftJoin(
            alias(Task, 'other'),
            t => eq(t.task.id, t.other.projectId)
        );
        const source = base.select(t => ({
            id: t.task.id,
            otherId: t.other.id,
            amount: t.other.amount
        }));
        const subquery = knex('links')
            .select('task_id')
            .where(
                'task_id',
                source.ref(t => t.task.id)
            );
        const bindings: KnexTypes.RawBinding[] = [
            source.ref(t => t.task.projectId),
            1
        ];
        const filtered = source
            .where(t => t.task.projectId, 1)
            .andWhere(p =>
                p.where(t => t.task.title, 'text').orWhereExists(subquery)
            )
            .whereIn(t => t.task.id, subquery)
            .orderByRaw('case when ?? = ? then 0 else 1 end', bindings);
        const before = filtered.toQuery();
        bindings[1] = 2;
        subquery.where('label', 'late');
        expect(filtered.toQuery()).toBe(before);
        expect(before).toContain('"task"."project_id" = 1');
        expect(before).toContain('or exists (select');
        expect(filtered.rowSchema).toBe(source.rowSchema);
        expect(
            source.rowSchema.validate({ id: 1, otherId: null, amount: null })
                .valid
        ).toBe(true);
        expect(source.toQuery()).not.toContain(' where ');
        expect('apply' in source).toBe(true);
        expect(() =>
            query(knex, alias(Task, 'task'))
                // @ts-expect-error opaque SQL requires its output contract
                .apply(q => q.where('id', 1))
        ).toThrow(/output/);
    });
});
