import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
    include: ['libs/scheduler-postgres/integration/**/*.test.ts'],
    testTimeout: 15000, hookTimeout: 30000
} });
