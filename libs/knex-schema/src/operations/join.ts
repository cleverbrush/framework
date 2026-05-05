// @cleverbrush/knex-schema — Eager-loading JOIN operations (joinOne, joinMany, include, includeVariant)

import type { Knex } from 'knex';
import { resolveColumnRef } from '../columns.js';
import { getTableName } from '../extension.js';
import type { SchemaQueryBuilder } from '../SchemaQueryBuilder.js';
import type {
    JoinManySpec,
    JoinOneSpec,
    RelationSpec,
    ResolvedVariantRelationSpec
} from '../types.js';
import {
    validateJoinMany,
    validateJoinOne,
    validateUniqueFieldNames
} from '../validate.js';
import {
    findPrimaryKeyColumn,
    getSchemaQueryBuilderCtor,
    getVariantConfig,
    invalidateCache,
    resolveSchema
} from './helpers.js';
import { getState } from './state.js';

export function joinOneImpl(
    builder: SchemaQueryBuilder<any, any>,
    spec: JoinOneSpec<any, any, any, any>
): any {
    const state = getState(builder);
    const validated = validateJoinOne(spec, state.localSchema, state.knex);
    state.specs.push({ type: 'one' as const, ...validated });
    validateUniqueFieldNames(state.specs);
    invalidateCache(builder);
    return builder;
}

export function joinManyImpl(
    builder: SchemaQueryBuilder<any, any>,
    spec: JoinManySpec<any, any, any>
): any {
    const state = getState(builder);
    const validated = validateJoinMany(spec, state.localSchema, state.knex);
    state.specs.push({ type: 'many' as const, ...validated });
    validateUniqueFieldNames(state.specs);
    invalidateCache(builder);
    return builder;
}

export function includeImpl(
    builder: SchemaQueryBuilder<any, any>,
    relationName: string,
    customize?: (q: SchemaQueryBuilder<any, any>) => void
): any {
    const state = getState(builder);
    invalidateCache(builder);
    const relations: RelationSpec[] =
        (state.localSchema as any).getExtension?.('relations') ?? [];
    const relation = relations.find(
        (r: RelationSpec) => r.name === relationName
    );
    if (!relation) {
        const variantConfig = getVariantConfig(builder);
        if (variantConfig) {
            const matches: Array<{ variantKey: string }> = [];
            for (const [vKey, vSpec] of Object.entries(
                variantConfig.variants
            )) {
                if (
                    vSpec.relations.some(
                        (r: ResolvedVariantRelationSpec) =>
                            r.name === relationName
                    )
                ) {
                    matches.push({ variantKey: vKey });
                }
            }
            if (matches.length === 1) {
                return includeVariantImpl(
                    builder,
                    matches[0].variantKey,
                    relationName,
                    customize
                );
            }
            if (matches.length > 1) {
                throw new Error(
                    `Ambiguous relation "${relationName}" — found on variants: ${matches.map(m => m.variantKey).join(', ')}. Use .includeVariant(key, name) to be explicit.`
                );
            }
        }
        throw new Error(
            `Unknown relation "${relationName}" on schema for table "${state.tableName}"`
        );
    }

    const foreignSchema = resolveSchema(builder, relation.schema);
    const foreignTableName = getTableName(foreignSchema);

    switch (relation.type) {
        case 'belongsTo': {
            const localColumn = resolveColumnRef(
                relation.foreignKey,
                state.localSchema,
                'foreignKey'
            );
            const foreignColumn = findPrimaryKeyColumn(builder, foreignSchema);

            const foreignQuery1: Knex.QueryBuilder =
                state.knex(foreignTableName);
            if (customize) {
                const SQB = getSchemaQueryBuilderCtor();
                const proxy = new SQB(state.knex, foreignSchema, foreignQuery1);
                customize(proxy);
            }

            joinOneImpl(builder, {
                foreignSchema,
                localColumn,
                foreignColumn,
                as: relationName,
                foreignQuery: foreignQuery1
            } as any);
            break;
        }
        case 'hasOne': {
            const localColumn = findPrimaryKeyColumn(
                builder,
                state.localSchema
            );
            const foreignColumn = resolveColumnRef(
                relation.foreignKey,
                foreignSchema,
                'foreignKey'
            );

            const foreignQuery2: Knex.QueryBuilder =
                state.knex(foreignTableName);
            if (customize) {
                const SQB = getSchemaQueryBuilderCtor();
                const proxy = new SQB(state.knex, foreignSchema, foreignQuery2);
                customize(proxy);
            }

            joinOneImpl(builder, {
                foreignSchema,
                localColumn,
                foreignColumn,
                as: relationName,
                required: false,
                foreignQuery: foreignQuery2
            } as any);
            break;
        }
        case 'hasMany': {
            const localColumn = findPrimaryKeyColumn(
                builder,
                state.localSchema
            );
            const foreignColumn = resolveColumnRef(
                relation.foreignKey,
                foreignSchema,
                'foreignKey'
            );

            const foreignQuery3: Knex.QueryBuilder =
                state.knex(foreignTableName);
            if (customize) {
                const SQB = getSchemaQueryBuilderCtor();
                const proxy = new SQB(state.knex, foreignSchema, foreignQuery3);
                customize(proxy);
            }

            joinManyImpl(builder, {
                foreignSchema,
                localColumn,
                foreignColumn,
                as: relationName,
                foreignQuery: foreignQuery3
            } as any);
            break;
        }
        case 'belongsToMany': {
            const through = relation.through!;
            const localColumn = findPrimaryKeyColumn(
                builder,
                state.localSchema
            );

            const foreignQuery = state
                .knex(foreignTableName)
                .join(
                    through.table,
                    `${through.table}.${through.foreignKey}`,
                    `${foreignTableName}.${findPrimaryKeyColumn(builder, foreignSchema)}`
                )
                .select(
                    `${foreignTableName}.*`,
                    `${through.table}.${through.localKey}`
                );

            if (customize) {
                const SQB = getSchemaQueryBuilderCtor();
                const proxy = new SQB(state.knex, foreignSchema, foreignQuery);
                customize(proxy);
            }

            joinManyImpl(builder, {
                foreignSchema,
                localColumn,
                foreignColumn: through.localKey,
                as: relationName,
                foreignQuery
            } as any);
            break;
        }
    }

    return builder;
}

export function includeVariantImpl(
    builder: SchemaQueryBuilder<any, any>,
    variantKey: string,
    relationName: string,
    customize?: (q: SchemaQueryBuilder<any, any>) => void
): any {
    const state = getState(builder);
    invalidateCache(builder);
    const variantConfig = getVariantConfig(builder);
    if (!variantConfig) {
        throw new Error(
            `includeVariant: schema for table "${state.tableName}" is not polymorphic (no .withVariants() config found)`
        );
    }
    const variantSpec = variantConfig.variants[variantKey];
    if (!variantSpec) {
        throw new Error(
            `includeVariant: unknown variant key "${variantKey}" on schema for table "${state.tableName}"`
        );
    }
    const relSpec = variantSpec.relations.find(
        (r: ResolvedVariantRelationSpec) => r.name === relationName
    );
    if (!relSpec) {
        throw new Error(
            `includeVariant: unknown relation "${relationName}" on variant "${variantKey}" of table "${state.tableName}"`
        );
    }
    state.variantRelationIncludes.push({
        variantKey,
        relationName,
        customize
    });
    return builder;
}
