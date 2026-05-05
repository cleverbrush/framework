import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/telemetry.ts'],
    format: ['esm'],
    tsconfig: './tsconfig.build.json',
    minify: false,
    sourcemap: true,
    clean: true,
    target: 'es2022',
    noExternal: [/@cleverbrush\/.*/],
    // @opentelemetry/* packages are CJS and use require('async_hooks') + other
    // Node built-ins internally. Bundling them into ESM via tsup's shimmed
    // require breaks at runtime. Keep them external so Node loads them natively.
    // @fastify/busboy is CJS and uses require('node:stream') internally.
    // Bundling it into ESM via tsup's shimmed require breaks at runtime.
    external: ['ws', /^@opentelemetry\//, '@fastify/busboy'],
});
