import type { Knex } from 'knex';
import { statements } from './aggregate.js';

/** Compile only ORDER BY, retaining Knex's identifier quoting and value bindings. */
export function compileOrder(
    knex: Knex,
    source: Knex.QueryBuilder,
    projection: Record<string, string | Knex.Raw> | null = null,
    selected: readonly string[] | null = null
): Knex.Raw | null {
    const order = statements(source).filter(s => s.grouping === 'order');
    if (!order.length) return null;
    const isolated = knex.queryBuilder();
    (isolated as any)._statements = order;
    const compiled = isolated.toSQL();
    const prefix = 'select * ';
    if (!compiled.sql.startsWith(prefix))
        throw new Error('Unsupported Knex ordering compiler');
    // SELECT aliases and positional references are visible to a query's ORDER
    // BY, but not a window's ORDER BY. Expand known projection references to
    // physical columns without touching expressions, literals or bindings.
    const columns = projection ? Object.values(projection) : selected;
    const clause = compiled.sql.slice(`${prefix}order by `.length);
    const terms = splitOrderTerms(clause).map(term => {
        const match =
            /^("(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_]*|\d+)(\s+(?:asc|desc))?(\s+nulls\s+(?:first|last))?$/i.exec(
                term.trim()
            );
        if (!match) return term;
        const name = match[1].startsWith('"')
            ? match[1].slice(1, -1).replaceAll('""', '"')
            : match[1].toLowerCase();
        const column = /^\d+$/.test(match[1])
            ? columns?.[Number(match[1]) - 1]
            : projection && Object.hasOwn(projection, name)
              ? projection[name]
              : undefined;
        if (typeof column !== 'string') return term;
        return `${knex.ref(column).toSQL().sql}${match[2] ?? ''}${match[3] ?? ''}`;
    });
    return knex.raw(`order by ${terms.join(', ')}`, compiled.bindings as any[]);
}

/** Split only top-level SQL commas; quoted SQL fragments are opaque. */
function splitOrderTerms(sql: string): string[] {
    const tokens =
        /\$(\w*)\$[\s\S]*?\$\1\$|'(?:''|\\.|[^'])*'|"(?:""|[^"])*"|--[^\n]*|\/\*[\s\S]*?\*\/|[(),]/g;
    const terms: string[] = [];
    let depth = 0;
    let start = 0;
    for (const token of sql.matchAll(tokens)) {
        if (token[0] === '(') depth++;
        else if (token[0] === ')') depth--;
        else if (token[0] === ',' && depth === 0) {
            terms.push(sql.slice(start, token.index));
            start = token.index + 1;
        }
    }
    terms.push(sql.slice(start));
    return terms;
}

export function privateColumn(
    existing: Iterable<string>,
    label: string
): string {
    const used = new Set(existing);
    let index = 0;
    while (used.has(`__cb_${label}_${index}`)) index++;
    return `__cb_${label}_${index}`;
}
