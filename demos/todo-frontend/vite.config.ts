import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            // Resolve todo-shared from source during development
            '@cleverbrush/todo-shared/contract': resolve(__dirname, '../todo-shared/src/contract.ts'),
            '@cleverbrush/todo-shared': resolve(__dirname, '../todo-shared/src/index.ts')
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
            }
        }
    }
});
