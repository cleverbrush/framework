// @cleverbrush/orm — Change tracker
//
// Implements the identity map and entry-state tracking used by tracked
// `DbContext` instances (opt-in via `{ tracking: true }`).
//
// Architecture:
//   - `TrackedEntry`    — per-row metadata: state, original snapshot, PK tuple,
//                         entitySetKey, optional variantKey.
//   - `IdentityMap`     — WeakRef-backed map keyed by (entitySetKey, pkKey).
//                         A `FinalizationRegistry` prunes dead refs automatically.
//   - `ChangeTracker`   — top-level manager; holds the identity map, registered
//                         `onSavingChanges` hooks, and exposes `attach`, `detach`,
//                         `entry`, `saveChanges`, `discardChanges`, `reload`.

import {
    buildColumnMap,
    encodeJsonColumn,
    getPrimaryKeyColumns,
    getRowVersionColumn,
    getVariants,
    isJsonColumn,
    query as schemaQuery
} from '@cleverbrush/knex-schema';
import type { Knex } from 'knex';
import { ConcurrencyError, InvariantViolationError } from './errors.js';
import { insertVariant, mutateVariant } from './variant-write.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Entry state in the identity map. Mirrors EF Core's EntityState.
 * @public
 */
export type EntryState = 'Added' | 'Unchanged' | 'Modified' | 'Deleted';

/**
 * Public view of a tracked entry, exposed via `db.entry(entity)`.
 *
 * @public
 */
export interface EntityEntry<T extends object> {
    /** Current state of the entry. */
    readonly state: EntryState;
    /** Snapshot of the values at the time the entity was last loaded/saved. */
    readonly originalValues: Readonly<T>;
    /** Live object (same reference as the tracked entity). */
    readonly currentValues: T;
    /**
     * Returns `true` when a specific field has changed since the last
     * snapshot, or `true` when any field has changed when called without
     * arguments.
     */
    isModified(field?: keyof T): boolean;
    /**
     * Reset all changes to the snapshot values and transition state back
     * to `'Unchanged'` (or `'Added'` if the entity was never persisted).
     */
    reset(): void;
}

/** @internal Per-entity-set configuration needed by the tracker. */
export interface EntitySetConfig {
    /** The entity schema (used for PK resolution). */
    schema: any;
    /** Logical entity-set name (e.g. `'todos'`). */
    entitySetKey: string;
}

/** @internal Raw tracked entry stored in the identity map. */
interface RawEntry {
    /** The live entity object. */
    entity: object;
    /** Schema-level entity-set name. */
    entitySetKey: string;
    /** For polymorphic CTI/STI entities, the discriminator value. */
    variantKey: string | undefined;
    /** JSON-stringified PK tuple — used as the map key. */
    pkKey: string;
    /** Frozen copy of the entity's persisted columns at snapshot time. */
    originalSnapshot: Record<string, unknown>;
    /** Current state. */
    state: EntryState;
    /**
     * The row-version column property key and its snapshotted value.
     * `null` when the schema has no `.rowVersion()` column.
     */
    rowVersion: {
        propertyKey: string;
        columnName: string;
        strategy: 'increment' | 'timestamp' | 'manual';
        snapshotValue: unknown;
    } | null;
}

// ---------------------------------------------------------------------------
// Identity map
// ---------------------------------------------------------------------------

/**
 * WeakRef-backed identity map.
 *
 * Structure: Map< entitySetKey, Map< pkKey, WeakRef<RawEntry> > >
 *
 * A `FinalizationRegistry` automatically removes dead references when the
 * entity object is garbage-collected.
 *
 * @internal
 */
class IdentityMap {
    readonly #map = new Map<string, Map<string, WeakRef<RawEntry>>>();
    readonly #registry: FinalizationRegistry<{ setKey: string; pkKey: string }>;

    constructor() {
        this.#registry = new FinalizationRegistry(({ setKey, pkKey }) => {
            const inner = this.#map.get(setKey);
            if (inner) {
                inner.delete(pkKey);
                if (inner.size === 0) this.#map.delete(setKey);
            }
        });
    }

    /** Store a new entry. */
    set(entry: RawEntry): void {
        let inner = this.#map.get(entry.entitySetKey);
        if (!inner) {
            inner = new Map();
            this.#map.set(entry.entitySetKey, inner);
        }
        const ref = new WeakRef(entry);
        inner.set(entry.pkKey, ref);
        this.#registry.register(entry.entity, {
            setKey: entry.entitySetKey,
            pkKey: entry.pkKey
        });
    }

    /** Retrieve an existing entry by entity-set key and pk key, or `null`. */
    get(entitySetKey: string, pkKey: string): RawEntry | null {
        const ref = this.#map.get(entitySetKey)?.get(pkKey);
        if (!ref) return null;
        const entry = ref.deref();
        if (!entry) {
            this.#map.get(entitySetKey)?.delete(pkKey);
            return null;
        }
        return entry;
    }

    /** Find the entry for a given entity object. O(n) over the set entries. */
    findByEntity(entity: object): RawEntry | null {
        for (const inner of this.#map.values()) {
            for (const ref of inner.values()) {
                const entry = ref.deref();
                if (entry?.entity === entity) return entry;
            }
        }
        return null;
    }

    /** Remove an entry. */
    delete(entitySetKey: string, pkKey: string): void {
        this.#map.get(entitySetKey)?.delete(pkKey);
    }

    /** Iterate over all live entries. */
    *entries(): IterableIterator<RawEntry> {
        for (const inner of this.#map.values()) {
            for (const ref of inner.values()) {
                const entry = ref.deref();
                if (entry) yield entry;
            }
        }
    }

    /** Return all live entries with any of the given states. */
    byState(...states: EntryState[]): RawEntry[] {
        const set = new Set(states);
        const result: RawEntry[] = [];
        for (const entry of this.entries()) {
            if (set.has(entry.state)) result.push(entry);
        }
        return result;
    }

    /** Clear all entries. */
    clear(): void {
        this.#map.clear();
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a stable JSON-encoded PK key from a list of property values. */
function buildPkKey(pkValues: unknown[]): string {
    return JSON.stringify(pkValues);
}

/** Extract PK property values from an entity given a schema. */
function extractPkValues(
    schema: any,
    entity: Record<string, unknown>
): unknown[] {
    const pkInfo = getPrimaryKeyColumns(schema);
    return pkInfo.propertyKeys.map(k => entity[k]);
}

// Document columns need independent snapshots; relational values keep their
// existing identity semantics. Metadata stays outside the public snapshot.
const documentKeys = new WeakMap<object, Set<string>>();

function cloneDocument(value: any): any {
    if (value === null || typeof value !== 'object') return value;
    if (value instanceof Date) return new Date(value.getTime());
    if (Array.isArray(value)) return value.map(cloneDocument);
    const result = Object.create(Object.getPrototypeOf(value));
    for (const key of Object.keys(value))
        Object.defineProperty(result, key, {
            value: cloneDocument(value[key]),
            enumerable: true,
            writable: true,
            configurable: true
        });
    return result;
}

function documentsEqual(a: any, b: any): boolean {
    if (Object.is(a, b)) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object')
        return false;
    if (a instanceof Date || b instanceof Date)
        return (
            a instanceof Date &&
            b instanceof Date &&
            a.getTime() === b.getTime()
        );
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const prototype = Object.getPrototypeOf(b);
    if (
        !Array.isArray(b) &&
        prototype !== Object.prototype &&
        prototype !== null
    )
        return false;
    const keys = Reflect.ownKeys(a);
    if (keys.length !== Reflect.ownKeys(b).length) return false;
    return keys.every(key => {
        const descriptor = Object.getOwnPropertyDescriptor(b, key);
        return (
            descriptor &&
            descriptor.enumerable ===
                Object.getOwnPropertyDescriptor(a, key)!.enumerable &&
            'value' in descriptor &&
            documentsEqual(a[key], descriptor.value)
        );
    });
}

function sameColumn(
    snapshot: Record<string, unknown>,
    key: string,
    current: unknown
): boolean {
    return documentKeys.get(snapshot)?.has(key)
        ? documentsEqual(snapshot[key], current)
        : Object.is(snapshot[key], current);
}

function restoreColumn(
    snapshot: Record<string, unknown>,
    key: string
): unknown {
    return documentKeys.get(snapshot)?.has(key)
        ? cloneDocument(snapshot[key])
        : snapshot[key];
}

/** Snapshot document contents independently, preserving other column semantics. */
function snapshotEntity(entity: object, schema: any): Record<string, unknown> {
    const properties = { ...schema.introspect().properties };
    const variants = getVariants(schema);
    const variant =
        variants?.variants[(entity as any)[variants.discriminatorKey]];
    if (variant)
        Object.assign(properties, variant.schema.introspect().properties);
    const snap: Record<string, unknown> = {};
    const documents = new Set<string>();
    for (const [k, v] of Object.entries(entity)) {
        if (!Object.hasOwn(properties, k)) continue;
        if (isJsonColumn(properties[k])) {
            // Validate before snapshotting, including invalid nested mutations.
            encodeJsonColumn(properties[k], v);
            documents.add(k);
            snap[k] = cloneDocument(v);
        } else snap[k] = v;
    }
    documentKeys.set(snap, documents);
    return Object.freeze(snap);
}

function isDirty(
    original: Record<string, unknown>,
    current: Record<string, unknown>
): boolean {
    for (const key of Object.keys(original))
        if (!sameColumn(original, key, current[key])) return true;
    for (const key of Object.keys(current))
        if (!(key in original) && current[key] !== undefined) return true;
    return false;
}

// ---------------------------------------------------------------------------
// ChangeTracker
// ---------------------------------------------------------------------------

/**
 * Pre-save hook callback signature registered via
 * `TrackedDbContext.onSavingChanges(hook)`.
 * @public
 */
export type SavingChangesHook = (
    entry: EntityEntry<object>
) => void | Promise<void>;

/**
 * The change-tracking core used by tracked `DbContext` instances.
 *
 * Consumers interact with this via the `DbContext` API methods; the
 * `ChangeTracker` itself is not exported as part of the public API.
 *
 * @internal
 */
export class ChangeTracker {
    readonly #identityMap = new IdentityMap();
    /** Added entries whose PK is not yet known (no identity-map slot). */
    readonly #addedWithoutPk = new Set<RawEntry>();
    readonly #hooks: SavingChangesHook[] = [];
    /** entity-set-key → EntitySetConfig */
    readonly #configs = new Map<string, EntitySetConfig>();

    /** Register an entity set so the tracker knows its schema. */
    registerEntitySet(config: EntitySetConfig): void {
        this.#configs.set(config.entitySetKey, config);
    }

    /** Register a pre-save hook. */
    onSavingChanges(hook: SavingChangesHook): void {
        this.#hooks.push(hook);
    }

    /**
     * Attach an entity to the tracker under the given entity-set key.
     *
     * If an entry with the same PK already exists, returns the EXISTING
     * tracked object (identity-map guarantee). If the entity is already the
     * same object, just updates its snapshot.
     *
     * @returns The tracked entity (same ref when already in the map).
     */
    attach<T extends object>(
        entitySetKey: string,
        entity: T,
        state: EntryState = 'Unchanged'
    ): T {
        const config = this.#configs.get(entitySetKey);
        if (!config) {
            throw new Error(
                `ChangeTracker.attach: unknown entity set "${entitySetKey}". ` +
                    `Make sure it was registered via registerEntitySet().`
            );
        }
        const pkValues = extractPkValues(
            config.schema,
            entity as unknown as Record<string, unknown>
        );
        if (pkValues.some(v => v === undefined || v === null)) {
            // No PK yet — treat as Added; keep in secondary set
            const existing = (entity as any)[TRACKER_ENTRY_SYMBOL] as
                | RawEntry
                | undefined;
            if (existing) return entity; // already tracked
            const snap = snapshotEntity(entity, config.schema);
            const rvCol = getRowVersionColumn(config.schema);
            const entry: RawEntry = {
                entity,
                entitySetKey,
                variantKey: resolveVariantKey(
                    config.schema,
                    entity as Record<string, unknown>
                ),
                pkKey: '',
                originalSnapshot: snap,
                state: 'Added',
                rowVersion: rvCol
                    ? {
                          ...rvCol,
                          snapshotValue: (entity as any)[rvCol.propertyKey]
                      }
                    : null
            };
            (entity as any)[TRACKER_ENTRY_SYMBOL] = entry;
            this.#addedWithoutPk.add(entry);
            return entity;
        }

        const pkKey = buildPkKey(pkValues);
        const existing = this.#identityMap.get(entitySetKey, pkKey);
        if (existing) {
            // Identity-map hit: update snapshot and return the EXISTING object
            if (existing.entity !== entity) {
                return existing.entity as T;
            }
            // Same object — refresh snapshot if transitioning to Unchanged
            if (state === 'Unchanged') {
                existing.originalSnapshot = snapshotEntity(
                    entity,
                    config.schema
                );
                existing.state = 'Unchanged';
                if (existing.rowVersion) {
                    existing.rowVersion.snapshotValue = (entity as any)[
                        existing.rowVersion.propertyKey
                    ];
                }
            }
            return entity;
        }

        const snap = snapshotEntity(entity, config.schema);
        const rvCol = getRowVersionColumn(config.schema);
        const entry: RawEntry = {
            entity,
            entitySetKey,
            variantKey: resolveVariantKey(
                config.schema,
                entity as Record<string, unknown>
            ),
            pkKey,
            originalSnapshot: snap,
            state,
            rowVersion: rvCol
                ? {
                      ...rvCol,
                      snapshotValue: (entity as any)[rvCol.propertyKey]
                  }
                : null
        };
        this.#identityMap.set(entry);
        (entity as any)[TRACKER_ENTRY_SYMBOL] = entry;
        return entity;
    }

    /** Detach an entity from tracking. */
    detach(entity: object): void {
        const entry = this.#identityMap.findByEntity(entity);
        if (entry) {
            this.#identityMap.delete(entry.entitySetKey, entry.pkKey);
        } else {
            const symEntry = (entity as any)[TRACKER_ENTRY_SYMBOL] as
                | RawEntry
                | undefined;
            if (symEntry) this.#addedWithoutPk.delete(symEntry);
        }
        delete (entity as any)[TRACKER_ENTRY_SYMBOL];
    }

    /**
     * Mark an entity for deletion on the next `saveChanges()` call.
     * The entity must already be tracked.
     */
    remove(entity: object): void {
        const entry = this.#identityMap.findByEntity(entity);
        if (!entry) {
            throw new Error(
                'ChangeTracker.remove: entity is not tracked. ' +
                    'Attach it first or use `db.attach()` before calling `remove()`.'
            );
        }
        entry.state = 'Deleted';
    }

    /** Return the public `EntityEntry` view for a tracked entity. */
    entry<T extends object>(entity: T): EntityEntry<T> {
        const rawEntry =
            this.#identityMap.findByEntity(entity) ??
            ((entity as any)[TRACKER_ENTRY_SYMBOL] as RawEntry | undefined);
        if (!rawEntry) {
            throw new Error(
                'ChangeTracker.entry: entity is not tracked. ' +
                    'Attach it first or load it via a tracked DbSet.'
            );
        }
        const config = this.#configs.get(rawEntry.entitySetKey);
        void config; // reserved for future schema-aware field filtering

        return {
            get state() {
                return rawEntry.state;
            },
            get originalValues() {
                return rawEntry.originalSnapshot as Readonly<T>;
            },
            get currentValues() {
                return entity;
            },
            isModified(field?: keyof T): boolean {
                const current = entity as Record<string, unknown>;
                if (field !== undefined) {
                    return !sameColumn(
                        rawEntry.originalSnapshot,
                        field as string,
                        current[field as string]
                    );
                }
                return isDirty(rawEntry.originalSnapshot, current);
            },
            reset(): void {
                // Restore current values from snapshot
                const current = entity as Record<string, unknown>;
                for (const k of Object.keys(rawEntry.originalSnapshot)) {
                    current[k] = restoreColumn(rawEntry.originalSnapshot, k);
                }
                rawEntry.state = rawEntry.pkKey ? 'Unchanged' : 'Added';
            }
        };
    }

    /**
     * Discard all pending changes: reset all Modified entries to their
     * snapshots, remove Added entries from the tracker, restore Deleted
     * entries to Unchanged.
     */
    discardChanges(): void {
        // Discard Added-without-PK entries
        for (const entry of this.#addedWithoutPk) {
            delete (entry.entity as any)[TRACKER_ENTRY_SYMBOL];
        }
        this.#addedWithoutPk.clear();

        for (const entry of this.#identityMap.entries()) {
            if (entry.state === 'Added') {
                this.#identityMap.delete(entry.entitySetKey, entry.pkKey);
            } else if (
                entry.state === 'Modified' ||
                entry.state === 'Deleted' ||
                (entry.state === 'Unchanged' &&
                    isDirty(
                        entry.originalSnapshot,
                        entry.entity as Record<string, unknown>
                    ))
            ) {
                // Restore values from snapshot
                const current = entry.entity as Record<string, unknown>;
                for (const k of Object.keys(entry.originalSnapshot)) {
                    current[k] = restoreColumn(entry.originalSnapshot, k);
                }
                entry.state = 'Unchanged';
            }
        }
    }

    /**
     * Refresh a tracked entity from the DB, replacing its current values
     * and snapshot with the freshly-loaded row.
     */
    async reload(entity: object, knex: Knex): Promise<void> {
        const entry = this.#identityMap.findByEntity(entity);
        if (!entry) return;

        const config = this.#configs.get(entry.entitySetKey);
        if (!config) return;

        const pkInfo = getPrimaryKeyColumns(config.schema);
        const tableName = config.schema.getExtension?.('tableName') as string;
        if (!tableName || pkInfo.propertyKeys.length === 0) return;

        let qb = schemaQuery(knex, config.schema as any)
            .unscoped()
            .withDeleted();
        const pkValues = extractPkValues(
            config.schema,
            entity as Record<string, unknown>
        );
        for (let i = 0; i < pkInfo.propertyKeys.length; i++) {
            qb = qb.andWhere(pkInfo.propertyKeys[i], pkValues[i]);
        }
        const row = await qb.first();
        if (!row) return;

        // Re-map column names → property names
        const mapped = entity as Record<string, unknown>;
        for (const [col, val] of Object.entries(
            row as Record<string, unknown>
        )) {
            mapped[col] = val;
        }
        // Refresh snapshot and rowVersion
        entry.originalSnapshot = snapshotEntity(entity, config.schema);
        if (entry.rowVersion) {
            entry.rowVersion.snapshotValue = (entity as any)[
                entry.rowVersion.propertyKey
            ];
        }
        entry.state = 'Unchanged';
    }

    /**
     * Returns `true` when there are any pending changes (Added / Modified /
     * Deleted entries, or silently mutated Unchanged entries).
     */
    hasPendingChanges(): boolean {
        if (this.#addedWithoutPk.size > 0) return true;
        for (const entry of this.#identityMap.entries()) {
            if (entry.state !== 'Unchanged') return true;
            if (
                isDirty(
                    entry.originalSnapshot,
                    entry.entity as Record<string, unknown>
                )
            )
                return true;
        }
        return false;
    }

    /**
     * Flush all pending changes to the database within a single transaction.
     *
     * Returns the number of rows inserted, updated, and deleted.
     *
     * Invariants checked:
     * - PK columns must not have changed since the snapshot (throws
     *   `InvariantViolationError`).
     * - Discriminator columns must not have changed (throws
     *   `InvariantViolationError`).
     * - For `rowVersion` columns: WHERE clause enforces the snapshot value;
     *   zero affected rows throws `ConcurrencyError`.
     */
    async saveChanges(
        knex: Knex
    ): Promise<{ inserted: number; updated: number; deleted: number }> {
        let inserted = 0;
        let updated = 0;
        let deleted = 0;

        // 1. Compute dirty states (scan all entries)
        const added: RawEntry[] = [
            ...this.#addedWithoutPk,
            ...this.#identityMap.byState('Added')
        ];
        const modified: RawEntry[] = [];
        const deleted_entries = this.#identityMap.byState('Deleted');

        for (const entry of this.#identityMap.byState(
            'Unchanged',
            'Modified'
        )) {
            if (entry.state === 'Modified') {
                modified.push(entry);
                continue;
            }
            // Check if Unchanged entry has been silently mutated
            if (
                isDirty(
                    entry.originalSnapshot,
                    entry.entity as Record<string, unknown>
                )
            ) {
                entry.state = 'Modified';
                modified.push(entry);
            }
        }

        if (
            added.length === 0 &&
            modified.length === 0 &&
            deleted_entries.length === 0
        ) {
            return { inserted: 0, updated: 0, deleted: 0 };
        }

        // 2. Validate invariants for modified / deleted entries
        for (const entry of [...modified, ...deleted_entries]) {
            const config = this.#configs.get(entry.entitySetKey);
            if (!config) continue;
            const current = entry.entity as Record<string, unknown>;
            const pkInfo = getPrimaryKeyColumns(config.schema);
            const tableName = config.schema.getExtension?.(
                'tableName'
            ) as string;

            // PK must not have changed
            for (const propKey of pkInfo.propertyKeys) {
                if (
                    !Object.is(
                        entry.originalSnapshot[propKey],
                        current[propKey]
                    )
                ) {
                    throw new InvariantViolationError(
                        tableName,
                        entry.pkKey,
                        propKey,
                        `Primary key column "${propKey}" must not be changed on a tracked entity. ` +
                            `Original: ${JSON.stringify(entry.originalSnapshot[propKey])}, ` +
                            `Current: ${JSON.stringify(current[propKey])}.`
                    );
                }
            }

            // Discriminator must not have changed (for polymorphic entities)
            if (entry.variantKey !== undefined) {
                const variantsExt = config.schema.getExtension?.(
                    'variants'
                ) as { discriminatorKey?: string } | null;
                const discKey = variantsExt?.discriminatorKey;
                if (
                    discKey &&
                    !Object.is(
                        entry.originalSnapshot[discKey],
                        current[discKey]
                    )
                ) {
                    throw new InvariantViolationError(
                        tableName,
                        entry.pkKey,
                        discKey,
                        `Discriminator column "${discKey}" must not be changed on a tracked entity. ` +
                            `To change a polymorphic entity's type, delete and re-insert it as a new variant.`
                    );
                }
            }
        }

        // 3. Fire onSavingChanges hooks
        for (const entry of [...added, ...modified, ...deleted_entries]) {
            const config = this.#configs.get(entry.entitySetKey);
            if (!config) continue;
            const publicEntry = this.entry(entry.entity as object);
            for (const hook of this.#hooks) {
                await hook(publicEntry);
            }
        }

        // Keep generated values local until every statement has committed.
        // A later concurrency failure must not advance in-memory IDs/versions.
        const committedValues = new Map<object, Record<string, unknown>>();
        // 4. Execute all changes in a single transaction
        await knex.transaction(async (trx: Knex.Transaction) => {
            // Inserts (Added)
            for (const entry of added) {
                const config = this.#configs.get(entry.entitySetKey);
                if (!config) continue;
                const tableName = config.schema.getExtension?.(
                    'tableName'
                ) as string;
                if (!tableName) continue;

                const current = entry.entity as Record<string, unknown>;
                const variants = getVariants(config.schema as any);
                const returned = variants
                    ? await insertVariant(
                          trx,
                          config.schema,
                          String(current[variants.discriminatorKey]),
                          current,
                          trx
                      )
                    : await schemaQuery(trx, config.schema as any).insert(
                          current as any
                      );
                if (returned) committedValues.set(current, returned);
                inserted++;
            }

            // Updates (Modified)
            for (const entry of modified) {
                const config = this.#configs.get(entry.entitySetKey);
                if (!config) continue;
                const tableName = config.schema.getExtension?.(
                    'tableName'
                ) as string;
                if (!tableName) continue;

                const { propToCol } = buildColumnMap(config.schema);
                const pkInfo = getPrimaryKeyColumns(config.schema);
                const current = entry.entity as Record<string, unknown>;

                if (entry.variantKey !== undefined) {
                    const variants = getVariants(config.schema)!;
                    const patch: Record<string, unknown> = {};
                    for (const key of new Set([
                        ...Object.keys(entry.originalSnapshot),
                        ...Object.keys(current)
                    ])) {
                        if (
                            pkInfo.propertyKeys.includes(key) ||
                            key === variants.discriminatorKey
                        )
                            continue;
                        if (
                            !sameColumn(
                                entry.originalSnapshot,
                                key,
                                current[key]
                            )
                        )
                            patch[key] = current[key];
                    }
                    const managed: Record<string, unknown> = {};
                    const rv = entry.rowVersion;
                    if (rv?.strategy === 'increment') {
                        const value =
                            typeof rv.snapshotValue === 'string'
                                ? (BigInt(rv.snapshotValue) + 1n).toString()
                                : Number(rv.snapshotValue ?? 0) + 1;
                        if (
                            typeof value === 'number' &&
                            !Number.isSafeInteger(value)
                        )
                            throw new Error(
                                'Row-version increment exceeds the safe integer range; use a bigint storage column'
                            );
                        managed[rv.propertyKey] = value;
                    } else if (rv?.strategy === 'timestamp')
                        managed[rv.propertyKey] = new Date();
                    let selected = (schemaQuery(trx, config.schema) as any)
                        .selectVariants([entry.variantKey])
                        .unscoped()
                        .withDeleted()
                        .where(
                            pkInfo.propertyKeys[0],
                            current[pkInfo.propertyKeys[0]]
                        );
                    if (rv)
                        selected = selected.where(
                            rv.propertyKey,
                            rv.snapshotValue
                        );
                    const result = await mutateVariant(
                        trx,
                        config.schema,
                        entry.variantKey,
                        selected,
                        'update',
                        patch,
                        managed
                    );
                    if (!result.count && rv)
                        throw new ConcurrencyError(
                            tableName,
                            extractPkValues(config.schema, current),
                            rv.snapshotValue
                        );
                    if (result.rows[0])
                        committedValues.set(current, result.rows[0]);
                    updated++;
                    continue;
                }

                // Build the SET clause — only changed columns, excluding PK
                const pkPropSet = new Set(pkInfo.propertyKeys);
                const updateData: Record<string, unknown> = {};
                const put = (key: string, value: unknown) => {
                    updateData[propToCol.get(key) ?? key] = encodeJsonColumn(
                        config.schema.introspect().properties[key],
                        value
                    );
                };
                for (const propKey of Object.keys(entry.originalSnapshot)) {
                    if (pkPropSet.has(propKey)) continue;
                    if (
                        !sameColumn(
                            entry.originalSnapshot,
                            propKey,
                            current[propKey]
                        )
                    ) {
                        put(propKey, current[propKey]);
                    }
                }
                // Also pick up new keys not in snapshot
                for (const [propKey, val] of Object.entries(current)) {
                    if (pkPropSet.has(propKey)) continue;
                    if (
                        !(propKey in entry.originalSnapshot) &&
                        val !== undefined
                    ) {
                        put(propKey, val);
                    }
                }

                // Handle rowVersion
                if (entry.rowVersion) {
                    const rv = entry.rowVersion;
                    const rvCol =
                        propToCol.get(rv.propertyKey) ?? rv.propertyKey;
                    if (rv.strategy === 'increment') {
                        const newVal =
                            typeof rv.snapshotValue === 'string'
                                ? (BigInt(rv.snapshotValue) + 1n).toString()
                                : Number(rv.snapshotValue ?? 0) + 1;
                        if (
                            typeof newVal === 'number' &&
                            !Number.isSafeInteger(newVal)
                        )
                            throw new Error(
                                'Row-version increment exceeds the safe integer range; use a bigint storage column'
                            );
                        updateData[rvCol] = newVal;
                        committedValues.set(current, {
                            [rv.propertyKey]: newVal
                        });
                    } else if (rv.strategy === 'timestamp') {
                        const now = new Date();
                        updateData[rvCol] = now;
                        committedValues.set(current, { [rv.propertyKey]: now });
                    }
                    // 'manual': caller already set the new value in current
                }

                if (Object.keys(updateData).length === 0) continue;

                // Build WHERE clause with PK + optional rowVersion check
                let qb = trx(tableName);
                for (let i = 0; i < pkInfo.propertyKeys.length; i++) {
                    const colName =
                        propToCol.get(pkInfo.propertyKeys[i]) ??
                        pkInfo.propertyKeys[i];
                    qb = qb.andWhere(
                        colName,
                        current[pkInfo.propertyKeys[i]] as any
                    ) as any;
                }
                if (entry.rowVersion) {
                    const rv = entry.rowVersion;
                    const rvCol =
                        propToCol.get(rv.propertyKey) ?? rv.propertyKey;
                    qb = qb.andWhere(rvCol, rv.snapshotValue as any) as any;
                }

                const affected = await qb.update(updateData);
                if (affected === 0 && entry.rowVersion) {
                    const tableName2 = config.schema.getExtension?.(
                        'tableName'
                    ) as string;
                    throw new ConcurrencyError(
                        tableName2,
                        extractPkValues(config.schema, current),
                        entry.rowVersion.snapshotValue
                    );
                }
                updated++;
            }

            // Deletes (Deleted) — children before parents (simple heuristic:
            // delete in reverse registration order for now; full topo-sort
            // only needed when FK deps cross entity sets)
            for (const entry of [...deleted_entries].reverse()) {
                const config = this.#configs.get(entry.entitySetKey);
                if (!config) continue;
                const tableName = config.schema.getExtension?.(
                    'tableName'
                ) as string;
                if (!tableName) continue;

                const { propToCol } = buildColumnMap(config.schema);
                const pkInfo = getPrimaryKeyColumns(config.schema);
                const current = entry.entity as Record<string, unknown>;

                if (entry.variantKey !== undefined) {
                    let selected = (schemaQuery(trx, config.schema) as any)
                        .selectVariants([entry.variantKey])
                        .unscoped()
                        .withDeleted()
                        .where(
                            pkInfo.propertyKeys[0],
                            current[pkInfo.propertyKeys[0]]
                        );
                    if (entry.rowVersion)
                        selected = selected.where(
                            entry.rowVersion.propertyKey,
                            entry.rowVersion.snapshotValue
                        );
                    const result = await mutateVariant(
                        trx,
                        config.schema,
                        entry.variantKey,
                        selected,
                        'delete'
                    );
                    if (!result.count && entry.rowVersion)
                        throw new ConcurrencyError(
                            tableName,
                            extractPkValues(config.schema, current),
                            entry.rowVersion.snapshotValue
                        );
                    deleted++;
                    continue;
                }

                let qb = trx(tableName);
                for (let i = 0; i < pkInfo.propertyKeys.length; i++) {
                    const colName =
                        propToCol.get(pkInfo.propertyKeys[i]) ??
                        pkInfo.propertyKeys[i];
                    qb = qb.andWhere(
                        colName,
                        current[pkInfo.propertyKeys[i]] as any
                    ) as any;
                }
                if (entry.rowVersion) {
                    const rv = entry.rowVersion;
                    const rvCol =
                        propToCol.get(rv.propertyKey) ?? rv.propertyKey;
                    qb = qb.andWhere(rvCol, rv.snapshotValue as any) as any;
                }

                const affected = await qb.delete();
                if (affected === 0 && entry.rowVersion) {
                    throw new ConcurrencyError(
                        tableName,
                        extractPkValues(config.schema, current),
                        entry.rowVersion?.snapshotValue
                    );
                }
                deleted++;
            }
        });

        for (const [entity, values] of committedValues)
            Object.assign(entity, values);

        // 5. Refresh snapshots for inserted and updated entries; detach deleted
        for (const entry of added) {
            entry.originalSnapshot = snapshotEntity(
                entry.entity,
                this.#configs.get(entry.entitySetKey)!.schema
            );
            entry.state = 'Unchanged';
            // Re-register in identity map with the new PK
            const config = this.#configs.get(entry.entitySetKey)!;
            const pkValues = extractPkValues(
                config.schema,
                entry.entity as Record<string, unknown>
            );
            if (pkValues.every(v => v !== undefined && v !== null)) {
                entry.pkKey = buildPkKey(pkValues);
                this.#identityMap.set(entry);
            }
            // Remove from the without-PK secondary set
            this.#addedWithoutPk.delete(entry);
            if (entry.rowVersion) {
                entry.rowVersion.snapshotValue = (entry.entity as any)[
                    entry.rowVersion.propertyKey
                ];
            }
        }
        for (const entry of modified) {
            entry.originalSnapshot = snapshotEntity(
                entry.entity,
                this.#configs.get(entry.entitySetKey)!.schema
            );
            entry.state = 'Unchanged';
            if (entry.rowVersion) {
                entry.rowVersion.snapshotValue = (entry.entity as any)[
                    entry.rowVersion.propertyKey
                ];
            }
        }
        for (const entry of deleted_entries) {
            this.#identityMap.delete(entry.entitySetKey, entry.pkKey);
        }

        return { inserted, updated, deleted };
    }

    /**
     * Generate a summary of pending changes for error messages.
     * @internal
     */
    pendingSummary(): string {
        const counts: Record<EntryState, number> = {
            Added: 0,
            Modified: 0,
            Deleted: 0,
            Unchanged: 0
        };
        counts.Added += this.#addedWithoutPk.size;
        for (const entry of this.#identityMap.entries()) {
            if (entry.state !== 'Unchanged') counts[entry.state]++;
            else if (
                isDirty(
                    entry.originalSnapshot,
                    entry.entity as Record<string, unknown>
                )
            )
                counts.Modified++;
        }
        const parts: string[] = [];
        if (counts.Added) parts.push(`${counts.Added} Added`);
        if (counts.Modified) parts.push(`${counts.Modified} Modified`);
        if (counts.Deleted) parts.push(`${counts.Deleted} Deleted`);
        return `(${parts.join(', ')})`;
    }

    /** Clear the entire identity map (used on dispose). */
    clear(): void {
        // Remove TRACKER_ENTRY_SYMBOL from all in-map entities so entry() throws.
        for (const entry of this.#identityMap.entries()) {
            delete (entry.entity as any)[TRACKER_ENTRY_SYMBOL];
        }
        for (const entry of this.#addedWithoutPk) {
            delete (entry.entity as any)[TRACKER_ENTRY_SYMBOL];
        }
        this.#addedWithoutPk.clear();
        this.#identityMap.clear();
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Symbol used to tag entities with their raw tracker entry (for Added items without PK). */
const TRACKER_ENTRY_SYMBOL: unique symbol = Symbol(
    '@cleverbrush/orm:trackerEntry'
);

/** Resolve the variant discriminator value for an entity (if polymorphic). */
function resolveVariantKey(
    schema: any,
    entity: Record<string, unknown>
): string | undefined {
    const variantsExt = schema?.getExtension?.('variants') as {
        discriminatorKey?: string;
    } | null;
    const discKey = variantsExt?.discriminatorKey;
    if (!discKey) return undefined;
    return entity[discKey] as string | undefined;
}
