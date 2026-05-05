import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const clientSrc = resolve(__dirname, '../../libs/client/src');

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            // Resolve backend contract from source during development
            '@cleverbrush/todo-backend/contract': resolve(__dirname, '../todo-backend/src/contract.ts'),
            // Resolve @cleverbrush/client sub-paths from TypeScript source so that
            // dev-server changes take effect immediately (Vite HMR) without
            // requiring a dist rebuild + server restart.
            // More-specific sub-paths must come before the base package entry.
            '@cleverbrush/client/react':             `${clientSrc}/react.ts`,
            '@cleverbrush/client/retry':             `${clientSrc}/retry.ts`,
            '@cleverbrush/client/timeout':           `${clientSrc}/timeout.ts`,
            '@cleverbrush/client/dedupe':            `${clientSrc}/dedupe.ts`,
            '@cleverbrush/client/idempotency':       `${clientSrc}/idempotency.ts`,
            '@cleverbrush/client/cache':             `${clientSrc}/cache.ts`,
            '@cleverbrush/client/batching':          `${clientSrc}/batching.ts`,
            '@cleverbrush/client/optimistic-update': `${clientSrc}/optimisticUpdate.ts`,
            '@cleverbrush/client/offline-queue':     `${clientSrc}/offlineQueue.ts`,
            '@cleverbrush/client':                   `${clientSrc}/index.ts`
        },
        // Force a single instance of these packages so instanceof checks work
        // across @cleverbrush/react-form (which bundles its own copy) and app code
        dedupe: ['@cleverbrush/schema', '@cleverbrush/react-form']
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: process.env.VITE_API_URL ?? 'http://localhost:3000',
                changeOrigin: true
            },
            '/health': {
                target: process.env.VITE_API_URL ?? 'http://localhost:3000',
                changeOrigin: true
            },
            '/__batch': {
                target: process.env.VITE_API_URL ?? 'http://localhost:3000',
                changeOrigin: true
            },
            '/ws': {
                target: process.env.VITE_API_URL ?? 'http://localhost:3000',
                changeOrigin: true,
                ws: true
            }
        }
    }
});
