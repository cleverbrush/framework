import {
    createLogger,
    consoleSink,
    fileSink,
    hostnameEnricher,
    processIdEnricher
} from '@cleverbrush/log';
import knex from 'knex';
import { config } from './config.js';
import { runMigrations } from './db/migrate.js';
import {
    AppStarting,
    ForcedShutdown,
    HttpServerClosed,
    Listening,
    MigrationsComplete,
    MigrationsRunning,
    OpenApiSpec,
    ShutdownError,
    ShutdownReceived
} from './logTemplates.js';
import { buildServer } from './server.js';

async function main() {
    // Create structured logger with console + file sinks
    const logger = createLogger({
        minimumLevel: 'debug',
        sinks: [
            consoleSink({ theme: 'dark' }),
            fileSink({
                path: './logs/app.log',
                rotation: { strategy: 'time', interval: 'daily', retainCount: 7 }
            })
        ],
        enrichers: [hostnameEnricher(), processIdEnricher()],
        handleProcessExit: true
    });

    logger.info(AppStarting, {
        Environment: config.nodeEnv
    });

    // Standalone knex instance used only for running migrations at startup.
    // The DI container manages the long-lived application instance.
    const migrationKnex = knex({
        client: 'pg',
        connection: config.db.connectionString,
        pool: { min: 1, max: 1 }
    });

    try {
        logger.info(MigrationsRunning, {});
        await runMigrations(migrationKnex, logger);
        logger.info(MigrationsComplete, {});
    } finally {
        await migrationKnex.destroy();
    }

    const server = buildServer(config, logger);
    const httpServer = await server.listen(
        config.server.port,
        config.server.host
    );

    logger.info(Listening, {
        Host: config.server.host,
        Port: config.server.port
    });
    logger.info(OpenApiSpec, {
        Host:
            config.server.host === '0.0.0.0'
                ? 'localhost'
                : config.server.host,
        Port: config.server.port
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        logger.info(ShutdownReceived, { Signal: signal });

        // Force exit if graceful shutdown takes too long
        const timer = setTimeout(() => {
            logger.fatal(ForcedShutdown, {});
            process.exit(1);
        }, 10_000);
        timer.unref();

        try {
            await httpServer.close();
            logger.info(HttpServerClosed, {});
        } catch (err) {
            logger.error(
                err instanceof Error ? err : new Error(String(err)),
                ShutdownError,
                {}
            );
        } finally {
            await logger.dispose();
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
