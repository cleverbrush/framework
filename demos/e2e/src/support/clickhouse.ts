import { config } from './env.js';

/**
 * Execute an arbitrary SQL query against ClickHouse via its HTTP interface.
 * Defaults to JSON output so callers receive structured rows.
 */
export async function clickhouseQuery<T = Record<string, unknown>>(
    sql: string,
    options: { format?: 'JSON' | 'TSV' } = {}
): Promise<{ rows: T[] }> {
    const format = options.format ?? 'JSON';
    const url = new URL(config.clickhouseUrl);
    if (config.clickhouseUser) url.searchParams.set('user', config.clickhouseUser);
    if (config.clickhousePassword)
        url.searchParams.set('password', config.clickhousePassword);
    url.searchParams.set('default_format', format);

    const res = await fetch(url, {
        method: 'POST',
        body: sql,
        headers: { 'Content-Type': 'text/plain' }
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(
            `ClickHouse query failed (${res.status}): ${text}\nSQL: ${sql}`
        );
    }
    if (format === 'JSON') {
        const body = (await res.json()) as { data: T[] };
        return { rows: body.data ?? [] };
    }
    const text = await res.text();
    return {
        rows: text
            .split('\n')
            .filter(Boolean)
            .map(line => line as unknown as T)
    };
}

/** Wait until a query returns at least one row, polling at the given interval. */
export async function waitForRows<T = Record<string, unknown>>(
    sql: string,
    timeoutMs = 30_000,
    intervalMs = 500
): Promise<T[]> {
    const deadline = Date.now() + timeoutMs;
    let lastErr: Error | undefined;
    while (Date.now() < deadline) {
        try {
            const { rows } = await clickhouseQuery<T>(sql);
            if (rows.length > 0) return rows;
        } catch (err) {
            lastErr = err as Error;
        }
        await new Promise(r => setTimeout(r, intervalMs));
    }
    throw new Error(
        `Timed out after ${timeoutMs}ms waiting for rows from query: ${sql}` +
            (lastErr ? `\nLast error: ${lastErr.message}` : '')
    );
}

/**
 * Wait until ClickHouse becomes reachable (returns 1) — used during global
 * setup to gate health.
 */
export async function pingClickhouse(timeoutMs = 60_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const { rows } = await clickhouseQuery<{ '1': number }>(
                'SELECT 1'
            );
            if (rows.length > 0) return;
        } catch {
            // ignored
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error(`ClickHouse not reachable after ${timeoutMs}ms`);
}
