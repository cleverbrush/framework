import { context, trace } from '@opentelemetry/api';
import {
    InMemorySpanExporter,
    SimpleSpanProcessor
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { instrumentKnex } from './instrumentKnex.js';

const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)]
});

beforeAll(() => provider.register());
afterAll(async () => provider.shutdown());
beforeEach(() => exporter.reset());

/**
 * Minimal mock of the Knex `EventEmitter` surface our instrumentation
 * relies on (`.client`, `.on()`).
 */
function makeMockKnex(client: any = {}): any {
    const handlers: Record<string, Function[]> = {};
    return {
        client: { dialect: 'pg', config: { client: 'pg', ...client } },
        on(event: string, handler: Function) {
            if (!handlers[event]) handlers[event] = [];
            handlers[event].push(handler);
            return this;
        },
        emit(event: string, ...args: unknown[]) {
            for (const h of handlers[event] ?? []) h(...args);
        }
    };
}

describe('instrumentKnex', () => {
    it('emits a CLIENT span per query with semantic attributes', () => {
        const k = makeMockKnex({
            connection: {
                database: 'todo_db',
                host: 'localhost',
                port: 5432
            }
        });
        instrumentKnex(k);
        k.emit('query', {
            sql: 'select * from todos where id = ?',
            method: 'select',
            __knexQueryUid: 'q1'
        });
        k.emit('query-response', [], {
            sql: 'select * from todos where id = ?',
            __knexQueryUid: 'q1'
        });
        const spans = exporter.getFinishedSpans();
        expect(spans).toHaveLength(1);
        const span = spans[0]!;
        expect(span.kind).toBe(2); // CLIENT
        expect(span.name).toBe('SELECT');
        expect(span.attributes['db.system.name']).toBe('postgresql');
        expect(span.attributes['db.namespace']).toBe('todo_db');
        expect(span.attributes['db.operation.name']).toBe('SELECT');
        expect(span.attributes['db.query.text']).toBe(
            'select * from todos where id = ?'
        );
        expect(span.attributes['server.address']).toBe('localhost');
        expect(span.attributes['server.port']).toBe(5432);
        expect(span.status.code).toBe(1); // OK
    });

    it('marks span ERROR on query-error', () => {
        const k = makeMockKnex();
        instrumentKnex(k);
        k.emit('query', { sql: 'broken sql', __knexQueryUid: 'q2' });
        k.emit('query-error', new Error('syntax error'), {
            __knexQueryUid: 'q2'
        });
        const span = exporter.getFinishedSpans()[0]!;
        expect(span.status.code).toBe(2); // ERROR
        expect(span.status.message).toBe('syntax error');
        expect(span.events.some(e => e.name === 'exception')).toBe(true);
    });

    it('handles non-Error thrown values on query-error (string)', () => {
        const k = makeMockKnex();
        instrumentKnex(k);
        k.emit('query', { sql: 'select 1', __knexQueryUid: 'qe-str' });
        k.emit('query-error', 'connection lost', {
            __knexQueryUid: 'qe-str'
        });
        const span = exporter.getFinishedSpans()[0]!;
        expect(span.status.code).toBe(2); // ERROR
        expect(span.status.message).toBe('connection lost');
        // No `exception` event when the value isn't an Error.
        expect(span.events.some(e => e.name === 'exception')).toBe(false);
    });

    it('handles non-Error thrown values on query-error (object)', () => {
        const k = makeMockKnex();
        instrumentKnex(k);
        k.emit('query', { sql: 'select 1', __knexQueryUid: 'qe-obj' });
        k.emit('query-error', { code: 42 }, { __knexQueryUid: 'qe-obj' });
        const span = exporter.getFinishedSpans()[0]!;
        expect(span.status.code).toBe(2); // ERROR
        // String() of a plain object yields '[object Object]' — verify the
        // instrumentation still ends the span with a string status message.
        expect(typeof span.status.message).toBe('string');
        expect(span.status.message).toBe('[object Object]');
    });

    it('ignores orphan query-error events with no matching query', () => {
        const k = makeMockKnex();
        instrumentKnex(k);
        // No prior `query` event with this uid.
        k.emit('query-error', new Error('whatever'), {
            __knexQueryUid: 'orphan'
        });
        // Also no uid at all.
        k.emit('query-error', new Error('whatever'), {});
        expect(exporter.getFinishedSpans()).toHaveLength(0);
    });

    it('preserves db.query.text and db.operation.name when query fails', () => {
        const k = makeMockKnex();
        instrumentKnex(k);
        k.emit('query', {
            sql: 'select * from todos where id = ?',
            method: 'select',
            __knexQueryUid: 'qe-attrs'
        });
        k.emit('query-error', new Error('boom'), {
            __knexQueryUid: 'qe-attrs'
        });
        const span = exporter.getFinishedSpans()[0]!;
        expect(span.attributes['db.operation.name']).toBe('SELECT');
        expect(span.attributes['db.query.text']).toBe(
            'select * from todos where id = ?'
        );
        expect(span.status.code).toBe(2); // ERROR
    });

    it('records the exception with name and stack on query-error', () => {
        const k = makeMockKnex();
        instrumentKnex(k);
        k.emit('query', { sql: 'select 1', __knexQueryUid: 'qe-rec' });
        const err = new Error('pool exhausted');
        err.name = 'PoolError';
        k.emit('query-error', err, { __knexQueryUid: 'qe-rec' });
        const span = exporter.getFinishedSpans()[0]!;
        const ex = span.events.find(e => e.name === 'exception');
        expect(ex).toBeDefined();
        expect(ex!.attributes?.['exception.message']).toBe('pool exhausted');
        expect(ex!.attributes?.['exception.type']).toBe('PoolError');
    });

    it('parents queries under the ambient context', () => {
        const k = makeMockKnex();
        instrumentKnex(k);

        const tracer = trace.getTracer('test');
        const parent = tracer.startSpan('http.request');
        const ctx = trace.setSpan(context.active(), parent);
        context.with(ctx, () => {
            k.emit('query', {
                sql: 'select 1',
                __knexQueryUid: 'q3'
            });
            k.emit('query-response', [], { __knexQueryUid: 'q3' });
        });
        parent.end();

        const spans = exporter.getFinishedSpans();
        const child = spans.find(s => s.name === 'SELECT')!;
        expect(child.parentSpanContext?.spanId).toBe(
            parent.spanContext().spanId
        );
    });

    it('respects recordStatement=false (no SQL recorded)', () => {
        const k = makeMockKnex();
        instrumentKnex(k, { recordStatement: false });
        k.emit('query', { sql: 'select 1', __knexQueryUid: 'q4' });
        k.emit('query-response', [], { __knexQueryUid: 'q4' });
        expect(
            exporter.getFinishedSpans()[0]!.attributes['db.query.text']
        ).toBeUndefined();
    });

    it('applies sanitizeStatement hook', () => {
        const k = makeMockKnex();
        instrumentKnex(k, { sanitizeStatement: () => '<redacted>' });
        k.emit('query', {
            sql: 'select * from secrets',
            __knexQueryUid: 'q5'
        });
        k.emit('query-response', [], { __knexQueryUid: 'q5' });
        expect(
            exporter.getFinishedSpans()[0]!.attributes['db.query.text']
        ).toBe('<redacted>');
    });

    it('returns the same knex instance', () => {
        const k = makeMockKnex();
        expect(instrumentKnex(k)).toBe(k);
    });

    it('infers db.system from common dialects', () => {
        const cases: Array<[string, string]> = [
            ['mysql', 'mysql'],
            ['mysql2', 'mysql'],
            ['better-sqlite3', 'sqlite'],
            ['mssql', 'mssql'],
            ['oracledb', 'oracle'],
            ['unknowndialect', 'unknowndialect']
        ];
        for (const [dialect, expected] of cases) {
            exporter.reset();
            const k = makeMockKnex();
            k.client.dialect = dialect;
            instrumentKnex(k);
            k.emit('query', { sql: 'select 1', __knexQueryUid: 'qx' });
            k.emit('query-response', [], { __knexQueryUid: 'qx' });
            expect(
                exporter.getFinishedSpans()[0]!.attributes['db.system.name']
            ).toBe(expected);
        }
    });
});
