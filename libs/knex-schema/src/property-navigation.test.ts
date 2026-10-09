import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LanguageVariant, SyntaxKind } from 'typescript/unstable/ast';
import { createScanner } from 'typescript/unstable/ast/scanner';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { typescriptCli } from '../../../scripts/typescript-cli.mjs';
import {
    type Location,
    NativeLanguageService,
    positionAt
} from '../test-fixtures/native-language-service.js';

// Exercise the whole public type pipeline in one language service, including
// downstream ORM, mapper, form and client consumers of the emitted declarations.
const model = fileURLToPath(
    new URL('../test-fixtures/property-navigation.model.ts', import.meta.url)
);
const consumer = fileURLToPath(
    new URL('../test-fixtures/property-navigation.consumer.js', import.meta.url)
);
const compatibility = fileURLToPath(
    new URL('../test-fixtures/property-navigation.types.ts', import.meta.url)
);
const sources = new Map(
    [model, consumer, compatibility].map(file => [
        file,
        readFileSync(file, 'utf8')
    ])
);
const modelSource = sources.get(model)!;

const documentation: Record<string, string> = {
    'infer-name': 'Plain name.',
    'infer-optional': 'Plain optional age.',
    'infer-array': 'Tag label.',
    'input-default': 'Plain defaulted count.',
    validation: 'Plain name.',
    'form-field': 'Plain name.',
    'form-array': 'Tag label.',
    'form-value': 'Plain name.',
    'mapper-target': 'Target label.',
    'mapper-source': 'Plain name.',
    'mapper-compute': 'Plain name.',
    picked: 'Plain name.',
    'entity-nav': 'Department navigation.',
    where: 'User first name.',
    'optional-column': 'User optional score.',
    'read-row': 'User first name.',
    'read-row-json': 'Profile city.',
    'row-schema': 'User first name.',
    'projection-row': 'Projected name.',
    'projection-schema': 'Projected name.',
    'insert-key': 'User first name.',
    'update-key': 'User first name.',
    'insert-value': 'User first name.',
    'query-include': 'Department navigation.',
    'included-nav': 'Department navigation.',
    'included-child': 'Department title.',
    'customized-child': 'Department display label.',
    'db-set': 'Users collection.',
    'orm-where': 'User first name.',
    'orm-include': 'Department navigation.',
    'orm-row': 'User first name.',
    'orm-nav': 'Department navigation.',
    'many-include': 'Owner tasks.',
    'many-result': 'Owner tasks.',
    'many-child': 'Task title.',
    'poly-base': 'Asset id.',
    'poly-field': 'Photo size.',
    'poly-discriminator': 'Asset kind.',
    'poly-schema': 'Photo size.',
    'poly-include': 'Asset department.',
    'poly-relation': 'Asset department.',
    'json-required': 'JSON name.',
    'json-optional': 'JSON age.',
    'json-builder': 'JSON name.',
    'route-param': 'Route id.',
    'merged-group': 'Public users.',
    'merged-endpoint': 'Get users.',
    'client-group': 'Public users.',
    'client-endpoint': 'Get users.',
    'overlap-endpoint': 'User detail operation.',
    'handler-input': 'Plain name.',
    'injected-service': 'Scope dependency.',
    'overridden-service': 'Operation dependency.',
    'service-property': 'Injected value.',
    'deep-shared': 'Right property.',
    'deep-child': 'Right child.',
    'deep-left': 'Left only.',
    'deep-optional': 'Optional merge value.'
};

const references = [...sources].flatMap(([file, source]) =>
    [...source.matchAll(/\/\*([a-z-]+)\*\/\s*(\w+)/g)].map(match => ({
        file,
        name: match[1],
        property: match[2],
        position: match.index + match[0].length - match[2].length,
        language: file.endsWith('.ts') ? 'TypeScript' : 'JavaScript'
    }))
);

let service: NativeLanguageService;
beforeAll(async () => {
    service = new NativeLanguageService();
    await service.open(dirname(model), sources);
});
afterAll(async () => {
    await service?.close();
});

test('navigation fixtures typecheck against public package declarations', () => {
    // Formatting must not silently stop the marker parser from finding cases.
    expect(references.length).toBeGreaterThanOrEqual(64);
    expect(new Set(references.map(reference => reference.name))).toEqual(
        new Set(Object.keys(documentation))
    );
    const result = spawnSync(
        process.execPath,
        [
            typescriptCli(),
            '-p',
            fileURLToPath(
                new URL('../test-fixtures/tsconfig.json', import.meta.url)
            ),
            '--listFiles',
            '--pretty',
            'false'
        ],
        { encoding: 'utf8', timeout: 120_000 }
    );
    expect(result.error).toBeUndefined();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    const files = result.stdout.split('\n').map(file => file.trim());
    for (const name of [
        'knex-schema',
        'orm',
        'mapper',
        'schema-json',
        'server',
        'deep',
        'schema',
        'react-form',
        'client'
    ]) {
        expect(
            files.some(file => file.endsWith(`/libs/${name}/dist/index.d.ts`)),
            `${name} must be tested through its published declarations`
        ).toBe(true);
    }
    // This compiles fixtures across six public packages, including editor
    // language-service metadata; allow coverage overhead on shared runners.
}, 120_000);

describe.each(references)('$language $name ($property)', reference => {
    test('goes to the original property declaration', async () => {
        const doc = documentation[reference.name];
        expect(doc).toBeDefined();
        const comment = `/** ${doc} */`;
        const offset = modelSource.indexOf(comment);
        expect(offset).toBeGreaterThanOrEqual(0);
        const scanner = createScanner(
            true,
            LanguageVariant.Standard,
            modelSource
        );
        scanner.resetTokenState(offset + comment.length);
        scanner.scan();
        if (scanner.getToken() === SyntaxKind.ReadonlyKeyword) scanner.scan();
        expect(scanner.getTokenText()).toBe(reference.property);
        const definitions = await service.request<Location[]>(
            'textDocument/definition',
            {
                textDocument: { uri: pathToFileURL(reference.file).href },
                position: positionAt(
                    sources.get(reference.file)!,
                    reference.position
                )
            }
        );
        expect(definitions).toContainEqual(
            expect.objectContaining({
                uri: pathToFileURL(model).href,
                range: {
                    start: positionAt(modelSource, scanner.getTokenStart()),
                    end: positionAt(
                        modelSource,
                        scanner.getTokenStart() + reference.property.length
                    )
                }
            })
        );
    });

    // TypeScript omits hover docs for this union-context object literal even
    // when both branches navigate to the same schema. Keep the accepted union.
    if (reference.name !== 'update-key') {
        test('shows the original JSDoc on hover', async () => {
            const info = await service.request<{ contents: { value: string } }>(
                'textDocument/hover',
                {
                    textDocument: { uri: pathToFileURL(reference.file).href },
                    position: positionAt(
                        sources.get(reference.file)!,
                        reference.position
                    )
                }
            );
            // Markdown hover separates the signature from the original documentation.
            expect(
                info.contents.value.replace(/^```[\s\S]*?```\s*/, '').trim()
            ).toBe(documentation[reference.name]);
        });
    }
});
