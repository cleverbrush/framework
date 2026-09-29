import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

describe('published boundary documentation', () => {
    it('preserves declaration summaries for boundary types and methods', () => {
        const hasSummary = (node: ts.Node) =>
            (node as ts.Node & { jsDoc?: readonly ts.JSDoc[] }).jsDoc?.some(
                doc => doc.comment
            );
        for (const [path, names] of [
            [
                '../dist/builders/SchemaBuilder.d.ts',
                ['SchemaBuilder', 'SchemaBuilderProps']
            ],
            ['../../schema-json/dist/types.d.ts', ['ToJsonSchemaOptions']]
        ] as const) {
            const text = readFileSync(new URL(path, import.meta.url), 'utf8');
            const source = ts.createSourceFile(
                path,
                text,
                ts.ScriptTarget.Latest,
                true
            );
            for (const name of names) {
                const node = source.statements.find(
                    node =>
                        'name' in node &&
                        (node.name as ts.Identifier)?.text === name
                );
                expect(node, name).toBeDefined();
                expect(hasSummary(node!), name).toBe(true);
                if (node && ts.isClassDeclaration(node)) {
                    for (const memberName of [
                        'schemaName',
                        'introspect',
                        'derive',
                        'catch',
                        'addPreprocessor'
                    ]) {
                        const member = node.members.find(
                            member =>
                                member.name?.getText(source) === memberName
                        );
                        expect(member, memberName).toBeDefined();
                        expect(hasSummary(member!), memberName).toBe(true);
                    }
                }
            }
        }
    });
});
