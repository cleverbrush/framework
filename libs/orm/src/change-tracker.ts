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
    getPrimaryKeyColumns,
    getRowVersionColumn
} from '@cleverbrush/knex-schema';
import type { Knex } from 'knex';
import { ConcurrencyError, InvariantViolationError } from './errors.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Entry state in the identity map. Mirrors EF Core's EntityState. */
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

/** Take a shallow snapshot of the entity's persisted (non-relation) columns. */
function snapshotEntity(entity: object, schema: any): Record<string, unknown> {
    const introspected = (schema as any).introspect?.() as {
        properties?: Record<string, unknown>;
    };
    const propKeys = new Set(Object.keys(introspected?.properties ?? {}));
    const snap: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(entity as Record<string, unknown>)) {
        if (propKeys.has(k)) snap[k] = v;
    }
    return Object.freeze(snap);
}

/** Check if two values differ (shallow). */
function isDirty(
    original: Record<string, unknown>,
    current: Record<string, unknown>
): boolean {
    for (const key of Object.keys(original)) {
        if (!Object.is(original[key], current[key])) return true;
    }
    // Check for new keys on current that weren't in original
    for (const key of Object.keys(current)) {
        if (!(key in original) && current[key] !== undefined) return true;
    }
    return false;
}

// ---------------------------------------------------------------------------
// ChangeTracker
// ---------------------------------------------------------------------------

/** @internal Pre-save hook callback signature. */
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
                    return !Object.is(
                        rawEntry.originalSnapshot[field as string],
                        current[field as string]
                    );
                }
                return isDirty(rawEntry.originalSnapshot, current);
            },
            reset(): void {
                // Restore current values from snapshot
                const current = entity as Record<string, unknown>;
                for (const [k, v] of Object.entries(
                    rawEntry.originalSnapshot
                )) {
                    current[k] = v;
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
                for (const [k, v] of Object.entries(entry.originalSnapshot)) {
                    current[k] = v;
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

        const { propToCol, colToProp } = buildColumnMap(config.schema);
        const qb = knex(tableName);
        const pkValues = extractPkValues(
            config.schema,
            entity as Record<string, unknown>
        );
        for (let i = 0; i < pkInfo.propertyKeys.length; i++) {
            const colName =
                propToCol.get(pkInfo.propertyKeys[i]) ?? pkInfo.propertyKeys[i];
            qb.andWhere(colName, pkValues[i] as any);
        }
        const row = await qb.first();
        if (!row) return;

        // Re-map column names → property names
        const mapped = entity as Record<string, unknown>;
        for (const [col, val] of Object.entries(
            row as Record<string, unknown>
        )) {
            mapped[colToProp.get(col) ?? col] = val;
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

                const { propToCol } = buildColumnMap(config.schema);
                const current = entry.entity as Record<string, unknown>;
                const row: Record<string, unknown> = {};
                for (const [propKey, val] of Object.entries(current)) {
                    const colName = propToCol.get(propKey) ?? propKey;
                    if (val !== undefined) row[colName] = val;
                }
                const result = await trx(tableName).insert(row).returning('*');
                const returned =
                    Array.isArray(result) && result.length > 0
                        ? result[0]
                        : null;
                if (returned && typeof returned === 'object') {
                    const { colToProp } = buildColumnMap(config.schema);
                    const mapped = entry.entity as Record<string, unknown>;
                    for (const [col, val] of Object.entries(
                        returned as Record<string, unknown>
                    )) {
                        mapped[colToProp.get(col) ?? col] = val;
                    }
                }
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

                // Build the SET clause — only changed columns, excluding PK
                const pkPropSet = new Set(pkInfo.propertyKeys);
                const updateData: Record<string, unknown> = {};
                for (const propKey of Object.keys(entry.originalSnapshot)) {
                    if (pkPropSet.has(propKey)) continue;
                    if (
                        !Object.is(
                            entry.originalSnapshot[propKey],
                            current[propKey]
                        )
                    ) {
                        updateData[propToCol.get(propKey) ?? propKey] =
                            current[propKey];
                    }
                }
                // Also pick up new keys not in snapshot
                for (const [propKey, val] of Object.entries(current)) {
                    if (pkPropSet.has(propKey)) continue;
                    if (
                        !(propKey in entry.originalSnapshot) &&
                        val !== undefined
                    ) {
                        updateData[propToCol.get(propKey) ?? propKey] = val;
                    }
                }

                // Handle rowVersion
                if (entry.rowVersion) {
                    const rv = entry.rowVersion;
                    const rvCol =
                        propToCol.get(rv.propertyKey) ?? rv.propertyKey;
                    if (rv.strategy === 'increment') {
                        const newVal = Number(rv.snapshotValue ?? 0) + 1;
                        updateData[rvCol] = newVal;
                        current[rv.propertyKey] = newVal;
                    } else if (rv.strategy === 'timestamp') {
                        const now = new Date();
                        updateData[rvCol] = now;
                        current[rv.propertyKey] = now;
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
