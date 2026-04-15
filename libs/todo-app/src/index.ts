import knex from 'knex';
import { config } from './config.js';
import { runMigrations } from './db/migrate.js';
import { buildServer } from './server.js';

async function main() {
    console.log(`[app] starting in ${config.nodeEnv} mode`);

    // Standalone knex instance used only for running migrations at startup.
    // The DI container manages the long-lived application instance.
    const migrationKnex = knex({
        client: 'pg',
        connection: config.db.connectionString,
        pool: { min: 1, max: 1 }
    });

    try {
        console.log('[app] running database migrations…');
        await runMigrations(migrationKnex);
        console.log('[app] migrations complete');
    } finally {
        await migrationKnex.destroy();
    }

    const server = buildServer(config);
    const httpServer = await server.listen(
        config.server.port,
        config.server.host
    );

    console.log(
        `[app] listening on http://${config.server.host}:${config.server.port}`
    );
    console.log(
        `[app] OpenAPI spec → http://${config.server.host === '0.0.0.0' ? 'localhost' : config.server.host}:${config.server.port}/openapi.json`
    );

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        console.log(`[app] received ${signal}, shutting down…`);

        // Force exit if graceful shutdown takes too long
        const timer = setTimeout(() => {
            console.error('[app] forced shutdown after timeout');
            process.exit(1);
        }, 10_000);
        timer.unref();

        try {
            await httpServer.close();
            console.log('[app] HTTP server closed');
        } catch (err) {
            console.error('[app] error during shutdown:', err);
        } finally {
            process.exit(0);
        }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
    console.error('[app] fatal error during startup:', err);
    process.exit(1);
});
