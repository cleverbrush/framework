import { describe, expect, it, vi } from 'vitest';
import type { LogEvent } from '../LogEvent.js';
import { LogLevel } from '../LogLevel.js';
import { clickHouseSink, createLogsTable } from './ClickHouseSink.js';

function makeEvent(props: Partial<LogEvent> = {}): LogEvent {
    return {
        timestamp: new Date('2024-01-01T00:00:00Z'),
        level: LogLevel.Information,
        messageTemplate: 'hello {Name}',
        renderedMessage: 'hello world',
        properties: { Name: 'world' },
        ...props
    };
}

function makeConn() {
    const insert = vi.fn().mockResolvedValue(undefined);
    const conn: any = vi.fn(() => ({ insert }));
    conn.raw = vi.fn().mockResolvedValue(undefined);
    return { conn, insert };
}

describe('clickHouseSink', () => {
    it('flushes batched events as table inserts with default columns', async () => {
        const { conn, insert } = makeConn();
        const sink = clickHouseSink({
            connection: conn,
            table: 'logs',
            batchSize: 1
        });

        await sink.emit([
            makeEvent({
                properties: {
                    SourceContext: 'OrderService',
                    CorrelationId: 'c-1',
                    TraceId: 't-1',
                    SpanId: 's-1',
                    Name: 'world'
                },
                exception: Object.assign(new Error('boom'), {
                    stack: 'STACK'
                })
            })
        ]);
        await sink.flush();

        expect(conn).toHaveBeenCalledWith('logs');
        expect(insert).toHaveBeenCalledTimes(1);

        const rows = insert.mock.calls[0][0] as any[];
        expect(rows).toHaveLength(1);
        const row = rows[0];
        expect(row.level).toBe('information');
        expect(row.message_template).toBe('hello {Name}');
        expect(row.rendered_message).toBe('hello world');
        expect(row.source_context).toBe('OrderService');
        expect(row.correlation_id).toBe('c-1');
        expect(row.trace_id).toBe('t-1');
        expect(row.span_id).toBe('s-1');
        expect(row.exception).toBe('STACK');
        expect(JSON.parse(row.properties)).toMatchObject({ Name: 'world' });

        await sink[Symbol.asyncDispose]();
    });

    it('falls back to error.message when stack is missing', async () => {
        const { conn, insert } = makeConn();
        const err = new Error('no stack');
        delete (err as any).stack;
        const sink = clickHouseSink({
            connection: conn,
            table: 'logs',
            batchSize: 1
        });

        await sink.emit([makeEvent({ exception: err })]);
        await sink.flush();
        await sink[Symbol.asyncDispose]();

        const row = insert.mock.calls[0][0][0];
        expect(row.exception).toBe('no stack');
    });

    it('serialises null for missing properties', async () => {
        const { conn, insert } = makeConn();
        const sink = clickHouseSink({
            connection: conn,
            table: 'logs',
            batchSize: 1
        });

        await sink.emit([makeEvent()]);
        await sink.flush();
        await sink[Symbol.asyncDispose]();

        const row = insert.mock.calls[0][0][0];
        expect(row.source_context).toBe('');
        expect(row.correlation_id).toBeNull();
        expect(row.trace_id).toBeNull();
        expect(row.span_id).toBeNull();
        expect(row.exception).toBeNull();
    });

    it('honours custom column mapping', async () => {
        const { conn, insert } = makeConn();
        const sink = clickHouseSink({
            connection: conn,
            table: 'logs',
            batchSize: 1,
            columns: { renderedMessage: 'msg', level: 'lvl' }
        });

        await sink.emit([makeEvent()]);
        await sink.flush();
        await sink[Symbol.asyncDispose]();

        const row = insert.mock.calls[0][0][0];
        expect(row.msg).toBe('hello world');
        expect(row.lvl).toBe('information');
    });
});

describe('createLogsTable', () => {
    it('issues CREATE TABLE DDL with default options', async () => {
        const { conn } = makeConn();
        await createLogsTable(conn, 'app_logs');

        expect(conn.raw).toHaveBeenCalledTimes(1);
        const ddl = conn.raw.mock.calls[0][0] as string;
        expect(ddl).toContain('CREATE TABLE IF NOT EXISTS app_logs');
        expect(ddl).toContain('ENGINE = MergeTree');
        expect(ddl).toContain('PARTITION BY toYYYYMM(timestamp)');
        expect(ddl).toContain('ORDER BY (timestamp, level)');
        expect(ddl).not.toContain('TTL');
    });

    it('appends TTL when provided and honours custom options', async () => {
        const { conn } = makeConn();
        await createLogsTable(conn, 'app_logs', {
            engine: 'ReplacingMergeTree',
            partitionBy: 'toYYYYMMDD(timestamp)',
            orderBy: ['level', 'timestamp'],
            ttl: 'timestamp + INTERVAL 7 DAY'
        });

        const ddl = conn.raw.mock.calls[0][0] as string;
        expect(ddl).toContain('ENGINE = ReplacingMergeTree');
        expect(ddl).toContain('PARTITION BY toYYYYMMDD(timestamp)');
        expect(ddl).toContain('ORDER BY (level, timestamp)');
        expect(ddl).toContain('TTL timestamp + INTERVAL 7 DAY');
    });
});
