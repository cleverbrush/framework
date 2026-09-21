import { describe, expect, it } from 'vitest';
import { alias, isSqlIdentifier, number, object } from './index.js';

describe('isSqlIdentifier', () => {
    it.each([
        'task',
        '_task',
        'task_owner2',
        'TaskOwner',
        'select'
    ])('accepts the supported single-name format: %s', name =>
        expect(isSqlIdentifier(name)).toBe(true));
    it.each([
        '',
        '2tasks',
        'public.tasks',
        'task owner',
        'task-owner',
        'task;drop',
        'task"owner',
        '"task"',
        'tâche',
        'task\n',
        null,
        undefined,
        42,
        {},
        { toString: () => 'task' }
    ])('rejects invalid names without coercing input: %s', value => {
        expect(isSqlIdentifier(value)).toBe(false);
    });
    it('makes alias creation use the same validation', () => {
        const schema = object({ id: number() }).hasTableName('tasks');
        for (const name of [
            'task.owner',
            '',
            undefined,
            { toString: () => 'task' }
        ]) {
            expect(() => alias(schema, name as string)).toThrow(
                'SQL identifier'
            );
        }
        expect(alias(schema, 'task_2').name).toBe('task_2');
    });
});
