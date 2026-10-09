import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from './cli.js';

const commands = vi.hoisted(() => ({
    load: vi.fn(),
    generate: vi.fn(),
    migrate: vi.fn(),
    rollback: vi.fn(),
    status: vi.fn(),
    push: vi.fn(),
    validate: vi.fn()
}));
vi.mock('./config.js', () => ({ loadConfig: commands.load }));
vi.mock('./commands/generate.js', () => ({ generate: commands.generate }));
vi.mock('./commands/run.js', () => ({ run: commands.migrate }));
vi.mock('./commands/rollback.js', () => ({ rollback: commands.rollback }));
vi.mock('./commands/status.js', () => ({ status: commands.status }));
vi.mock('./commands/push.js', () => ({ push: commands.push }));
vi.mock('./commands/validate.js', () => ({ validate: commands.validate }));

describe('CLI routing and connection cleanup', () => {
    const destroy = vi.fn();
    const config = { knex: { destroy } };
    beforeEach(() => {
        vi.resetAllMocks();
        commands.load.mockResolvedValue(config);
        destroy.mockResolvedValue(undefined);
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process exited');
        });
    });
    afterEach(() => vi.restoreAllMocks());

    it.each([[], ['--help'], ['-h'], ['--version'], ['-v']])(
        'prints informational output without opening the database: %j',
        async (...args) => {
            await run(args);
            expect(console.log).toHaveBeenCalled();
            expect(commands.load).not.toHaveBeenCalled();
            expect(destroy).not.toHaveBeenCalled();
        }
    );

    it.each([
        ['run', 'migrate', '--to', 'initial.ts'],
        ['rollback', 'rollback', '--all'],
        ['status', 'status', '--dir', 'migrations']
    ])(
        'routes migrate %s and destroys the pool',
        async (sub, key, ...flags) => {
            await run(['migrate', sub, ...flags, '--config', 'database.ts']);
            expect(commands.load).toHaveBeenCalledWith('database.ts');
            expect(commands[key]).toHaveBeenCalledWith(
                config,
                expect.objectContaining({ '--config': 'database.ts' })
            );
            expect(destroy).toHaveBeenCalledOnce();
        }
    );

    it('skips flags when choosing migration names and supplies the default', async () => {
        await run([
            'migrate',
            'generate',
            '--dir',
            'tmp',
            '--yes',
            '--config',
            'db.ts',
            'add_users'
        ]);
        expect(commands.generate).toHaveBeenLastCalledWith(
            'add_users',
            config,
            { '--dir': 'tmp', '--yes': true, '--config': 'db.ts' }
        );
        await run(['migrate', 'generate']);
        expect(commands.generate).toHaveBeenLastCalledWith(
            'migration',
            config,
            {}
        );
    });

    it('routes push and tolerates cleanup failures', async () => {
        destroy.mockRejectedValue(new Error('pool already closed'));
        await run(['db', 'push', '--yes']);
        expect(commands.push).toHaveBeenCalledWith(config, { '--yes': true });
        expect(process.exit).not.toHaveBeenCalled();
    });

    it.each([new Error('database offline'), 'database offline'])(
        'reports command failures after closing the pool',
        async error => {
            commands.validate.mockRejectedValue(error);
            await expect(run(['validate'])).rejects.toThrow('process exited');
            expect(destroy).toHaveBeenCalledOnce();
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('database offline')
            );
            expect(process.exit).toHaveBeenCalledWith(1);
        }
    );

    it('reports configuration failures without a pool', async () => {
        commands.load.mockRejectedValue(new Error('configuration missing'));
        await expect(run(['validate'])).rejects.toThrow('process exited');
        expect(destroy).not.toHaveBeenCalled();
    });

    it.each([
        ['unknown'],
        ['migrate'],
        ['migrate', 'unknown'],
        ['db'],
        ['db', 'unknown']
    ])('rejects unknown commands: %j', async (...args) => {
        await expect(run(args)).rejects.toThrow('process exited');
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Unknown')
        );
        expect(commands.load).not.toHaveBeenCalled();
    });
});
