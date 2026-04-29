import type { LogEvent } from '../LogEvent.js';
import { levelToString } from '../LogLevel.js';
import type { LogSink } from '../Sink.js';
import { safeSerialize } from '../serialization.js';
import { BatchingSink } from './BatchingSink.js';

/**
 * Column mapping for the ClickHouse logs table.
 */
export interface ClickHouseColumnMapping {
    timestamp?: string;
    level?: string;
    messageTemplate?: string;
    renderedMessage?: string;
    properties?: string;
    exception?: string;
    correlationId?: string;
    traceId?: string;
    spanId?: string;
    sourceContext?: string;
}

/**
 * ClickHouse sink configuration.
 */
export interface ClickHouseSinkOptions {
    /** Knex-ClickHouse connection instance. */
    connection: any;
    /** Table name to insert into. */
    table: string;
    /** Events per batch. @default 1000 */
    batchSize?: number;
    /** Max milliseconds between flushes. @default 5000 */
    flushInterval?: number;
    /** Custom column mapping. */
    columns?: ClickHouseColumnMapping;
}

/**
 * Options for creating the ClickHouse logs table.
 */
export interface CreateLogsTableOptions {
    /** Table engine. @default 'MergeTree' */
    engine?: string;
    /** Partition expression. @default "toYYYYMM(timestamp)" */
    partitionBy?: string;
    /** ORDER BY columns. @default ['timestamp', 'level'] */
    orderBy?: string[];
    /** TTL expression for automatic data expiration. */
    ttl?: string;
}

const DEFAULT_COLUMNS: Required<ClickHouseColumnMapping> = {
    timestamp: 'timestamp',
    level: 'level',
    messageTemplate: 'message_template',
    renderedMessage: 'rendered_message',
    properties: 'properties',
    exception: 'exception',
    correlationId: 'correlation_id',
    traceId: 'trace_id',
    spanId: 'span_id',
    sourceContext: 'source_context'
};

/**
 * Creates the ClickHouse logs table with a recommended schema.
 *
 * @param connection - knex-clickhouse connection
 * @param tableName - name for the logs table
 * @param options - DDL options (engine, partitioning, TTL)
 *
 * @example
 * ```ts
 * await createLogsTable(ch, 'application_logs', {
 *     ttl: 'timestamp + INTERVAL 90 DAY',
 * });
 * ```
 */
export async function createLogsTable(
    connection: any,
    tableName: string,
    options?: CreateLogsTableOptions
): Promise<void> {
    const engine = options?.engine ?? 'MergeTree';
    const partitionBy = options?.partitionBy ?? 'toYYYYMM(timestamp)';
    const orderBy = options?.orderBy ?? ['timestamp', 'level'];
    const ttl = options?.ttl;

    let ddl = `CREATE TABLE IF NOT EXISTS ${tableName} (
    timestamp       DateTime64(3, 'UTC'),
    level           LowCardinality(String),
    message_template String,
    rendered_message String,
    source_context  LowCardinality(String)  DEFAULT '',
    properties      String                  DEFAULT '{}',
    exception       Nullable(String),
    correlation_id  Nullable(String),
    trace_id        Nullable(String),
    span_id         Nullable(String)
) ENGINE = ${engine}
PARTITION BY ${partitionBy}
ORDER BY (${orderBy.join(', ')})`;

    if (ttl) {
        ddl += `\nTTL ${ttl}`;
    }

    await connection.raw(ddl);
}

/**
 * Creates a ClickHouse sink that batch inserts log events.
 *
 * Ships as a separate entrypoint (`@cleverbrush/log/clickhouse`) to
 * avoid forcing `@cleverbrush/knex-clickhouse` as a dependency.
 *
 * @param options - ClickHouse connection and batching configuration
 * @returns a `LogSink` that batch inserts into ClickHouse
 *
 * @example
 * ```ts
 * const sink = clickHouseSink({
 *     connection: ch,
 *     table: 'application_logs',
 *     batchSize: 1000,
 * });
 * ```
 */
export function clickHouseSink(options: ClickHouseSinkOptions): LogSink {
    const cols = { ...DEFAULT_COLUMNS, ...options.columns };
    const table = options.table;
    const conn = options.connection;

    const batcher = new BatchingSink({
        batchSize: options.batchSize ?? 1_000,
        flushInterval: options.flushInterval ?? 5_000,
        emit: async (batch: LogEvent[]) => {
            const rows = batch.map(event => ({
                [cols.timestamp]: event.timestamp,
                [cols.level]: levelToString(event.level),
                [cols.messageTemplate]: event.messageTemplate,
                [cols.renderedMessage]: event.renderedMessage,
                [cols.sourceContext]:
                    (event.properties.SourceContext as string) ?? '',
                [cols.properties]: JSON.stringify(
                    safeSerialize(event.properties)
                ),
                [cols.exception]:
                    event.exception?.stack ?? event.exception?.message ?? null,
                [cols.correlationId]:
                    (event.properties.CorrelationId as string) ?? null,
                [cols.traceId]: (event.properties.TraceId as string) ?? null,
                [cols.spanId]: (event.properties.SpanId as string) ?? null
            }));

            await conn(table).insert(rows);
        }
    });

    return {
        async emit(events: LogEvent[]): Promise<void> {
            await batcher.emit(events);
        },

        async flush(): Promise<void> {
            await batcher.flush();
        },

        async [Symbol.asyncDispose](): Promise<void> {
            await batcher[Symbol.asyncDispose]();
        }
    };
}
