import type { IServiceProvider, ServiceCollection } from '@cleverbrush/di';
import { createQuery } from '@cleverbrush/knex-schema';
import knex from 'knex';
import type { Config } from '../config.js';
import { BoundQueryToken, ConfigToken, KnexToken } from './tokens.js';

export function configureDI(services: ServiceCollection, config: Config): void {
    // Application config — available everywhere
    services.addSingleton(ConfigToken, config);

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
}
