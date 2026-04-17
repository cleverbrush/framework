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
    external: ['ws']
});
