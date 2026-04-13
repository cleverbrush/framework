import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    tsconfig: './tsconfig.build.json',
    dts: true,
    minify: true,
    sourcemap: true,
    clean: true,
    target: 'es2022'
});
