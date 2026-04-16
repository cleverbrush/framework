import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            // Resolve backend contract from source during development
            '@cleverbrush/todo-backend/contract': resolve(__dirname, '../todo-backend/src/contract.ts')
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
