'use client';

import { useCallback, useRef, useState } from 'react';

export interface TypeInfo {
    typeString: string;
    available: boolean;
}

/**
 * Attempts to extract inferred type information from Monaco's TypeScript
 * language service by finding the last schema variable declaration.
 */
export function useTypeInference() {
    const [typeInfo, setTypeInfo] = useState<TypeInfo>({ typeString: '', available: false });
    const editorRef = useRef<unknown>(null);
    const monacoRef = useRef<unknown>(null);

    const setEditor = useCallback((editor: unknown, monaco: unknown) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
    }, []);

    const extractType = useCallback(async (code: string) => {
        const editor = editorRef.current as {
            getModel(): { uri: { toString(): string } } | null;
        } | null;
        const monaco = monacoRef.current as {
            languages: {
                typescript: {
                    getTypeScriptWorker(): Promise<(uri: unknown) => Promise<{
                        getQuickInfoAtPosition(uri: string, offset: number): Promise<{
                            displayParts?: { text: string }[];
                        } | undefined>;
                    }>>;
                };
            };
        } | null;

        if (!editor || !monaco) {
            setTypeInfo({ typeString: '', available: false });
            return;
        }

        try {
            const model = editor.getModel();
            if (!model) return;

            const worker = await monaco.languages.typescript.getTypeScriptWorker();
            const client = await worker(model.uri);

            // Find the variable declarations that assign schemas
            // Look for the last "const X = ..." pattern
            const schemaVarMatch = [...code.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:string|number|boolean|date|func|any|object|array|union)/g)];
            const resultVarMatch = [...code.matchAll(/(?:const|let)\s+(\w+)\s*=\s*\w+\.validate/g)];

            let typeStr = '';

            // Try to get the type of the schema variable (for InferType display)
            if (schemaVarMatch.length > 0) {
                const lastMatch = schemaVarMatch[schemaVarMatch.length - 1];
                const varName = lastMatch[1];
                const varPos = code.indexOf(`const ${varName}`) !== -1
                    ? code.indexOf(`const ${varName}`) + 'const '.length
                    : code.indexOf(`let ${varName}`) + 'let '.length;

                if (varPos >= 0) {
                    const info = await client.getQuickInfoAtPosition(model.uri.toString(), varPos);
                    if (info?.displayParts) {
                        const fullType = info.displayParts.map((p: { text: string }) => p.text).join('');
                        typeStr = formatTypeString(fullType, varName);
                    }
                }
            }

            // Also try to get the validation result type
            if (resultVarMatch.length > 0 && !typeStr) {
                const lastMatch = resultVarMatch[resultVarMatch.length - 1];
                const varName = lastMatch[1];
                const varPos = code.indexOf(`const ${varName}`) + 'const '.length;
                if (varPos >= 0) {
                    const info = await client.getQuickInfoAtPosition(model.uri.toString(), varPos);
                    if (info?.displayParts) {
                        const fullType = info.displayParts.map((p: { text: string }) => p.text).join('');
                        typeStr = formatTypeString(fullType, varName);
                    }
                }
            }

            setTypeInfo({
                typeString: typeStr || 'Type inference unavailable for this code.',
                available: !!typeStr
            });
        } catch {
            setTypeInfo({ typeString: 'Type inference unavailable.', available: false });
        }
    }, []);

    return { typeInfo, setEditor, extractType };
}

function formatTypeString(raw: string, varName: string): string {
    // Remove "const varName: " or "let varName: " prefix
    let result = raw
        .replace(new RegExp(`^\\s*(?:const|let)\\s+${varName}:\\s*`), '')
        .trim();

    // Clean up internal module paths
    result = result
        .replace(/import\([^)]+\)\./g, '')
        .replace(/\b\w+SchemaBuilder\b/g, (match) => {
            const type = match.replace('SchemaBuilder', '').toLowerCase();
            return `Schema<${type}>`;
        });

    if (!result || result === varName) return '';

    return `// InferType<typeof ${varName}>\ntype ${varName}Type = ${result};`;
}
