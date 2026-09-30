import { spawnSync } from 'node:child_process';
import {
    mkdtempSync,
    readFileSync,
    rmSync,
    symlinkSync,
    writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

test('documentation and multi-file metadata consumers compile against published declarations', () => {
    const directory = mkdtempSync(join(tmpdir(), 'framework-read-consumer-'));
    try {
        symlinkSync(
            join(repository, 'node_modules'),
            join(directory, 'node_modules'),
            'dir'
        );
        const write = (name: string, text: string) =>
            writeFileSync(join(directory, name), text);
        write('package.json', JSON.stringify({ type: 'module' }));
        const llms = readFileSync(
            join(repository, 'websites/docs/public/llms.txt'),
            'utf8'
        );
        const queryDocs = readFileSync(
            join(repository, 'libs/knex-schema/README.md'),
            'utf8'
        );
        const schemaDocs = readFileSync(
            join(repository, 'libs/schema/README.md'),
            'utf8'
        );
        const namedBlocks = (text: string) => [
            ...text.matchAll(
                /```(?:typescript|ts)\n\/\/ ([\w-]+\.ts)\n([\s\S]*?)```/g
            )
        ];
        expect(namedBlocks(llms)).toHaveLength(4);
        expect(namedBlocks(queryDocs)).toHaveLength(4);
        for (const [, name, content] of [
            ...namedBlocks(llms),
            ...namedBlocks(queryDocs)
        ])
            write(name, content);
        const metadataDocs = schemaDocs
            .split('### Typed metadata methods\n')[1]
            .split('### Stacking Extensions')[0];
        write(
            'metadata-doc.ts',
            metadataDocs.match(/```ts\n([\s\S]*?)```/)![1]
        );
        write(
            'database.ts',
            `import Knex from 'knex'; export const knex = Knex({ client: 'pg' });`
        );
        write(
            'storage.ts',
            `
import { number, object, string } from '@cleverbrush/knex-schema';
import { defineExtension, defineMetadataMethod, withExtensions } from '@cleverbrush/schema';
export const Account = object({
    id: number().primaryKey().bigint(),
    balance: number().decimal(24, 6).optional().hasColumnName('balance_value'),
    label: string()
}).hasTableName('accounts')
  .projection('summary', 'id', 'label')
  .projection('withBalance', a => a.id, a => a.balance);
export const tagged = withExtensions(defineExtension({
    number: { unit: defineMetadataMethod('unit').argument<string>() }
})).number().unit('metres').optional();
`
        );
        write(
            'storage-consumer.ts',
            `
import { type InferExtensionMetadata, type InferType, number } from '@cleverbrush/schema';
import { query } from '@cleverbrush/knex-schema';
import { mapper } from '@cleverbrush/mapper';
import { object, string } from '@cleverbrush/schema';
import { Account, tagged } from './storage.js';
import { knex } from './database.js';
const unit: InferExtensionMetadata<typeof tagged>['unit'] = 'metres';
const value: InferType<typeof tagged> = undefined;
// @ts-expect-error metadata literal must not widen to string
const invalidUnit: InferExtensionMetadata<typeof tagged>['unit'] = 'seconds';
// @ts-expect-error importing database libraries cannot install global storage methods
number().bigint();
export const read = query(knex, Account).withRowSchema().select(a => ({ id: a.id, balance: a.balance }));
const PublicAccount = object({ id: string(), balance: string().nullable() });
export const convert = mapper().configure(read.rowSchema, PublicAccount, m => m)
    .getSyncMapper(read.rowSchema, PublicAccount);
const row: InferType<typeof read.rowSchema> = { id: '9007199254740993', balance: null };
const dto: { id: string; balance: string | null } = convert(row);
// @ts-expect-error exact numeric storage is text, never a rounded JS number
const invalid: InferType<typeof read.rowSchema> = { id: 1, balance: 2 };
`
        );
        write(
            'function-consumer.ts',
            `
import { ServiceCollection } from '@cleverbrush/di';
import { func, number, string } from '@cleverbrush/schema';
const Dependency = string();
const Result = number();
const factory = func().addParameter(Dependency).hasReturnType(Result);
const services = new ServiceCollection().addSingleton(Dependency, 'hello');
services.addSingletonFromSchema(Result, factory, text => text.length);
services.addScopedFromSchema(Result, factory, text => text.length);
services.addTransientFromSchema(Result, factory, text => text.length);
const provider = services.buildServiceProvider();
export const result: number = provider.invoke(factory, text => text.length);
const scope = provider.createScope();
export const scoped: number = scope.serviceProvider.invoke(factory, text => text.length);
// @ts-expect-error dependency types must not widen to any
provider.invoke(factory, (value: number) => value);
// @ts-expect-error implementation must honor the declared return schema
provider.invoke(factory, text => text);
// @ts-expect-error schema-based registration retains parameter types
services.addSingletonFromSchema(Result, factory, (value: number) => value);
`
        );
        write(
            'tsconfig.json',
            JSON.stringify({
                compilerOptions: {
                    target: 'ES2022',
                    module: 'ESNext',
                    moduleResolution: 'bundler',
                    strict: true,
                    skipLibCheck: false,
                    declaration: true,
                    emitDeclarationOnly: true,
                    outDir: 'dist',
                    types: ['node'],
                    lib: ['ES2022', 'DOM', 'ESNext.Disposable']
                },
                include: ['*.ts']
            })
        );
        const result = spawnSync(
            process.execPath,
            [
                join(repository, 'node_modules/typescript/lib/tsc.js'),
                '-p',
                join(directory, 'tsconfig.json')
            ],
            { encoding: 'utf8', timeout: 60000 }
        );
        expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
        expect(
            readFileSync(join(directory, 'dist/storage.d.ts'), 'utf8')
        ).toContain('Account');
        for (const text of [llms, queryDocs]) {
            expect(text).not.toContain('READ-SCHEMAS.md');
            expect(text).not.toContain('COMPOSABLE_QUERIES.md');
        }
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
}, 90000);
