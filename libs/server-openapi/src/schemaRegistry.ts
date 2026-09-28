import type { SchemaBuilder } from '@cleverbrush/schema';
import { toJsonSchema } from '@cleverbrush/schema-json';

// ---------------------------------------------------------------------------
// SchemaRegistry
// ---------------------------------------------------------------------------

/**
 * Collects schemas that carry an explicit component name (set via
 * `.schemaName()`) and provides a reference-based lookup used during OpenAPI
 * spec generation to replace inline schema objects with
 * `$ref: '#/components/schemas/<name>'` pointers.
 *
 * **Conflict rule**: registering two *different* schema instances (different
 * object references) under the same name throws immediately. Re-registering
 * the same instance is a no-op.
 *
 * @example
 * ```ts
 * const registry = new SchemaRegistry();
 * registry.register(UserSchema);          // UserSchema.schemaName('User')
 * registry.getName(UserSchema);           // 'User'
 * registry.getName(someOtherSchema);      // null
 * ```
 */
export class SchemaRegistry {
    /** schema instance → registered name */
    private readonly byInstance = new Map<
        SchemaBuilder<any, any, any>,
        string
    >();
    /** name → first-registered schema instance */
    private readonly byName = new Map<string, SchemaBuilder<any, any, any>>();
    private directions:
        | Map<SchemaBuilder<any, any, any>, { input: string; output: string }>
        | undefined;

    /**
     * Attempts to register `schema` in the registry.
     *
     * - If the schema has no `schemaName` in its introspect output, it is
     *   silently skipped.
     * - If the same instance is already registered, this is a no-op.
     * - If a **different** instance is already registered under the same name,
     *   an error is thrown.
     *
     * @param schema - The schema builder to register.
     * @throws {Error} When two distinct schema instances share the same name.
     */
    register(schema: SchemaBuilder<any, any, any>): void {
        const name = (schema.introspect() as any).schemaName as
            | string
            | undefined;
        if (typeof name !== 'string') return;

        const existing = this.byName.get(name);
        if (existing !== undefined) {
            // Same instance → idempotent, nothing to do
            if (existing === schema) return;
            // Different instance → conflict
            throw new Error(
                `Schema name "${name}" is already registered by a different schema instance. ` +
                    `Each named schema must be a single, reused constant. ` +
                    `If you intended to register the same schema, ensure you are passing ` +
                    `the same object reference (not a rebuilt schema).`
            );
        }

        this.byInstance.set(schema, name);
        this.byName.set(name, schema);
        this.directions = undefined;
    }

    /**
     * Returns the component name for a given schema instance, or `null` if it
     * was not registered.
     *
     * @param schema - The schema builder to look up.
     * @returns The registered name, or `null`.
     */
    getName(
        schema: SchemaBuilder<any, any, any>,
        mode: 'input' | 'output' = 'output'
    ): string | null {
        if (!this.byInstance.has(schema)) return null;
        this.prepareDirections();
        return this.directions!.get(schema)![mode];
    }

    /**
     * Emits independent input/output definitions only when their declared
     * representations differ. Derived names are collision checked.
     * @throws Error when a generated component name is already reserved.
     */
    *directionalEntries(): IterableIterator<
        [string, SchemaBuilder<any, any, any>, 'input' | 'output']
    > {
        this.prepareDirections();
        for (const [schema, names] of this.directions!) {
            if (names.input !== names.output)
                yield [names.input, schema, 'input'];
            yield [names.output, schema, 'output'];
        }
    }

    private prepareDirections(): void {
        if (this.directions) return;
        const different = new Set<SchemaBuilder<any, any, any>>();
        // A changed named child changes its parents' references. Iterate to a
        // fixed point; named recursive edges are always references, not recursion.
        let changed = true;
        while (changed) {
            changed = false;
            for (const [, schema] of this.byName) {
                if (different.has(schema)) continue;
                const render = (mode: 'input' | 'output') => {
                    let rootInlined = false;
                    return JSON.stringify(
                        toJsonSchema(schema, {
                            $schema: false,
                            mode,
                            nameResolver: candidate => {
                                if (candidate === schema && !rootInlined) {
                                    rootInlined = true;
                                    return null;
                                }
                                const name = this.byInstance.get(candidate);
                                return name
                                    ? name +
                                          (different.has(candidate)
                                              ? mode === 'input'
                                                  ? 'Input'
                                                  : 'Output'
                                              : '')
                                    : null;
                            }
                        })
                    );
                };
                if (render('input') !== render('output')) {
                    different.add(schema);
                    changed = true;
                }
            }
        }
        const names = new Map<string, SchemaBuilder<any, any, any>>(
            this.byName
        );
        const directions = new Map<
            SchemaBuilder<any, any, any>,
            { input: string; output: string }
        >();
        for (const [name, schema] of this.byName) {
            const pair = different.has(schema)
                ? { input: name + 'Input', output: name + 'Output' }
                : { input: name, output: name };
            for (const derived of new Set(Object.values(pair))) {
                if (names.has(derived) && names.get(derived) !== schema) {
                    throw new Error(
                        `Schema component name "${derived}" conflicts with a generated input/output name.`
                    );
                }
                names.set(derived, schema);
            }
            directions.set(schema, pair);
        }
        this.directions = directions;
    }

    /**
     * Iterates over all registered `[name, schema]` pairs in insertion order.
     *
     * Used to emit the `components.schemas` section of an OpenAPI document.
     */
    entries(): IterableIterator<[string, SchemaBuilder<any, any, any>]> {
        return this.byName.entries();
    }

    /** Returns `true` when at least one schema has been registered. */
    get isEmpty(): boolean {
        return this.byName.size === 0;
    }
}

// ---------------------------------------------------------------------------
// walkSchemas
// ---------------------------------------------------------------------------

/**
 * Recursively visits every {@link SchemaBuilder} reachable from `schema` and
 * calls {@link SchemaRegistry.register} on each node.
 *
 * Cycle detection is performed via a `visited` `Set` of object references, so
 * schemas may safely be shared across multiple branches without causing
 * infinite recursion.
 *
 * **Excluded schema types**
 * - `lazy` — deferred resolution would require calling the getter, which may
 *   itself reference the parent schema; lazy schemas are handled separately.
 *
 * @param schema  - Root schema to start the walk from.
 * @param registry - Registry to register named schemas into.
 * @param visited  - Shared set for cycle detection; pass a new `Set()` for the
 *                   top-level call.
 */
export function walkSchemas(
    schema: SchemaBuilder<any, any, any>,
    registry: SchemaRegistry,
    visited: Set<SchemaBuilder<any, any, any>> = new Set()
): void {
    if (visited.has(schema)) return;
    visited.add(schema);

    registry.register(schema);

    const info = schema.introspect() as any;

    switch (info.type) {
        case 'reference':
        case 'decode':
            walkSchemas(info.inputSchema, registry, visited);
            walkSchemas(info.outputSchema, registry, visited);
            break;
        case 'intersection':
            walkSchemas(info.left, registry, visited);
            walkSchemas(info.right, registry, visited);
            break;
        case 'object': {
            const props = info.properties as
                | Record<string, SchemaBuilder<any, any, any>>
                | undefined;
            if (props) {
                for (const child of Object.values(props)) {
                    walkSchemas(child, registry, visited);
                }
            }
            break;
        }
        case 'array':
            if (info.elementSchema) {
                walkSchemas(info.elementSchema, registry, visited);
            }
            break;
        case 'tuple': {
            const elements: SchemaBuilder<any, any, any>[] =
                info.elements ?? [];
            for (const el of elements) {
                walkSchemas(el, registry, visited);
            }
            if (info.restSchema) {
                walkSchemas(info.restSchema, registry, visited);
            }
            break;
        }
        case 'union': {
            const options: SchemaBuilder<any, any, any>[] = info.options ?? [];
            for (const opt of options) {
                walkSchemas(opt, registry, visited);
            }
            break;
        }
        case 'record':
            if (info.keySchema) {
                walkSchemas(info.keySchema, registry, visited);
            }
            if (info.valueSchema) {
                walkSchemas(info.valueSchema, registry, visited);
            }
            break;
        case 'lazy': {
            // Resolve the inner schema and walk it so that any named schema
            // reachable through a lazy boundary is registered. Cycle-safety is
            // provided by the `visited` set — the lazy wrapper itself was
            // already added above, preventing infinite recursion on
            // self-referential schemas.
            const resolved = (schema as any).resolve() as SchemaBuilder<
                any,
                any,
                any
            >;
            walkSchemas(resolved, registry, visited);
            break;
        }
        default:
            break;
    }
}
