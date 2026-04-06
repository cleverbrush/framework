/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Use simple glob pattern for auto-discovery
        projects: ['libs/*'],
        benchmark: {
            ...(process.env.BENCH_JSON
                ? { outputJson: process.env.BENCH_JSON }
                : {})
        },
        include: [
            'libs/**/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
        ],
        coverage: {
            // Updated for v3: Define include patterns first
            include: ['libs/**/src/**/*.{js,mjs,cjs,ts,mts,cts}'],
            exclude: [
                '**/node_modules/**',
                '**/dist/**',
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
