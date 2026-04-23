// @cleverbrush/orm — typed error classes

/**
 * Thrown by {@link DbSet.findOrFail} when no row matches the supplied
 * primary key value(s). The `entity` field carries the SQL table name (or
 * the entity's schema name when a table name is unavailable); `pk` is the
 * exact value (scalar or tuple) that was looked up.
 *
 * @public
 */
export class EntityNotFoundError extends Error {
    readonly entity: string;
    readonly pk: unknown;

    constructor(entity: string, pk: unknown) {
        super(
            `Entity "${entity}" not found for primary key ${JSON.stringify(pk)}`
        );
        this.name = 'EntityNotFoundError';
        this.entity = entity;
        this.pk = pk;
    }
}

/**
 * Thrown by {@link DbContext.saveChanges} when an UPDATE or DELETE detects
 * that the row's row-version column (`.rowVersion()`) has changed since the
 * entity was last loaded — indicating a concurrent modification.
 *
 * @public
 */
export class ConcurrencyError extends Error {
    /** Table name or entity label. */
    readonly entity: string;
    /** Primary-key value(s) of the conflicting row. */
    readonly pk: unknown;
    /** The row-version value the ORM expected. */
    readonly expected: unknown;

    constructor(entity: string, pk: unknown, expected: unknown) {
        super(
            `Concurrency conflict on "${entity}" (pk=${JSON.stringify(pk)}): ` +
                `the row has been modified or deleted since it was loaded. ` +
                `Expected rowVersion = ${JSON.stringify(expected)}.`
        );
        this.name = 'ConcurrencyError';
        this.entity = entity;
        this.pk = pk;
        this.expected = expected;
    }
}

/**
 * Thrown by {@link DbContext.saveChanges} when an invariant is violated on
 * a tracked entity — e.g. the primary key or discriminator column was mutated.
 *
 * @public
 */
export class InvariantViolationError extends Error {
    readonly entity: string;
    readonly pk: unknown;
    readonly field: string;

    constructor(entity: string, pk: unknown, field: string, detail: string) {
        super(
            `Invariant violation on "${entity}" (pk=${JSON.stringify(pk)}): ${detail}`
        );
        this.name = 'InvariantViolationError';
        this.entity = entity;
        this.pk = pk;
        this.field = field;
    }
}

/**
 * Thrown by the `[Symbol.asyncDispose]` implementation on a tracked
 * {@link DbContext} when there are unsaved changes at scope exit.
 *
 * Callers must explicitly call `await db.saveChanges()` or
 * `db.discardChanges()` before the `await using` block exits.
 *
 * @public
 */
export class PendingChangesError extends Error {
    /** Number of dirty / added / deleted entries. */
    readonly pendingCount: number;

    constructor(pendingCount: number, summary: string) {
        super(
            `DbContext disposed with ${pendingCount} pending change(s). ` +
                `Call saveChanges() or discardChanges() before the context goes out of scope. ` +
                summary
        );
        this.name = 'PendingChangesError';
        this.pendingCount = pendingCount;
    }
}
