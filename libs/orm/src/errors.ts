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
