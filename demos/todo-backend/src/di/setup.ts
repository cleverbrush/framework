import type { IServiceProvider, ServiceCollection } from '@cleverbrush/di';
import { createQuery } from '@cleverbrush/orm';
import type { Logger } from '@cleverbrush/log';
import { createDb } from '@cleverbrush/orm';
import knex from 'knex';
import type { Config } from '../config.js';
import { entityMap } from '../db/schemas.js';
import {
    BoundQueryToken,
    ConfigToken,
    DbToken,
    KnexToken,
    LoggerToken
} from './tokens.js';

export function configureDI(
    services: ServiceCollection,
    config: Config,
    logger: Logger
): void {
    // Application config — available everywhere
    services.addSingleton(ConfigToken, config);

    // Structured logger — available everywhere via DI
    services.addSingleton(LoggerToken, logger);

    // Knex instance — single connection pool for the whole application
    services.addSingleton(KnexToken, () =>
        knex({
            client: 'pg',
            connection: config.db.connectionString,
            pool: { min: 2, max: 10 },
            acquireConnectionTimeout: 10_000
        })
    );

    // Schema-aware BoundQuery — wraps knex with type-safe query builder
    services.addSingleton(BoundQueryToken, (provider: IServiceProvider) => {
        const knexInstance = provider.get(KnexToken) as Parameters<
            typeof createQuery
        >[0];
        return createQuery(knexInstance);
    });

    // Typed DbContext — `db.todos`, `db.users`, ... with `.include()`,
    // `.where()`, etc. exposed as `DbSet` instances per entity.
    services.addSingleton(DbToken, (provider: IServiceProvider) => {
        const knexInstance = provider.get(KnexToken) as Parameters<
            typeof createDb
        >[0];
        return createDb(knexInstance, entityMap);
    });
}

