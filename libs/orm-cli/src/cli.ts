// @cleverbrush/orm-cli — main command router

import { createRequire } from 'node:module';
import { loadConfig } from './config.js';
import type { OrmCliConfig } from './types.js';

// Read the CLI's own version at startup
const _require = createRequire(import.meta.url);
const _pkg = _require('../package.json') as { version: string };

export async function run(argv: string[]): Promise<void> {
    const [cmd, sub, ...rest] = argv;

    if (!cmd || cmd === '--help' || cmd === '-h') {
        printHelp();
        return;
    }

    if (cmd === '--version' || cmd === '-v') {
        console.log(_pkg.version ?? 'unknown');
        return;
    }

    const flags = parseFlags(rest);
    const configPath = flags['--config'] as string | undefined;

    // Track the loaded config so we can always destroy the knex pool — even
    // on error — to avoid the CLI hanging open until the pool's idle timeout
    // (Knex pools keep ~30s of TCP keep-alive connections by default).
    let loadedConfig: OrmCliConfig | undefined;

    try {
        if (cmd === 'migrate') {
            switch (sub) {
                case 'generate': {
                    // Collect positional args, skipping flag names and their
                    // values so that e.g. `--dir ./migrations` is not mistaken
                    // for the migration name.
                    let name = 'migration';
                    for (let i = 0; i < rest.length; i++) {
                        if (rest[i].startsWith('-')) {
                            const next = rest[i + 1];
                            if (next !== undefined && !next.startsWith('-'))
                                i++;
                        } else {
                            name = rest[i];
                            break;
                        }
                    }
                    loadedConfig = await loadConfig(configPath);
                    const { generate } = await import('./commands/generate.js');
                    await generate(name, loadedConfig, flags);
                    break;
                }
                case 'run': {
                    loadedConfig = await loadConfig(configPath);
                    const { run: runMigrations } = await import(
                        './commands/run.js'
                    );
                    await runMigrations(loadedConfig, flags);
                    break;
                }
                case 'rollback': {
                    loadedConfig = await loadConfig(configPath);
                    const { rollback } = await import('./commands/rollback.js');
                    await rollback(loadedConfig, flags);
                    break;
                }
                case 'status': {
                    loadedConfig = await loadConfig(configPath);
                    const { status } = await import('./commands/status.js');
                    await status(loadedConfig, flags);
                    break;
                }
                default:
                    fatal(
                        `Unknown migrate command: ${sub ?? '(none)'}. ` +
                            `Run \`cb-orm --help\` for usage.`
                    );
            }
        } else if (cmd === 'db') {
            switch (sub) {
                case 'push': {
                    loadedConfig = await loadConfig(configPath);
                    const { push } = await import('./commands/push.js');
                    await push(loadedConfig, flags);
                    break;
                }
                default:
                    fatal(
                        `Unknown db command: ${sub ?? '(none)'}. ` +
                            `Run \`cb-orm --help\` for usage.`
                    );
            }
        } else {
            fatal(`Unknown command: ${cmd}. Run \`cb-orm --help\` for usage.`);
        }
    } catch (err: unknown) {
        await destroyKnex(loadedConfig);
        console.error(
            `\nError: ${err instanceof Error ? err.message : String(err)}\n`
        );
        process.exit(1);
    }

    await destroyKnex(loadedConfig);
}

/**
 * Best-effort cleanup of the knex connection pool so the Node process can
 * exit promptly.  Swallows errors so that a destroy failure never masks a
 * real command-level error.
 */
async function destroyKnex(config: OrmCliConfig | undefined): Promise<void> {
    if (!config?.knex) return;
    try {
        await config.knex.destroy();
    } catch {
        /* ignore — exit-time cleanup */
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse `--flag` / `--flag value` pairs from an argv tail. */
export function parseFlags(args: string[]): Record<string, string | true> {
    const flags: Record<string, string | true> = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const next = args[i + 1];
            if (next !== undefined && !next.startsWith('-')) {
                flags[arg] = next;
                i++;
            } else {
                flags[arg] = true;
            }
        }
    }
    return flags;
}

function fatal(msg: string): never {
    console.error(`\nError: ${msg}\n`);
    process.exit(1);
}

function printHelp(): void {
    console.log(`
cb-orm — Schema migration CLI for @cleverbrush/orm

USAGE
  cb-orm <command> [options]

COMMANDS
  migrate generate [name]   Diff DB vs schema, emit a timestamped TS migration file (default name: "migration")
  migrate run               Apply pending migrations  (knex.migrate.latest)
  migrate rollback          Roll back last batch      (knex.migrate.rollback)
  migrate status            List applied and pending migrations
  db push                   Sync schema to DB in-place (dev only — no migration file)

OPTIONS
  --config <path>   Path to db.config.ts  (default: db.config.ts in cwd)
  --dir    <path>   Migrations directory  (overrides config.migrations.directory)
  --to     <name>   (migrate run)      Apply up to a specific migration by filename
  --all             (migrate rollback) Roll back all applied migrations
  --yes             (db push)          Skip the confirmation prompt
  --help,    -h     Show this help
  --version, -v     Show version
`);
}
