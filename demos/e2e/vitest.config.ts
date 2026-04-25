/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

/**
 * Two vitest projects:
 *  - `api`: parallel backend HTTP / WebSocket tests
 *  - `ui` : Playwright-driven browser smokes, single-fork to keep the
 *           browser well-behaved and avoid concurrent login collisions
 *
 * Both projects share the same global setup which orchestrates the
 * docker-compose stack (postgres + clickstack + backend + frontend) and
 * runs migrations once before any tests execute.
 */
export default defineConfig({
    test: {
        globalSetup: ['./src/setup/global-setup.ts'],
        // Long timeouts because tests cover real services + stack startup.
        testTimeout: 60_000,
        hookTimeout: 180_000,
        projects: [
            {
                test: {
                    name: 'api',
                    include: ['src/api/**/*.test.ts'],
                    globalSetup: ['./src/setup/global-setup.ts'],
                    testTimeout: 60_000,
                    hookTimeout: 180_000
                }
            },
            {
                test: {
                    name: 'ui',
                    include: ['src/ui/**/*.test.ts'],
                    globalSetup: ['./src/setup/global-setup.ts'],
                    testTimeout: 90_000,
                    hookTimeout: 180_000,
                    pool: 'forks',
                    forks: { singleFork: true }
                }
            }
        ]
    }
});
