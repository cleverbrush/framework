// @cleverbrush/orm-cli — Public types
//
// Import `defineConfig` in your `db.config.ts` to get typed autocompletion.

import type { Entity } from '@cleverbrush/knex-schema';
import type { Knex } from 'knex';

/**
 * Migration-runner configuration block inside {@link OrmCliConfig}.
 */
export interface MigrationsConfig {
    /** Directory where migration files are read from / written to. */
    directory: string;
    /**
     * Knex migration tracking table name.
     * @defaultValue `'knex_migrations'`
     */
    tableName?: string;
    /**
     * Path to the schema snapshot file.  Must be committed to version control
     * — it is the source of truth for `migrate generate`.
     * @defaultValue `<directory>/snapshot.json`
     */
    snapshot?: string;
}

/**
 * Shape of the default export expected in `db.config.ts`.
 *
 * @example
 * ```ts
 * // db.config.ts
 * import { defineConfig } from '@cleverbrush/orm-cli';
 * import knex from './src/db/knex.js';
 * import { UserEntity, TodoEntity } from './src/db/schemas.js';
 *
 * export default defineConfig({
 *     knex,
 *     entities: { users: UserEntity, todos: TodoEntity },
 *     migrations: { directory: './migrations' },
 * });
 * ```
 */
export interface OrmCliConfig {
    /** A live Knex instance connected to your database. */
    knex: Knex;
    /**
     * Map of entity name to `Entity` definition.  The same map you pass to
     * `createDb()` from `@cleverbrush/orm`.
     */
    entities: Record<string, Entity<any, any>>;
    /** Migration configuration. */
    migrations: MigrationsConfig;
}

/**
 * Identity helper that provides TypeScript autocompletion for `db.config.ts`.
 *
 * @example
 * ```ts
 * export default defineConfig({ knex, entities, migrations });
 * ```
 */
export function defineConfig(config: OrmCliConfig): OrmCliConfig {
    return config;
}
