import type { Handler } from '@cleverbrush/server';
import type {
    DemoEchoEndpoint,
    DemoFlakyEndpoint,
    DemoSlowEndpoint,
    DemoCrashSqlEndpoint,
    DemoCrashRuntimeEndpoint
} from '../endpoints.js';

// Track flaky endpoint failures per key
const flakyCounters = new Map<string, number>();

export const demoSlowHandler: Handler<typeof DemoSlowEndpoint> = async ({
    query
}) => {
    const delay = query?.delay ?? 3000;
    await new Promise(resolve => setTimeout(resolve, delay));
    return { ok: `responded after ${delay}ms` };
};

export const demoFlakyHandler: Handler<typeof DemoFlakyEndpoint> = async ({
    query
}) => {
    const failCount = query?.failCount ?? 2;
    const key = query?.key ?? 'default';
    const current = flakyCounters.get(key) ?? 0;
    flakyCounters.set(key, current + 1);

    if (current < failCount) {
        throw new Error(`Simulated failure ${current + 1}/${failCount}`);
    }

    // Reset for next demo run
    flakyCounters.delete(key);
    return { attempt: current + 1 };
};

export const demoEchoHandler: Handler<typeof DemoEchoEndpoint> = async ({
    body
}) => {
    return { message: body.message };
};

export const demoCrashSqlHandler: Handler<typeof DemoCrashSqlEndpoint> =
    async (_ctx, { knex }) => {
        // Intentionally queries a non-existent table to trigger a DB error.
        await knex.raw('SELECT * FROM non_existing_table_for_demo_xyz');
        return { ok: 'never' };
    };

export const demoCrashRuntimeHandler: Handler<typeof DemoCrashRuntimeEndpoint> =
    async () => {
        // Intentionally throws an unhandled runtime exception.
        throw new Error(
            'Simulated runtime exception — see this in SigNoz traces/logs!'
        );
    };
