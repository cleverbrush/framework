import { NumberSchemaBuilder } from '@cleverbrush/schema';

/** SQL storage type retained by numeric column builders for schema-aware reads. */
export const READ_SQL_TYPE: unique symbol = Symbol.for(
    '@cleverbrush/knex-schema:read-sql-type'
);

type Preserved<E, SQL extends string> = {
    [K in Exclude<
        keyof E,
        typeof READ_SQL_TYPE | 'columnType' | 'bigint' | 'smallint' | 'decimal'
    >]: E[K] extends (...args: infer A) => any
        ? <S>(this: S, ...args: A) => S
        : E[K];
} & { readonly [READ_SQL_TYPE]: SQL };

/** A numeric validation schema whose SQL representation survives ordinary modifiers. */
export type SqlNumber<
    T,
    R extends boolean,
    N extends boolean,
    D extends boolean,
    E,
    SQL extends string
> = NumberSchemaBuilder<T, R, N, D, Preserved<E, SQL>> & Preserved<E, SQL>;

declare module '@cleverbrush/schema' {
    interface NumberSchemaBuilder<
        TResult,
        TRequired extends boolean,
        TNullable extends boolean,
        THasDefault extends boolean,
        TExtensions
    > {
        /** Set a SQL storage type; schema-aware reads retain its representation. */
        columnType<const SQL extends string>(
            type: SQL
        ): SqlNumber<
            TResult,
            TRequired,
            TNullable,
            THasDefault,
            TExtensions,
            SQL
        >;
        /** Set bigint storage; schema-aware reads return exact strings. */
        bigint(): SqlNumber<
            TResult,
            TRequired,
            TNullable,
            THasDefault,
            TExtensions,
            'bigint'
        >;
        /** Set smallint storage; schema-aware reads return numbers. */
        smallint(): SqlNumber<
            TResult,
            TRequired,
            TNullable,
            THasDefault,
            TExtensions,
            'smallint'
        >;
        /** Set decimal storage; schema-aware reads return exact strings. */
        decimal(
            precision: number,
            scale: number
        ): SqlNumber<
            TResult,
            TRequired,
            TNullable,
            THasDefault,
            TExtensions,
            'decimal'
        >;
    }
}

// Match the declaration augmentation for base-schema factories too, just as the
// package's primary-key augmentation does. Every method still returns a clone.
const prototype = NumberSchemaBuilder.prototype as any;
const methods = {
    columnType(this: NumberSchemaBuilder<any>, type: string) {
        return this.withExtension('columnType', type);
    },
    bigint(this: NumberSchemaBuilder<any>) {
        return this.withExtension('columnType', 'bigint');
    },
    smallint(this: NumberSchemaBuilder<any>) {
        return this.withExtension('columnType', 'smallint');
    },
    decimal(this: NumberSchemaBuilder<any>, precision: number, scale: number) {
        return this.withExtension(
            'columnType',
            `decimal(${precision},${scale})`
        );
    }
};
for (const [name, method] of Object.entries(methods))
    if (typeof prototype[name] !== 'function')
        Object.defineProperty(prototype, name, {
            value: method,
            configurable: true,
            writable: true
        });
