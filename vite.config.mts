/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: [
            'libs/**/*/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
        ],
        coverage: {
            include: ['libs/**/*/src/**/*.{js,mjs,cjs,ts,mts,cts}'],
            exclude: [
                '**/node_modules/**',
                'libs/**/*/src/index.ts',
                'libs/**/*/src/types.ts'
            ]
        },
        globals: true,
        mockReset: true,
        environment: 'node'
    }
});
