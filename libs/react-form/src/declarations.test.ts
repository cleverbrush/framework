// @vitest-environment node

import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { expect, test } from 'vitest';

test('consumers can emit declarations for exported inferred form systems', () => {
    const fixture = fileURLToPath(
        new URL('../test-fixtures/exported-system.tsx', import.meta.url)
    );
    const options: ts.CompilerOptions = {
        declaration: true,
        emitDeclarationOnly: true,
        strict: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        jsx: ts.JsxEmit.ReactJSX
    };
    const host = ts.createCompilerHost(options);
    const output: string[] = [];
    host.writeFile = (_fileName, content) => {
        output.push(content);
    };
    const program = ts.createProgram([fixture], options, host);
    const diagnostics = [
        ...ts.getPreEmitDiagnostics(program),
        ...program.emit().diagnostics
    ];
    expect(
        diagnostics.map(diagnostic =>
            ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
        )
    ).toEqual([]);
    expect(output.join('\n')).toContain('TypedFormSystem');
});
