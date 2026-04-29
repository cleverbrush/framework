// @cleverbrush/knex-schema — Raw query execution with schema result mapping

import type { InferType, ObjectSchemaBuilder } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import { buildColumnMap } from './columns.js';

/**
 * Execute a raw SQL query or Knex query builder and map the result rows
 * through the schema's column→property name mapping.
 *
 * This is the escape hatch for complex queries that can't be expressed with
 * the typed `SchemaQueryBuilder` API. The schema is used only for result
 * mapping — column names in the result are converted back to property names.
 * Extra columns (not in the schema) are passed through unchanged.
 *
 * @param knex - A configured Knex instance.
 * @param schema - The `ObjectSchemaBuilder` for result mapping.
 * @param queryOrSql - A raw SQL string or a `Knex.QueryBuilder`.
 * @param bindings - Optional bindings for parameterised SQL queries.
 * @returns Mapped result rows.
 *
 * @example
 * ```ts
 * // Raw SQL with schema result mapping
 * const results = await rawQuery(knex, PostSchema, `
 *     SELECT p.*, COUNT(c.id) AS comment_count
 *     FROM posts p
 *     LEFT JOIN comments c ON c.post_id = p.id
 *     GROUP BY p.id
 *     ORDER BY comment_count DESC
 *     LIMIT ?
 * `, [10]);
 *
 * // Knex query builder as the source
 * const subQuery = knex('posts').select('author_id', knex.raw('COUNT(*) as post_count')).groupBy('author_id');
 * const results = await rawQuery(knex, UserSchema, subQuery);
 * ```
 */
export async function rawQuery<
    TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
>(
    knex: Knex,
    schema: TSchema,
    queryOrSql: string | Knex.QueryBuilder,
    bindings?: any[]
): Promise<(InferType<TSchema> & Record<string, any>)[]> {
    let rows: any[];

    if (typeof queryOrSql === 'string') {
        const result = await knex.raw(queryOrSql, bindings ?? []);
        rows = result.rows ?? result;
    } else {
        rows = await queryOrSql;
    }

    if (!rows || !Array.isArray(rows)) return [];

    const { colToProp } = buildColumnMap(schema);

    return rows.map(row => {
        const mapped: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
            const propName = colToProp.get(key);
            mapped[propName ?? key] = value;
        }
        return mapped;
    }) as any;
}
