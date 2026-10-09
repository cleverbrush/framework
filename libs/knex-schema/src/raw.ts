import type { InferType } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import { OpaqueQuery } from './OpaqueQuery.js';
import { captureReadRaw } from './read-predicates.js';
import type { ReadObject } from './read-schema.js';

/**
 * Execute a captured raw SELECT with an explicit complete output schema.
 * SQL must alias columns to the output property names. Each driver row is parsed
 * exactly once; there is no implicit column mapping or entity decoding. Cast
 * exact numeric values to text in SQL before a driver can lose their precision.
 *
 * @param knex - Connection or transaction used for execution.
 * @param output - Synchronous Framework object schema describing every returned row.
 * @param queryOrSql - Trusted SELECT SQL or an independently captured Knex SELECT.
 * @param bindings - Bound values for the trusted SQL string.
 * @returns Parsed rows, never attached to an ORM identity map.
 * @example
 * ```ts
 * const totals = await rawQuery(knex, object({ total: string() }),
 *     'select sum(amount)::text as total from invoices where owner_id = ?', [ownerId]);
 * ```
 */
export function rawQuery<S extends ReadObject>(
    knex: Knex,
    output: S,
    queryOrSql: string | Knex.QueryBuilder,
    bindings: readonly Knex.RawBinding[] = []
): Promise<InferType<S>[]> {
    const sql =
        typeof queryOrSql === 'string'
            ? knex
                  .queryBuilder()
                  .from(
                      captureReadRaw(knex, queryOrSql, bindings)().wrap(
                          '(',
                          ') as __raw_output'
                      )
                  )
                  .select('*')
            : queryOrSql;
    return OpaqueQuery.capture(knex, sql, { output }).execute();
}
