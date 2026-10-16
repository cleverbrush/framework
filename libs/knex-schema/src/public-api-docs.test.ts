import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Node, SourceFile } from 'typescript/unstable/ast';
import { ModifierFlags } from 'typescript/unstable/ast';
import * as ts from 'typescript/unstable/ast/is';
import { getCombinedModifierFlags } from 'typescript/unstable/ast/utils';
import { API } from 'typescript/unstable/sync';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let api: API;
beforeAll(() => {
    api = new API();
});
afterAll(() => api?.close());

/** Inspect emitted declarations, since those are what installed consumers read. */
function declaration(path: string): SourceFile {
    const url = new URL(path, import.meta.url);
    return api.createSourceFile(fileURLToPath(url), readFileSync(url, 'utf8'))
        .sourceFile;
}

function hasSummary(node: Node): boolean {
    return !!node.jsDoc?.some(doc => ts.isJSDoc(doc) && doc.comment.length);
}

function isInternal(node: Node): boolean {
    return !!node.jsDoc?.some(
        doc =>
            ts.isJSDoc(doc) &&
            doc.tags?.some(tag => tag.tagName.getText() === 'internal')
    );
}

describe('published query/ORM API documentation', () => {
    it('preserves JSDoc for exported functions and every public class member', () => {
        const missing: string[] = [];
        for (const entry of [
            '../dist/index.d.ts',
            '../../orm/dist/index.d.ts'
        ]) {
            const index = declaration(entry);
            for (const statement of index.statements) {
                if (
                    !ts.isExportDeclaration(statement) ||
                    !statement.exportClause ||
                    !ts.isNamedExports(statement.exportClause) ||
                    !statement.moduleSpecifier ||
                    !ts.isStringLiteral(statement.moduleSpecifier) ||
                    !statement.moduleSpecifier.text.startsWith('.')
                )
                    continue;
                const names = new Set(
                    statement.exportClause.elements.map(
                        e => (e.propertyName ?? e.name).text
                    )
                );
                const moduleUrl = new URL(
                    statement.moduleSpecifier.text.replace(/\.js$/, '.d.ts'),
                    new URL(entry, import.meta.url)
                );
                check(declaration(moduleUrl.href), names);
            }
        }
        // Reachable through onConflict(), even though not a root named export.
        check(
            declaration('../dist/operations/insert.d.ts'),
            new Set(['OnConflictBuilder'])
        );
        expect(missing).toEqual([]);

        function check(source: SourceFile, names: Set<string>): void {
            for (const node of source.statements) {
                if (
                    ts.isVariableStatement(node) &&
                    node.declarationList.declarations.some(d =>
                        names.has(d.name.getText(source))
                    ) &&
                    !isInternal(node) &&
                    !hasSummary(node)
                ) {
                    missing.push(
                        node.declarationList.declarations[0].name.getText(
                            source
                        )
                    );
                }
                if (
                    (ts.isFunctionDeclaration(node) ||
                        ts.isClassDeclaration(node)) &&
                    node.name &&
                    names.has(node.name.text) &&
                    !isInternal(node)
                ) {
                    if (!hasSummary(node)) missing.push(node.name.text);
                    if (ts.isClassDeclaration(node)) {
                        for (const member of node.members) {
                            if (
                                getCombinedModifierFlags(member) &
                                    (ModifierFlags.Private |
                                        ModifierFlags.Protected) ||
                                (member.name &&
                                    ts.isPrivateIdentifier(member.name)) ||
                                isInternal(member)
                            )
                                continue;
                            if (!hasSummary(member))
                                missing.push(
                                    `${node.name.text}.${member.name?.getText(source) ?? 'constructor'}`
                                );
                        }
                    }
                }
            }
        }
    });

    it('documents aggregate expressions, bound factory overloads and cursor options', () => {
        for (const [path, name] of [
            ['../dist/expressions.d.ts', 'aggregate'],
            ['../dist/query.d.ts', 'BoundQuery'],
            [
                '../dist/operations/composite-cursor.d.ts',
                'CompositeCursorOptions'
            ]
        ]) {
            const source = declaration(path);
            const missing: string[] = [];
            function visit(node: Node): void {
                if (
                    (ts.isMethodSignatureDeclaration(node) ||
                        ts.isPropertySignatureDeclaration(node) ||
                        ts.isCallSignatureDeclaration(node)) &&
                    !isInternal(node) &&
                    !hasSummary(node)
                ) {
                    missing.push(node.getText(source).split('\n')[0]);
                }
                node.forEachChild(visit);
            }
            const node = source.statements.find(
                n =>
                    (ts.isInterfaceDeclaration(n) && n.name.text === name) ||
                    (ts.isVariableStatement(n) &&
                        n.declarationList.declarations.some(
                            d => d.name.getText(source) === name
                        ))
            );
            expect(node, name).toBeDefined();
            visit(node!);
            expect(missing, name).toEqual([]);
        }
    });
});
