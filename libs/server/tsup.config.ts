import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/contract.ts'],
    format: ['esm'],
    tsconfig: './tsconfig.build.json',
    dts: false,
    minify: true,
    sourcemap: true,
    clean: true,
    target: 'es2022',
    // @fastify/busboy is CJS and uses require('node:stream') internally.
    // Bundling it into ESM via tsup's shimmed require breaks at runtime.
    external: ['ws', '@fastify/busboy']
});
