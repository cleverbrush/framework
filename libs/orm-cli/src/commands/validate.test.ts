import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validate } from './validate.js';

const check = vi.hoisted(() => vi.fn());
vi.mock('@cleverbrush/knex-schema', () => ({
    validateEntitiesAgainstDatabase: check
}));
const keys = [
    'addColumns',
    'dropColumns',
    'alterColumns',
    'addIndexes',
    'dropIndexes',
    'addForeignKeys',
    'dropForeignKeys'
];
describe('drift diagnostics', () => {
    beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
    afterEach(() => vi.restoreAllMocks());
    it.each([0, 1, 2])(
        'summarizes all change kinds at count %s',
        async count => {
            const diff = Object.fromEntries(
                keys.map(key => [key, Array(count).fill({})])
            );
            check.mockResolvedValue({
                valid: false,
                issues: [{ type: 'schema-drift', tableName: 'items', diff }],
                checkedTables: ['items']
            });
            await expect(
                validate({ knex: {}, entities: {} } as any)
            ).rejects.toThrow('Schema drift detected');
            const output = vi.mocked(console.error).mock.calls.flat().join(' ');
            if (!count) expect(output).toContain('unknown drift');
            else {
                expect(output).toContain(
                    `${count} ${count === 1 ? 'column' : 'columns'} to add`
                );
                expect(output).toContain(
                    `${count} ${count === 1 ? 'index' : 'indexes'} to drop`
                );
                expect(output).toContain(
                    `${count} ${count === 1 ? 'foreign key' : 'foreign keys'} to add`
                );
            }
        }
    );
});
