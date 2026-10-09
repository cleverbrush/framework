import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['libs/storage-s3/integration/**/*.test.ts'],
        testTimeout: 30000,
        hookTimeout: 30000
    }
});
