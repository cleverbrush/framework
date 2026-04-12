// @cleverbrush/knex-schema — Validation of join specs

import type { ObjectSchemaBuilder } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import { resolveColumnRef } from './columns.js';
import { getTableName } from './extension.js';
import type {
    JoinManySpec,
    JoinOneSpec,
    ValidatedJoinManySpec,
    ValidatedJoinOneSpec
} from './types.js';

/**
 * Resolve foreignQuery: use the provided one, or auto-derive from
 * the foreign schema's tableName extension.
 */
function resolveForeignQuery(
    spec: {
        foreignQuery?: Knex.QueryBuilder;
        foreignSchema: ObjectSchemaBuilder<any, any, any, any, any, any, any>;
    },
    knex: Knex
): Knex.QueryBuilder {
    if (spec.foreignQuery) return spec.foreignQuery;

    const tableName = getTableName(spec.foreignSchema);
    return knex(tableName);
}

export function validateJoinOne(
    spec: JoinOneSpec<any, any, any, any>,
    localSchema: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    knex: Knex
): ValidatedJoinOneSpec {
    const localColumn = resolveColumnRef(
        spec.localColumn,
        localSchema,
        'localColumn'
    );
    const foreignColumn = resolveColumnRef(
        spec.foreignColumn,
        spec.foreignSchema,
        'foreignColumn'
    );
    if (typeof spec.as !== 'string' || !spec.as) {
        throw new Error('as must be a non-empty string');
    }

    const foreignQuery = resolveForeignQuery(spec, knex);
    const required = spec.required !== false;

    if (spec.mappers !== undefined) {
        validateMappers(spec.mappers);
    }

    return {
        localColumn,
        foreignColumn,
        as: spec.as,
        required,
        foreignQuery,
        mappers: spec.mappers as Record<string, (value: any) => any> | undefined
    };
}

export function validateJoinMany(
    spec: JoinManySpec<any, any, any>,
    localSchema: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    knex: Knex
): ValidatedJoinManySpec {
    const localColumn = resolveColumnRef(
        spec.localColumn,
        localSchema,
        'localColumn'
    );
    const foreignColumn = resolveColumnRef(
        spec.foreignColumn,
        spec.foreignSchema,
        'foreignColumn'
    );
    if (typeof spec.as !== 'string' || !spec.as) {
        throw new Error('as must be a non-empty string');
    }

    const foreignQuery = resolveForeignQuery(spec, knex);

    if (spec.mappers !== undefined) {
        validateMappers(spec.mappers);
    }

    const limit =
        Number.isFinite(spec.limit) && (spec.limit as number) > 0
            ? (spec.limit as number)
            : null;
    const offset =
        Number.isFinite(spec.offset) && (spec.offset as number) > 0
            ? (spec.offset as number)
            : null;
    const orderBy = spec.orderBy
        ? {
              column: resolveColumnRef(
                  spec.orderBy.column,
                  spec.foreignSchema,
                  'orderBy.column'
              ),
              direction: spec.orderBy.direction ?? ('asc' as const)
          }
        : null;

    return {
        localColumn,
        foreignColumn,
        as: spec.as,
        foreignQuery,
        limit,
        offset,
        orderBy,
        mappers: spec.mappers as Record<string, (value: any) => any> | undefined
    };
}

function validateMappers(mappers: Record<string, unknown>): void {
    if (typeof mappers !== 'object' || mappers === null) {
        throw new Error('mappers must be an object');
    }
    for (const key of Object.keys(mappers)) {
        if (typeof mappers[key] !== 'function') {
            throw new Error(`mapper for "${key}" must be a function`);
        }
    }
}

export function validateUniqueFieldNames(specs: Array<{ as: string }>): void {
    const seen = new Set<string>();
    for (const spec of specs) {
        if (seen.has(spec.as)) {
            throw new Error(`duplicate field name: ${spec.as}`);
        }
        seen.add(spec.as);
    }
}
