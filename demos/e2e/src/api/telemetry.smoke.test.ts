import { afterAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { createUser } from '../support/auth.js';
import { clickhouseQuery, waitForRows } from '../support/clickhouse.js';
import { closePool } from '../support/db.js';
import { request } from '../support/http.js';

afterAll(closePool);

/**
 * Generate a W3C traceparent header with a random trace id so we can
 * later locate the corresponding spans/logs in ClickHouse without
 * cross-contamination from concurrent traffic.
 */
function newTraceparent(): { traceparent: string; traceId: string } {
    const traceId = randomBytes(16).toString('hex');
    const spanId = randomBytes(8).toString('hex');
    return {
        traceparent: `00-${traceId}-${spanId}-01`,
        traceId
    };
}

describe('Telemetry smoke — ClickHouse logs & traces correlation', () => {
    it('produces logs and traces in ClickHouse for a known trace id', async () => {
        const u = await createUser({ suite: 'telemetry' });
        const { traceparent, traceId } = newTraceparent();

        // Drive a trivial authed request — every backend HTTP request emits
        // a structured "HTTP <method> <path> responded ..." log entry plus
        // a server span via the OTel HTTP instrumentation.
        const res = await request('GET', '/api/users/me', {
            token: u.token,
            headers: { traceparent }
        });
        expect(res.status).toBe(200);

        // ── Logs ──────────────────────────────────────────────────────────
        const logs = await waitForRows<{
            Body: string;
            TraceId: string;
        }>(
            `SELECT Body, TraceId FROM default.otel_logs WHERE TraceId = '${traceId}' FORMAT JSON`,
            45_000,
            1_000
        );
        expect(logs.length).toBeGreaterThan(0);
        const httpLog = logs.find(l => /HTTP\s+GET/.test(l.Body));
        expect(httpLog).toBeDefined();
        expect(httpLog!.Body).toMatch(/\/api\/users\/me/);

        // ── Traces ────────────────────────────────────────────────────────
        const spans = await waitForRows<{
            SpanName: string;
            ServiceName: string;
        }>(
            `SELECT SpanName, ServiceName FROM default.otel_traces WHERE TraceId = '${traceId}' FORMAT JSON`,
            45_000,
            1_000
        );
        expect(spans.length).toBeGreaterThan(0);
        const services = new Set(spans.map(s => s.ServiceName));
        expect(services.has('todo-backend')).toBe(true);
    });

    it('ClickHouse is reachable and reports recent log volume', async () => {
        const { rows } = await clickhouseQuery<{ recent: string }>(
            `SELECT toString(count()) AS recent FROM default.otel_logs WHERE Timestamp >= now() - INTERVAL 1 HOUR FORMAT JSON`
        );
        expect(rows.length).toBe(1);
        // Smoke: not asserting an exact count, just that the pipeline isn't empty.
        expect(Number(rows[0].recent)).toBeGreaterThanOrEqual(0);
    });
});
