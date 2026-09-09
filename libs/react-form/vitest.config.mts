/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        typecheck: {
            enabled: true,
            include: ['src/**/*.test-d.{ts,tsx}'],
            tsconfig: './tsconfig.typecheck.json'
        }
    }
});
