import {
    ObjectSchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from '@cleverbrush/schema';
import type {
    ColumnRef,
    JoinManySpec,
    JoinOneSpec,
    ValidatedJoinManySpec,
    ValidatedJoinOneSpec
} from './types.js';

// ---------------------------------------------------------------------------
// Resolve a ColumnRef (string | accessor) to a plain string column name
// ---------------------------------------------------------------------------
export function resolveColumnRef(
    ref: ColumnRef<any>,
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    label: string
): string {
    if (typeof ref === 'string') {
        if (!ref) throw new Error(`${label} must be a non-empty string`);
        return ref;
    }

    if (typeof ref === 'function') {
        const tree = ObjectSchemaBuilder.getPropertiesFor(schema as any);
        const descriptor = ref(tree as any);

        if (
            !descriptor ||
            typeof descriptor !== 'object' ||
            !(SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR in descriptor)
        ) {
            throw new Error(
                `${label} accessor must return a valid property descriptor`
            );
        }

        const inner = (descriptor as any)[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];

        // Walk the introspected properties to find the matching descriptor
        const introspected = schema.introspect() as any;
        if (introspected.properties) {
            for (const propName of Object.keys(introspected.properties)) {
                const propDescriptor = (tree as any)[propName];
                if (
                    propDescriptor &&
                    (propDescriptor as any)[
                        SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
                    ] === inner
                ) {
                    return propName;
                }
            }
        }

        throw new Error(
            `${label} accessor did not match any property in the schema`
        );
    }

    throw new Error(
        `${label} must be a string or a property descriptor accessor function`
    );
}

export function validateJoinOne(
    spec: JoinOneSpec<any, any, any, any>,
    localSchema: ObjectSchemaBuilder<any, any, any, any, any, any, any>
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
    if (!spec.foreignQuery) {
        throw new Error('foreignQuery must be a Knex QueryBuilder instance');
    }

    const required = spec.required !== false;

    if (spec.mappers !== undefined) {
        validateMappers(spec.mappers);
    }

    return {
        localColumn,
        foreignColumn,
        as: spec.as,
        required,
        foreignQuery: spec.foreignQuery,
        mappers: spec.mappers as Record<string, (value: any) => any> | undefined
    };
}

export function validateJoinMany(
    spec: JoinManySpec<any, any, any>,
    localSchema: ObjectSchemaBuilder<any, any, any, any, any, any, any>
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
    if (!spec.foreignQuery) {
        throw new Error('foreignQuery must be a Knex QueryBuilder instance');
    }

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
        foreignQuery: spec.foreignQuery,
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
