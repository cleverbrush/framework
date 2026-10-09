/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Compiler-consumer tests allocate several GB; bound parallel workers.
        maxWorkers: 4,
        // Use simple glob pattern for auto-discovery
        projects: [
            'libs/*',
            {
                test: {
                    name: 'scripts',
                    include: ['scripts/**/*.test.mjs'],
                    environment: 'node'
                }
            }
        ],
        benchmark: {
            ...(process.env.BENCH_JSON
                ? { outputJson: process.env.BENCH_JSON }
                : {})
        },
        include: [
            'libs/**/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
        ],
        coverage: {
            include: ['libs/**/src/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
            exclude: [
                '**/node_modules/**',
                '**/dist/**',
                '**/*.d.ts',
                '**/*.test-d.ts',
                '**/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
                'libs/**/src/index.ts',
                'libs/**/src/types.ts',
                'libs/benchmarks/**'
            ],
            reporter: ['text', 'text-summary', 'json-summary']
        },
        mockReset: true,
        environment: 'node'
    }
});
