import type { InferType } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import { captureReadRaw } from './read-predicates.js';
import { type ReadObject, ReadSchemaError } from './read-schema.js';

/** Explicit output contract required when Framework cannot infer the SQL row shape. */
export interface QueryOutput<S extends ReadObject> {
    /** Synchronous, introspectable Framework object schema; parses each raw row once. */
    output: S;
}

/**
 * Immutable raw SELECT with an explicit output contract. Knex remains mutable only
 * inside apply(); its compiled SQL and bindings are captured before this object is returned.
 */
export class OpaqueQuery<S extends ReadObject> {
    /** The supplied output schema, without a second decoding or input-parser pass. */
    readonly rowSchema: S;
    /** @internal Use a query's apply() or selectRaw() method. */
    constructor(
        private readonly knex: Knex,
        private readonly sql: Knex.QueryBuilder,
        options: QueryOutput<S>
    ) {
        if (
            !options?.output ||
            typeof options.output.introspect !== 'function' ||
            options.output.introspect().type !== 'object'
        )
            throw new ReadSchemaError(
                'Raw query output requires an introspectable Framework object schema'
            );
        this.rowSchema = options.output;
    }
    /** @internal Capture the completed SELECT; external builders and callbacks are not retained. */
    static capture<S extends ReadObject>(
        knex: Knex,
        sql: Knex.QueryBuilder,
        options: QueryOutput<S>
    ): OpaqueQuery<S> {
        const compiled = sql.toSQL();
        if (Array.isArray(compiled) || compiled.method !== 'select')
            throw new ReadSchemaError(
                'Raw query configuration must produce a SELECT'
            );
        const raw = captureReadRaw(
            knex,
            compiled.sql,
            compiled.bindings as Knex.RawBinding[]
        );
        return new OpaqueQuery(
            knex,
            knex
                .queryBuilder()
                .from(raw().wrap('(', ') as __opaque'))
                .select('*'),
            options
        );
    }
    /** Configure isolated Knex SQL once; every opaque change must declare its resulting output. */
    apply<O extends ReadObject>(
        configure: (query: Knex.QueryBuilder) => Knex.QueryBuilder | undefined,
        options: QueryOutput<O>
    ): OpaqueQuery<O> {
        const sql = this.toKnexQuery();
        const result = configure(sql);
        if (result !== undefined && result !== sql) {
            if (result instanceof Promise) void result.catch(() => {});
            throw new ReadSchemaError(
                'Raw configuration must synchronously configure the supplied Knex builder'
            );
        }
        return OpaqueQuery.capture(this.knex, sql, options);
    }
    /** Return an independent mutable SQL snapshot. */
    toKnexQuery(): Knex.QueryBuilder {
        return this.sql.clone();
    }
    /** Render debug SQL without execution. */
    toQuery(): string {
        return this.sql.toQuery();
    }
    /** Limit an independent query while keeping schema identity. */
    limit(count: number): OpaqueQuery<S> {
        if (!Number.isInteger(count) || count < 0)
            throw new ReadSchemaError('Limit must be a non-negative integer');
        return new OpaqueQuery(this.knex, this.sql.clone().limit(count), {
            output: this.rowSchema
        });
    }
    /** Offset an independent query while keeping schema identity. */
    offset(count: number): OpaqueQuery<S> {
        if (!Number.isInteger(count) || count < 0)
            throw new ReadSchemaError('Offset must be a non-negative integer');
        return new OpaqueQuery(this.knex, this.sql.clone().offset(count), {
            output: this.rowSchema
        });
    }
    /** Bind an independent query to an existing transaction. */
    transacting(trx: Knex.Transaction): OpaqueQuery<S> {
        return new OpaqueQuery(trx, this.sql.clone().transacting(trx), {
            output: this.rowSchema
        });
    }
    /** Execute again on every call and synchronously parse each raw row exactly once. */
    async execute(): Promise<InferType<S>[]> {
        return (await this.sql.clone()).map((row: unknown) => {
            const result = this.rowSchema.parse(row);
            if (result && typeof (result as any).then === 'function') {
                if (result instanceof Promise) void result.catch(() => {});
                throw new ReadSchemaError(
                    'Raw output schemas must parse synchronously'
                );
            }
            return result;
        });
    }
    /** Fetch the first row, or undefined. */
    async first(): Promise<InferType<S> | undefined> {
        return (await this.limit(1).execute())[0];
    }
    /** Awaiting executes this query; results are not cached. */
    // biome-ignore lint/suspicious/noThenProperty: query builders intentionally support await
    then<R = InferType<S>[], E = never>(
        resolve?: ((rows: InferType<S>[]) => R | PromiseLike<R>) | null,
        reject?: ((error: any) => E | PromiseLike<E>) | null
    ): Promise<R | E> {
        return this.execute().then(resolve, reject);
    }
}
