import type {
    DemoSlowEndpoint,
    DemoFlakyEndpoint,
    DemoEchoEndpoint
} from '../endpoints.js';
import type { Handler } from '@cleverbrush/server';

// Track flaky endpoint failures per key
const flakyCounters = new Map<string, number>();

export const demoSlowHandler: Handler<typeof DemoSlowEndpoint> = async ({
    query
}) => {
    const delay = query?.delay ?? 3000;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return { ok: `responded after ${delay}ms` };
};

export const demoFlakyHandler: Handler<typeof DemoFlakyEndpoint> =
    async ({ query }) => {
        const failCount = query?.failCount ?? 2;
        const key = query?.key ?? 'default';
        const current = flakyCounters.get(key) ?? 0;
        flakyCounters.set(key, current + 1);

        if (current < failCount) {
            throw new Error(
                `Simulated failure ${current + 1}/${failCount}`
            );
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
