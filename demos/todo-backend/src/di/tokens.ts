import type { BoundQuery, DbContext } from '@cleverbrush/orm';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { POLYMORPHIC_TYPE_BRAND } from '@cleverbrush/orm';
import type { Logger } from '@cleverbrush/log';
import { any } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import type { Config } from '../config.js';
import type { AppEntityMap } from '../db/schemas.js';

/**
 * DI token for the raw Knex instance.
 * Registered as an external dependency using any().hasType<T>() so the
 * actual knex import (with native PostgreSQL bindings) stays in the factory.
 */
export const KnexToken = any().hasType<Knex>();

/**
 * DI token for the schema-aware BoundQuery created from the Knex instance.
 *
 * Retained as an escape hatch for code that needs schema-bound query
 * building outside the typed entity context. Most code should prefer
 * {@link DbToken}.
 */
export const BoundQueryToken = any().hasType<BoundQuery>();

/**
 * DI token for the typed `DbContext` containing all registered entities as
 * `DbSet`s (`db.todos`, `db.users`, etc.).
 */
export const DbToken = any().hasType<DbContext<AppEntityMap>>();

/**
 * DI token for the parsed application configuration.
 */
export const ConfigToken = any().hasType<Config>();

/**
 * DI token for the structured logger.
 */
export const LoggerToken = any().hasType<Logger>();

