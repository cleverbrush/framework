import {
    type Span,
    SpanKind,
    SpanStatusCode,
    type Tracer,
    trace
} from '@opentelemetry/api';
import {
    ATTR_DB_NAMESPACE,
    ATTR_DB_OPERATION_NAME,
    ATTR_DB_QUERY_TEXT,
    ATTR_DB_SYSTEM_NAME,
    ATTR_SERVER_ADDRESS,
    ATTR_SERVER_PORT
} from '@opentelemetry/semantic-conventions/incubating';
import type { Knex } from 'knex';

/**
 * Configuration for {@link instrumentKnex}.
 */
export interface InstrumentKnexOptions {
    /**
     * Value to record as `db.system.name` (e.g. `postgresql`, `mysql`,
     * `sqlite`). When omitted, inferred from the knex client.
     */
    dbSystem?: string;

    /**
     * Tracer name used when resolving the OTel tracer.
     *
     * @default '@cleverbrush/otel/knex'
     */
    tracerName?: string;

    /**
     * Whether to include the SQL statement as `db.query.text`.
     *
     * The statement is taken verbatim from knex (parameter placeholders
     * are kept; bound values are **not** included). Disable if your
     * SQL itself may contain sensitive identifiers.
     *
     * @default true
     */
    recordStatement?: boolean;

    /**
     * Optional hook to redact / rewrite the SQL before it is recorded.
     * Called only when {@link recordStatement} is enabled.
     */
    sanitizeStatement?: (sql: string) => string;
}

interface KnexQueryEvent {
    sql: string;
    method?: string;
    bindings?: unknown[];
    __knexQueryUid?: string;
}

const FIRST_KEYWORD_RE = /^\s*([A-Za-z]+)/;

// Recognised SQL operation keywords — anything outside this set is ignored
// to prevent arbitrary SQL words becoming low-cardinality span names.
const KNOWN_SQL_OPS = new Set([
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'REPLACE',
    'CALL', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE',
    'EXPLAIN', 'ANALYZE', 'SHOW', 'WITH', 'EXECUTE', 'UPSERT'
]);

function inferOperation(sql: string, method?: string): string | undefined {
    if (method) return method.toUpperCase();
    const m = FIRST_KEYWORD_RE.exec(sql);
    const word = m?.[1]?.toUpperCase();
    return word && KNOWN_SQL_OPS.has(word) ? word : undefined;
}

function inferDbSystem(client: any): string | undefined {
    const dialect: string | undefined =
        client?.dialect ?? client?.config?.client;
    if (!dialect) return undefined;
    const norm = String(dialect).toLowerCase();
    if (norm.startsWith('pg') || norm.includes('postgres')) {
        return 'postgresql';
    }
    if (norm.includes('mysql') || norm === 'mysql2') return 'mysql';
    if (norm.includes('sqlite') || norm === 'better-sqlite3') return 'sqlite';
    if (norm.includes('mssql')) return 'mssql';
    if (norm.includes('oracle')) return 'oracle';
    return norm;
}

/**
 * Instruments a Knex instance to emit an OpenTelemetry `CLIENT` span
 * for every executed query.
 *
 * Hooks knex's built-in `query`, `query-response`, and `query-error`
 * events — every dbset read, change-tracker write, save-graph, and raw
 * `knex(...)` call is captured uniformly because they all flow through
 * the same knex instance.
 *
 * Spans automatically nest under any ambient OTel context, so DB spans
 * become children of the enclosing HTTP server span produced by
 * `tracingMiddleware`.
 *
 * Returns the same instance for fluent chaining:
 * `instrumentKnex(knex({...}))`.
 *
 * @param k - the knex instance to instrument (mutated in place)
 * @param options - optional overrides for db system, tracer name, redaction
 * @returns the same knex instance
 *
 * @example
 * ```ts
 * import knex from 'knex';
 * import { instrumentKnex } from '@cleverbrush/otel';
 *
 * services.addSingleton(KnexToken, () =>
 *     instrumentKnex(
 *         knex({ client: 'pg', connection: dbUrl }),
 *         { dbSystem: 'postgresql' }
 *     )
 * );
 * ```
 */
export function instrumentKnex<T extends Knex>(
    k: T,
    options?: InstrumentKnexOptions
): T {
    const tracerName = options?.tracerName ?? '@cleverbrush/otel/knex';
    const recordStatement = options?.recordStatement ?? true;
    const sanitize = options?.sanitizeStatement;

    let cachedTracer: Tracer | undefined;
    const getTracer = (): Tracer => {
        if (!cachedTracer) cachedTracer = trace.getTracer(tracerName);
        return cachedTracer;
    };

    const client: any = (k as any).client;
    const dbSystem = options?.dbSystem ?? inferDbSystem(client) ?? 'other_sql';
    const connection: any = client?.config?.connection ?? {};
    const dbName: string | undefined =
        typeof connection === 'object' ? connection.database : undefined;
    const host: string | undefined =
        typeof connection === 'object' ? connection.host : undefined;
    const port: number | undefined =
        typeof connection === 'object' && typeof connection.port === 'number'
            ? connection.port
            : undefined;

    const active = new Map<string, Span>();

    const baseAttrs: Record<string, string | number> = {
        [ATTR_DB_SYSTEM_NAME]: dbSystem
    };
    if (dbName) baseAttrs[ATTR_DB_NAMESPACE] = dbName;
    if (host) baseAttrs[ATTR_SERVER_ADDRESS] = host;
    if (typeof port === 'number') baseAttrs[ATTR_SERVER_PORT] = port;

    (k as any).on?.('query', (q: KnexQueryEvent) => {
        const uid = q.__knexQueryUid;
        if (!uid) return;
        const operation = inferOperation(q.sql, q.method);
        const spanName = operation
            ? dbName
                ? `${operation} ${dbName}`
                : operation
            : 'db.query';

        const attrs: Record<string, string | number> = { ...baseAttrs };
        if (operation) attrs[ATTR_DB_OPERATION_NAME] = operation;
        if (recordStatement && q.sql) {
            attrs[ATTR_DB_QUERY_TEXT] = sanitize ? sanitize(q.sql) : q.sql;
        }

        const span = getTracer().startSpan(spanName, {
            kind: SpanKind.CLIENT,
            attributes: attrs
        });
        active.set(uid, span);
    });

    (k as any).on?.('query-response', (_resp: unknown, q: KnexQueryEvent) => {
        const uid = q?.__knexQueryUid;
        if (!uid) return;
        const span = active.get(uid);
        if (!span) return;
        active.delete(uid);
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
    });

    (k as any).on?.('query-error', (err: unknown, q: KnexQueryEvent) => {
        const uid = q?.__knexQueryUid;
        if (!uid) return;
        const span = active.get(uid);
        if (!span) return;
        active.delete(uid);
        if (err instanceof Error) {
            span.recordException(err);
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: err.message
            });
        } else {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: String(err)
            });
        }
        span.end();
    });

    return k;
}
