import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    tsconfig: './tsconfig.build.json',
    minify: false,
    sourcemap: true,
    clean: true,
    target: 'es2022',
    // Bundle workspace-local packages so the runtime image doesn't need symlinks
    noExternal: ['@cleverbrush/todo-shared'],
});
