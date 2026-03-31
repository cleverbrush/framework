import { defineConfig } from 'tsup';

export default defineConfig({
    entry: [
        'src/index.ts',
        'src/core.ts',
        'src/builders/StringSchemaBuilder.ts',
        'src/builders/NumberSchemaBuilder.ts',
        'src/builders/BooleanSchemaBuilder.ts',
        'src/builders/ObjectSchemaBuilder.ts',
        'src/builders/ArraySchemaBuilder.ts',
        'src/builders/DateSchemaBuilder.ts',
        'src/builders/AnySchemaBuilder.ts',
        'src/builders/UnionSchemaBuilder.ts',
        'src/builders/FunctionSchemaBuilder.ts'
    ],
    format: ['esm'],
    tsconfig: './tsconfig.build.json',
    minify: true,
    sourcemap: true,
    clean: true,
    target: 'es2022'
});
