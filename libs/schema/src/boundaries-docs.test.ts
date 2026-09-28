import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

describe('published boundary documentation', () => {
    it('preserves summaries for new APIs, types and public boundary members', () => {
        const missing: string[] = [];
        for (const [path, names] of [
            [
                '../dist/builders/ReferenceSchemaBuilder.d.ts',
                ['ReferenceSchemaBuilder', 'schemaRef']
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
            const hasSummary = (node: ts.Node) =>
                (node as ts.Node & { jsDoc?: readonly ts.JSDoc[] }).jsDoc?.some(
                    doc => doc.comment
                );
            for (const node of source.statements) {
                const name =
                    'name' in node && node.name
                        ? (node.name as ts.Identifier).text
                        : '';
                if (!(names as readonly string[]).includes(name)) continue;
                if (!hasSummary(node)) missing.push(name);
                if (ts.isClassDeclaration(node))
                    for (const member of node.members) {
                        if (
                            ts.getCombinedModifierFlags(member) &
                            (ts.ModifierFlags.Private |
                                ts.ModifierFlags.Protected)
                        )
                            continue;
                        if (member.name && ts.isPrivateIdentifier(member.name))
                            continue;
                        if (
                            ts
                                .getJSDocTags(member)
                                .some(tag => tag.tagName.text === 'internal')
                        )
                            continue;
                        if (!hasSummary(member))
                            missing.push(
                                name + '.' + member.name?.getText(source)
                            );
                    }
            }
        }
        expect(missing).toEqual([]);
    });
});
