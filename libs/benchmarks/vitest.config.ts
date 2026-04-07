import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        name: 'benchmarks',
        benchmark: {
            include: ['src/**/*.bench.ts']
        },
        include: ['src/**/*.test.ts']
    }
});
