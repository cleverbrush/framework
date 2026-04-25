import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import http from 'node:http';
import { config } from '../support/env.js';
import { closePool } from '../support/db.js';
import { pingClickhouse } from '../support/clickhouse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../..');
const COMPOSE_FILE = path.join(REPO_ROOT, 'demos/docker-compose.yml');
const TODO_BACKEND_DIR = path.join(REPO_ROOT, 'demos/todo-backend');

/** Infrastructure services we always need from docker-compose. */
const INFRA_SERVICES = ['postgres', 'clickstack'] as const;
/** Application services that may also be supplied externally (e.g. `npm run dev:demo`). */
const APP_SERVICES = ['backend', 'frontend'] as const;

/** Promise-friendly wrapper around `docker compose ...`. */
async function compose(args: string[]): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        const child = spawn('docker', ['compose', '-f', COMPOSE_FILE, ...args], {
            stdio: 'inherit',
            cwd: REPO_ROOT
        });
        child.on('error', reject);
        child.on('exit', code => {
            if (code === 0) resolve();
            else
                reject(
                    new Error(
                        `docker compose ${args.join(' ')} exited with code ${code}`
                    )
                );
        });
    });
}

/** Poll an HTTP URL until it returns any 2xx/3xx/4xx status (i.e. accepting connections). */
function waitForHttp(url: string, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve, reject) => {
        const tick = () => {
            const req = http.get(url, res => {
                res.resume();
                if (res.statusCode && res.statusCode < 500) {
                    resolve();
                } else {
                    retry();
                }
            });
            req.on('error', () => retry());
            req.setTimeout(2_000, () => {
                req.destroy();
                retry();
            });
        };
        const retry = () => {
            if (Date.now() >= deadline) {
                reject(
                    new Error(`Timed out after ${timeoutMs}ms waiting for ${url}`)
                );
                return;
            }
            setTimeout(tick, 1_000);
        };
        tick();
    });
}

/** Check whether an HTTP URL responds (any status) within `timeoutMs`. */
async function isReachable(url: string, timeoutMs = 1_500): Promise<boolean> {
    return new Promise(resolve => {
        const req = http.get(url, res => {
            res.resume();
            resolve(true);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(timeoutMs, () => {
            req.destroy();
            resolve(false);
        });
    });
}

/** Run pending DB migrations against the dockerized Postgres. */
async function runMigrations(): Promise<void> {
    // cb-orm currently keeps the knex pool open after migrations complete,
    // so the process lingers ~30s. Wrap in a timeout (mirrors dev-demo.sh).
    await new Promise<void>((resolve, reject) => {
        const child = spawn('timeout', ['--preserve-status', '60s', 'npm', 'run', 'db:run'], {
            stdio: 'inherit',
            cwd: TODO_BACKEND_DIR,
            env: {
                ...process.env,
                DB_HOST: config.postgres.host,
                DB_PORT: String(config.postgres.port),
                DB_NAME: config.postgres.database,
                DB_USER: config.postgres.user,
                DB_PASSWORD: config.postgres.password
            }
        });
        child.on('error', reject);
        child.on('exit', code => {
            // 0 = clean exit, 124 = SIGTERM from `timeout` (still success),
            // 143 = same on some systems.
            if (code === 0 || code === 124 || code === 143) resolve();
            else reject(new Error(`Migrations failed with exit code ${code}`));
        });
    });
}

export async function setup(): Promise<() => Promise<void>> {
    const started = Date.now();
    console.log('▶ E2E global setup starting…');

    if (config.reset) {
        console.log('  ↻ RESET=1: wiping docker volumes');
        await compose(['down', '-v']);
    }

    // Only start app services from docker-compose if nothing is already
    // serving the configured ports. This lets developers iterate against
    // `npm run dev:demo` (host-process backend/frontend with hot reload)
    // without docker rebuilding the image on every test run.
    const [backendUp, frontendUp] = await Promise.all([
        isReachable(`${config.apiUrl}/health`),
        isReachable(config.frontendUrl)
    ]);
    const externalApp = backendUp && frontendUp;
    if (externalApp) {
        console.log('  ✓ Reusing externally-running backend + frontend');
    }

    const servicesToStart: string[] = [...INFRA_SERVICES];
    if (!externalApp) servicesToStart.push(...APP_SERVICES);

    console.log(
        `  ▶ docker compose up -d --build ${servicesToStart.join(' ')} (first run can take a few minutes)`
    );
    await compose(['up', '-d', '--build', ...servicesToStart]);

    console.log('  ▶ Waiting for services to become healthy');
    await Promise.all([
        waitForHttp(`${config.apiUrl}/health`, 120_000).then(() =>
            console.log('    ✓ backend')
        ),
        waitForHttp(config.frontendUrl, 120_000).then(() =>
            console.log('    ✓ frontend')
        ),
        pingClickhouse(120_000).then(() => console.log('    ✓ clickhouse'))
    ]);

    console.log('  ▶ Running migrations');
    await runMigrations();

    console.log(
        `▶ E2E global setup complete (${((Date.now() - started) / 1000).toFixed(1)}s)`
    );

    return async () => {
        await closePool().catch(() => {});
        if (config.keepStack) {
            console.log('▶ KEEP_STACK=1: leaving docker compose stack running');
            return;
        }
        console.log('▶ docker compose stop');
        await compose([
            'stop',
            ...INFRA_SERVICES,
            ...APP_SERVICES
        ]).catch(err => console.warn(`  (failed to stop: ${err.message})`));
    };
}

export default setup;
