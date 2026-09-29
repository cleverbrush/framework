import { spawnSync } from 'node:child_process';
import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    symlinkSync,
    writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** Generate and compile equivalent, separately packaged 1,000-operation consumers. */
function checkLargeConsumers() {
    const temporary = mkdtempSync(
        join(tmpdir(), 'framework-implementation-consumer-')
    );
    const write = (path: string, contents: string) => {
        const destination = join(temporary, path);
        mkdirSync(dirname(destination), { recursive: true });
        writeFileSync(destination, contents);
    };
    const metrics: Record<string, Record<string, string>> = {};
    try {
        symlinkSync(
            join(repository, 'node_modules'),
            join(temporary, 'node_modules'),
            'dir'
        );
        write('package.json', JSON.stringify({ type: 'module' }));
        for (const style of ['existing', 'modular']) {
            write(
                `${style}/shared.ts`,
                `import { object, string } from '@cleverbrush/schema';
export const Db = object({ name: string() });
export const Query = object({ search: string() });
export const Output = object({ title: string() });`
            );
            const contractImports: string[] = [];
            const rootImports: string[] = [];
            for (let group = 0; group < 10; group++) {
                const name = `feature${group}`;
                const names = Array.from(
                    { length: 100 },
                    (_, i) => `operation${i}`
                );
                write(
                    `${style}/${name}/contract.ts`,
                    `import { endpoint } from '@cleverbrush/server/contract';
import { Query, Output } from '../shared.js';
export const ${name} = {
${names.map(operation => `${operation}: endpoint.get('/${name}/${operation}').query(Query).responses({ 200: Output })`).join(',\n')}
};`
                );
                contractImports.push(
                    `import { ${name} } from './${name}/contract.js';`
                );
                const scope =
                    style === 'modular'
                        ? `import { implement } from '@cleverbrush/server';
export const scope = implement(api).group('${name}', { inject: { db: Db }, tags: ['${name}'] });`
                        : `export const scope = { endpoints: {
${names.map(operation => `${operation}: api.${name}.${operation}.inject({ db: Db }).tags('${name}')`).join(',\n')}
} };`;
                write(
                    `${style}/${name}/scope.ts`,
                    `import { api } from '../contract.js';
import { Db } from '../shared.js';
${scope}`
                );
                for (const operation of names) {
                    write(
                        `${style}/${name}/handlers/${operation}.ts`,
                        `import type { Handler } from '@cleverbrush/server';
import type { scope } from '../scope.js';
export const ${operation}: Handler<typeof scope.endpoints.${operation}> = ({ query }, { db }) => ({ title: query.search + db.name });`
                    );
                }
                const handlers = `{ ${names.join(', ')} }`;
                write(
                    `${style}/${name}/index.ts`,
                    `import { scope } from './scope.js';
${names.map(operation => `import { ${operation} } from './handlers/${operation}.js';`).join('\n')}
${
    style === 'modular'
        ? `export const ${name} = scope.withHandlers(${handlers});`
        : `export const ${name} = { endpoints: scope.endpoints, handlers: ${handlers} };`
}`
                );
                rootImports.push(
                    `import { ${name} } from './${name}/index.js';`
                );
            }
            const groups = Array.from({ length: 10 }, (_, i) => `feature${i}`);
            write(
                `${style}/contract.ts`,
                `import { defineApi } from '@cleverbrush/server/contract';
${contractImports.join('\n')}
export const api = defineApi({ ${groups.join(', ')} });`
            );
            write(
                `${style}/index.ts`,
                `${rootImports.join('\n')}
import { api } from './contract.js';
${
    style === 'modular'
        ? `import { implement } from '@cleverbrush/server';
export const registration = implement(api).use(${groups.join(', ')}).complete();`
        : `import { mapHandlers } from '@cleverbrush/server';
export const registration = mapHandlers({ ${groups.map(g => `${g}: ${g}.endpoints`).join(', ')} }, { ${groups.map(g => `${g}: ${g}.handlers`).join(', ')} });`
}`
            );
            write(
                `${style}/tsconfig.json`,
                JSON.stringify({
                    compilerOptions: {
                        target: 'ES2022',
                        module: 'ESNext',
                        moduleResolution: 'bundler',
                        strict: true,
                        declaration: true,
                        emitDeclarationOnly: true,
                        outDir: 'dist',
                        types: ['node'],
                        lib: ['ES2022', 'ESNext.Disposable'],
                        skipLibCheck: false
                    },
                    include: ['**/*.ts'],
                    exclude: ['dist']
                })
            );
            const result = spawnSync(
                process.execPath,
                [
                    join(repository, 'node_modules/typescript/lib/tsc.js'),
                    '-p',
                    join(temporary, style, 'tsconfig.json'),
                    '--extendedDiagnostics'
                ],
                { encoding: 'utf8', timeout: 90000, maxBuffer: 4 * 1024 * 1024 }
            );
            if (result.status !== 0)
                throw new Error(
                    `${style} consumer failed:\n${result.stdout}\n${result.stderr}\n${result.error ?? ''}`
                );
            const declaration = readFileSync(
                join(temporary, style, 'dist/index.d.ts'),
                'utf8'
            );
            if (!declaration.includes('HandlerMapping'))
                throw new Error('Missing public registration declaration');
            metrics[style] = Object.fromEntries(
                result.stdout
                    .split('\n')
                    .map(line => line.split(/:\s+/, 2))
                    .filter(([key]) =>
                        [
                            'Types',
                            'Instantiations',
                            'Memory used',
                            'Check time',
                            'Emit time',
                            'Total time'
                        ].includes(key)
                    )
            );
        }
        return metrics;
    } finally {
        // Only this test's generated temporary directory is removed.
        rmSync(temporary, { recursive: true, force: true });
    }
}

it('typechecks and emits a 1,000-operation multi-file consumer against published declarations', () => {
    const metrics = checkLargeConsumers();
    expect(metrics).toHaveProperty('existing');
    expect(metrics).toHaveProperty('modular');
    process.stdout.write(
        `Implementation consumer compiler metrics: ${JSON.stringify(metrics)}\n`
    );
}, 200000);
