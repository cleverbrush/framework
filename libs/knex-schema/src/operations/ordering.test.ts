import Knex from 'knex';
import { afterAll, describe, expect, it } from 'vitest';
import { compileOrder } from './ordering.js';

const knex = Knex({ client: 'pg' });
afterAll(() => knex.destroy());

describe('eager ordering compilation', () => {
    it('expands output aliases/positions while retaining raw SQL bindings', () => {
        const source = knex('tasks').orderByRaw(
            'coalesce(??, ?), ?? desc nulls last, 1 asc',
            ['title', 'a,b', 'taskId']
        );
        const compiled = compileOrder(knex, source, { taskId: 'id' })!.toSQL();
        expect(compiled.sql).toBe(
            'order by coalesce("title", ?), "id" desc nulls last, "id" asc'
        );
        expect(compiled.bindings).toEqual(['a,b']);
    });

    it('does not rewrite commas/alias text inside literals or qualified columns', () => {
        const source = knex('tasks').orderByRaw(
            'coalesce("title", \', taskId\'), length($tag$, taskId$tag$), tasks."taskId", "taskId" desc'
        );
        expect(compileOrder(knex, source, { taskId: 'id' })!.toSQL().sql).toBe(
            'order by coalesce("title", \', taskId\'),  length($tag$, taskId$tag$),  tasks."taskId", "id" desc'
        );
    });

    it('resolves positions in ordinary selections and leaves unsorted queries alone', () => {
        expect(compileOrder(knex, knex('tasks'))).toBe(null);
        expect(
            compileOrder(knex, knex('tasks').orderByRaw('2 desc'), null, [
                'title',
                'id'
            ])!.toSQL().sql
        ).toBe('order by "id" desc');
    });
});
