import type { BoundQuery } from '@cleverbrush/knex-schema';
import { any } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import type { Config } from '../config.js';

/**
 * DI token for the raw Knex instance.
 * Registered as an external dependency using any().hasType<T>() so the
 * actual knex import (with native PostgreSQL bindings) stays in the factory.
 */
export const KnexToken = any().hasType<Knex>();

/**
 * DI token for the schema-aware BoundQuery created from the Knex instance.
 */
export const BoundQueryToken = any().hasType<BoundQuery>();

/**
 * DI token for the parsed application configuration.
 */
export const ConfigToken = any().hasType<Config>();
