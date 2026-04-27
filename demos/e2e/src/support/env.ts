/**
 * Centralised configuration for the E2E suite. All URLs/credentials default
 * to the values exposed by `demos/docker-compose.yml`.
 */

const num = (v: string | undefined, fallback: number) =>
    v && v.length > 0 ? Number(v) : fallback;

export const config = {
    /** Backend HTTP base URL */
    apiUrl:
        process.env.E2E_API_URL ||
        `http://localhost:${num(process.env.APP_PORT, 3000)}`,
    /** Backend WebSocket base URL */
    wsUrl:
        process.env.E2E_WS_URL ||
        `ws://localhost:${num(process.env.APP_PORT, 3000)}`,
    /** Frontend base URL */
    frontendUrl:
        process.env.E2E_FRONTEND_URL ||
        `http://localhost:${num(process.env.FRONTEND_PORT, 5173)}`,
    /** ClickHouse HTTP endpoint */
    clickhouseUrl:
        process.env.E2E_CLICKHOUSE_URL || 'http://localhost:8123',
    clickhouseUser: process.env.E2E_CLICKHOUSE_USER || 'api',
    clickhousePassword: process.env.E2E_CLICKHOUSE_PASSWORD || 'api',
    /** Postgres connection (matches docker-compose host-mapped port). */
    postgres: {
        host: process.env.E2E_PG_HOST || process.env.DB_HOST || 'localhost',
        port: num(process.env.E2E_PG_PORT || process.env.E2E_DB_PORT, 5445),
        database:
            process.env.E2E_PG_DATABASE ||
            process.env.POSTGRES_DB ||
            'todo_db',
        user:
            process.env.E2E_PG_USER ||
            process.env.POSTGRES_USER ||
            'todo_user',
        password:
            process.env.E2E_PG_PASSWORD ||
            process.env.POSTGRES_PASSWORD ||
            'todo_secret'
    },
    /**
     * If true, global setup tears down compose volumes before bringing
     * services up — guarantees an empty database. Required for the very
     * first run after schema changes.
     */
    reset: process.env.RESET === '1' || process.env.RESET === 'true',
    /**
     * If true, the suite leaves containers running after teardown so a
     * developer can poke at the DB / SigNoz UI.  Implied by
     * non-CI runs unless `CI=true` or `KEEP_STACK=0` is set.
     */
    keepStack:
        process.env.KEEP_STACK === '1' ||
        process.env.KEEP_STACK === 'true' ||
        (process.env.CI !== 'true' && process.env.KEEP_STACK !== '0'),
    /** Run Playwright in headed mode for local debugging. */
    headed: process.env.HEADED === '1' || process.env.HEADED === 'true',
    /** Slow-motion pause for headed Playwright runs (ms). */
    slowMo: num(process.env.SLOWMO, 0)
};
