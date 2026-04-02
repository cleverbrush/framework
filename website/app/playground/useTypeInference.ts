'use client';

import { useCallback, useRef, useState } from 'react';

export interface TypeInfo {
    typeString: string;
    available: boolean;
    resultObjectType: string;
    inferring: boolean;
}

/**
 * Extracts inferred type information from Monaco's TypeScript language service
 * by resolving InferType<typeof schema> via a temporary hidden model.
 */
export function useTypeInference() {
    const [typeInfo, setTypeInfo] = useState<TypeInfo>({ typeString: '', available: false, resultObjectType: '', inferring: false });
    const editorRef = useRef<unknown>(null);
    const monacoRef = useRef<unknown>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const runId = useRef(0);

    const setEditor = useCallback((editor: unknown, monaco: unknown) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
    }, []);

    const extractType = useCallback((code: string) => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        setTypeInfo(prev => ({ ...prev, inferring: true }));

        debounceTimer.current = setTimeout(async () => {
            const currentRun = ++runId.current;
            const isCurrent = () => currentRun === runId.current;

            // Phase 1: Fast type resolution (no JSDoc)
            const fast = await doExtractFast(code, editorRef, monacoRef);
            if (!isCurrent()) return;

            if (!fast.available) {
                setTypeInfo({ ...fast, inferring: false });
                return;
            }

            // Show types immediately without JSDoc
            setTypeInfo({ ...fast, inferring: true });

            // Phase 2: Enrich with JSDoc (slow, cooperative yielding)
            const enriched = await doEnrichDocs(code, editorRef, monacoRef, fast, isCurrent);
            if (!isCurrent()) return;
            setTypeInfo({ ...enriched, inferring: false });
        }, 500);
    }, []);

    return { typeInfo, setEditor, extractType };
}

/** Yield to the event loop to prevent blocking */
const idle = () => new Promise<void>(r => setTimeout(r, 0));

interface FastResult extends Omit<TypeInfo, 'inferring'> {
    schemaVarName?: string;
    resolvedType?: string;
    resultVarName?: string;
}

/**
 * Phase 1: Resolves types quickly without JSDoc enrichment.
 */
async function doExtractFast(
    code: string,
    editorRef: React.RefObject<unknown>,
    monacoRef: React.RefObject<unknown>
): Promise<FastResult> {
    const editor = editorRef.current as {
        getModel(): { uri: { toString(): string } } | null;
    } | null;
    const monaco = monacoRef.current as MonacoForInference | null;

    if (!editor || !monaco) {
        return { typeString: '', available: false, resultObjectType: '' };
    }

    try {
        const model = editor.getModel();
        if (!model) return { typeString: '', available: false, resultObjectType: '' };

        const schemaVarMatch = [...code.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:string|number|boolean|date|func|any|object|array|union)/g)];
        const resultVarMatch = [...code.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(\w+)\.validate/g)];

        let typeStr = '';
        let resultObjectType = '';
        let schemaVarName: string | undefined;
        let resolvedType: string | undefined;
        let resultVarName: string | undefined;

        if (resultVarMatch.length > 0) {
            const lastMatch = resultVarMatch[resultVarMatch.length - 1];
            resultVarName = lastMatch[1];
            const calledOnSchema = lastMatch[2];

            const resolved = await resolveResultObjectType(monaco, code, resultVarName);
            if (resolved) resultObjectType = resolved;

            // Use the schema that .validate() was called on
            schemaVarName = calledOnSchema;
        }

        // Fall back to last schema declaration if no .validate() match
        if (!schemaVarName && schemaVarMatch.length > 0) {
            schemaVarName = schemaVarMatch[schemaVarMatch.length - 1][1];
        }

        if (schemaVarName) {
            const resolved = await resolveInferType(monaco, code, schemaVarName);
            if (resolved) {
                resolvedType = resolved;
                typeStr = `// InferType<typeof ${schemaVarName}>\ntype ${schemaVarName}Type = ${resolved};`;
                if (!resultObjectType) resultObjectType = resolved;
            }
        }

        return {
            typeString: typeStr || 'Type inference unavailable for this code.',
            available: !!typeStr,
            resultObjectType,
            schemaVarName,
            resolvedType,
            resultVarName
        };
    } catch {
        return { typeString: 'Type inference unavailable.', available: false, resultObjectType: '' };
    }
}

/**
 * Phase 2: Enriches the fast result with JSDoc comments from the TS language service.
 * Uses cooperative yielding to avoid blocking the event loop.
 */
async function doEnrichDocs(
    code: string,
    editorRef: React.RefObject<unknown>,
    monacoRef: React.RefObject<unknown>,
    fast: FastResult,
    isCurrent: () => boolean
): Promise<Omit<TypeInfo, 'inferring'>> {
    if (!fast.schemaVarName || !fast.resolvedType) return fast;

    const monaco = monacoRef.current as MonacoForInference | null;
    if (!monaco) return fast;

    try {
        const isArray = fast.resolvedType.trimEnd().endsWith('[]');
        const isUnion = !isArray && hasTopLevelUnion(fast.resolvedType);

        let docs: DocTree;

        if (isUnion) {
            // Union types: completions on the union only return common properties.
            // Resolve docs from each component schema separately and merge.
            const componentSchemas = extractUnionComponents(code, fast.schemaVarName);
            docs = new Map();
            for (const comp of componentSchemas) {
                if (isCurrent && !isCurrent()) return fast;
                const compExpr = `${comp}.validate({} as any).object!`;
                const compDocs = await resolvePropertyDocsRecursive(monaco, code, 0, isCurrent, compExpr);
                // Merge into combined tree
                for (const [key, node] of compDocs) {
                    if (!docs.has(key)) docs.set(key, node);
                }
            }
            // Also merge any docs from the result expression path (common properties)
            if (fast.resultVarName) {
                const commonDocs = await resolvePropertyDocsRecursive(monaco, code, 0, isCurrent, `${fast.resultVarName}.object!`);
                for (const [key, node] of commonDocs) {
                    if (!docs.has(key)) docs.set(key, node);
                }
            }
        } else {
            // Non-union: use expression path or type expression
            let exprPath: string | undefined;
            if (fast.resultVarName) {
                exprPath = isArray
                    ? `${fast.resultVarName}.object![0]`
                    : `${fast.resultVarName}.object!`;
            }
            let docTypeExpr: string | undefined;
            if (!exprPath) {
                const base = `import('@cleverbrush/schema').InferType<typeof ${fast.schemaVarName}>`;
                docTypeExpr = isArray ? `(${base})[number]` : base;
            }
            docs = await resolvePropertyDocsRecursive(monaco, code, 0, isCurrent, exprPath, docTypeExpr);
        }

        if (!isCurrent()) return fast;

        const elementType = isArray
            ? fast.resolvedType.trimEnd().slice(0, -2)
            : fast.resolvedType;
        const enrichedElement = enrichTypeWithDocs(elementType, docs, '');
        const enriched = isArray ? `${enrichedElement}[]` : enrichedElement;

        // DEBUG: dump doc tree
        dumpDocTree(docs);

        return {
            typeString: `// InferType<typeof ${fast.schemaVarName}>\ntype ${fast.schemaVarName}Type = ${enriched};`,
            available: true,
            resultObjectType: fast.resultObjectType
        };
    } catch {
        return fast;
    }
}

type TsWorkerClient = {
    getQuickInfoAtPosition(uri: string, offset: number): Promise<{
        displayParts?: { text: string }[];
    } | undefined>;
    getCompletionsAtPosition(uri: string, offset: number, options: unknown): Promise<{
        entries?: { name: string }[];
    } | undefined>;
    getCompletionEntryDetails(uri: string, offset: number, name: string): Promise<{
        documentation?: { text: string }[];
    } | undefined>;
};

type MonacoForInference = {
    Uri: { parse(uri: string): unknown };
    editor: {
        createModel(value: string, language: string, uri: unknown): {
            uri: { toString(): string };
            dispose(): void;
        };
    };
    languages: {
        typescript: {
            getTypeScriptWorker(): Promise<(uri: unknown) => Promise<TsWorkerClient>>;
        };
    };
};

interface DocNode {
    doc?: string;
    children?: DocTree;
    _debugTypeStr?: string;
}
type DocTree = Map<string, DocNode>;

const INFER_MARKER = '__PlaygroundInferred';
const RESULT_OBJ_MARKER = '__PlaygroundResultObj';
/** Deep-expand helper injected into temp models to force TS to eagerly resolve mapped/generic types */
const RESOLVE_HELPER = `\ntype __Resolve<T> = T extends readonly (infer E)[] ? __Resolve<E>[] : T extends object ? { [K in keyof T]: __Resolve<T[K]> } : T;\n`;
let helperCounter = 0;
const MAX_DOC_DEPTH = 4;

/**
 * Creates a temporary Monaco model with the user's code plus a
 * `type __PlaygroundInferred = InferType<typeof varName>;` line,
 * then uses getQuickInfoAtPosition to get the fully resolved type.
 */
async function resolveInferType(
    monaco: MonacoForInference,
    code: string,
    varName: string
): Promise<string> {
    const suffix = `${RESOLVE_HELPER}type ${INFER_MARKER} = __Resolve<import('@cleverbrush/schema').InferType<typeof ${varName}>>;`;
    const helperCode = code + suffix;
    const uri = monaco.Uri.parse(`file:///playground-infer-${++helperCounter}.ts`);
    const helperModel = monaco.editor.createModel(helperCode, 'typescript', uri);

    try {
        const worker = await monaco.languages.typescript.getTypeScriptWorker();
        const client = await worker(helperModel.uri);

        const markerOffset = helperCode.indexOf(INFER_MARKER);
        if (markerOffset === -1) return '';

        const info = await client.getQuickInfoAtPosition(helperModel.uri.toString(), markerOffset);
        if (!info?.displayParts) return '';

        const raw = info.displayParts.map((p: { text: string }) => p.text).join('');
        return cleanResolvedType(raw, INFER_MARKER);
    } finally {
        helperModel.dispose();
    }
}

/**
 * Resolves the type of result.object via:
 * `type __PlaygroundResultObj = NonNullable<(typeof varName)["object"]>;`
 */
async function resolveResultObjectType(
    monaco: MonacoForInference,
    code: string,
    varName: string
): Promise<string> {
    const suffix = `${RESOLVE_HELPER}type ${RESULT_OBJ_MARKER} = __Resolve<NonNullable<(typeof ${varName})["object"]>>;`;
    const helperCode = code + suffix;
    const uri = monaco.Uri.parse(`file:///playground-result-${++helperCounter}.ts`);
    const helperModel = monaco.editor.createModel(helperCode, 'typescript', uri);

    try {
        const worker = await monaco.languages.typescript.getTypeScriptWorker();
        const client = await worker(helperModel.uri);

        const markerOffset = helperCode.indexOf(RESULT_OBJ_MARKER);
        if (markerOffset === -1) return '';

        const info = await client.getQuickInfoAtPosition(helperModel.uri.toString(), markerOffset);
        if (!info?.displayParts) return '';

        const raw = info.displayParts.map((p: { text: string }) => p.text).join('');
        return cleanResolvedType(raw, RESULT_OBJ_MARKER);
    } finally {
        helperModel.dispose();
    }
}

/**
 * Recursively resolves JSDoc for properties at all nesting levels.
 * Prefers expression-based access (e.g. `result.object!.members[0].`)
 * because the TS language service only preserves JSDoc through real
 * expression chains. Falls back to type-expression approach when no
 * expression path is available.
 */
async function resolvePropertyDocsRecursive(
    monaco: MonacoForInference,
    code: string,
    depth: number = 0,
    isCurrent?: () => boolean,
    exprPath?: string,
    typeExpr?: string
): Promise<DocTree> {
    const tree: DocTree = new Map();
    if (depth > MAX_DOC_DEPTH) return tree;
    if (isCurrent && !isCurrent()) return tree;
    if (!exprPath && !typeExpr) return tree;

    // Build the helper code: either expression-based or type-based
    let helperCode: string;
    let dotOffset: number;
    if (exprPath) {
        // Expression-based: append `exprPath.` to user code
        const suffix = `\n${exprPath}.`;
        helperCode = code + suffix;
        dotOffset = helperCode.length;
    } else {
        // Type-based fallback: `declare const helper: TypeExpr; helper.`
        const helperVar = `__dh${++helperCounter}`;
        const suffix = `\ndeclare const ${helperVar}: ${typeExpr};\n${helperVar}.`;
        helperCode = code + suffix;
        dotOffset = helperCode.length;
    }

    const uri = monaco.Uri.parse(`file:///playground-docs-${++helperCounter}.ts`);
    const helperModel = monaco.editor.createModel(helperCode, 'typescript', uri);

    try {
        const worker = await monaco.languages.typescript.getTypeScriptWorker();
        const client = await worker(helperModel.uri);
        const uriStr = helperModel.uri.toString();

        const completions = await client.getCompletionsAtPosition(uriStr, dotOffset, {});
        if (!completions?.entries) return tree;

        for (const entry of completions.entries) {
            if (isCurrent && !isCurrent()) return tree;
            await idle();

            const node: DocNode = {};

            // Get JSDoc for this property
            const details = await client.getCompletionEntryDetails(uriStr, dotOffset, entry.name);
            if (details?.documentation && details.documentation.length > 0) {
                const docText = details.documentation.map(d => d.text).join('').trim();
                if (docText) node.doc = docText;
            }

            // Check if property is an object type by inspecting its quick info
            const propCheckVar = `__pc${++helperCounter}`;
            const propCheckSuffix = exprPath
                ? `\nconst ${propCheckVar} = ${exprPath}.${entry.name};`
                : `\ndeclare const ${propCheckVar}: (${typeExpr})["${entry.name}"];`;
            const propCheckCode = code + propCheckSuffix;
            const propCheckUri = monaco.Uri.parse(`file:///playground-pc-${++helperCounter}.ts`);
            const propCheckModel = monaco.editor.createModel(propCheckCode, 'typescript', propCheckUri);

            try {
                const pcClient = await (await monaco.languages.typescript.getTypeScriptWorker())(propCheckModel.uri);
                const pcOffset = propCheckCode.indexOf(propCheckVar);
                const propInfo = await pcClient.getQuickInfoAtPosition(propCheckModel.uri.toString(), pcOffset);
                if (propInfo?.displayParts) {
                    const propTypeStr = propInfo.displayParts.map(p => p.text).join('');
                    node._debugTypeStr = propTypeStr;
                    // Detect object-like types: contains `{` but is not a function type
                    const hasObjectShape = propTypeStr.includes('{') && !propTypeStr.includes('=>');
                    if (hasObjectShape) {
                        // Detect array: type string contains `[]`
                        const isArrayOfObj = propTypeStr.includes('[]');
                        const childExprPath = exprPath
                            ? (isArrayOfObj ? `${exprPath}.${entry.name}[0]` : `${exprPath}.${entry.name}`)
                            : undefined;
                        const childTypeExpr = !exprPath
                            ? (isArrayOfObj ? `(${typeExpr})["${entry.name}"][number]` : `(${typeExpr})["${entry.name}"]`)
                            : undefined;
                        const children = await resolvePropertyDocsRecursive(monaco, code, depth + 1, isCurrent, childExprPath, childTypeExpr);
                        if (children.size > 0) node.children = children;
                    }
                } else {
                    // DEBUG: quick info returned nothing
                    if (!node.doc) {
                        node.doc = `[debug:no-quickinfo] propCheckVar=${propCheckVar}`;
                    }
                }
            } finally {
                propCheckModel.dispose();
            }

            if (node.doc || node.children) {
                tree.set(entry.name, node);
            }
        }

        return tree;
    } catch {
        return tree;
    } finally {
        helperModel.dispose();
    }
}

/**
 * Inserts JSDoc comments into a resolved type string, recursively for nested objects.
 */
function enrichTypeWithDocs(typeStr: string, docs: DocTree, indent: string): string {
    if (docs.size === 0) return typeStr;

    const trimmed = typeStr.trim();

    // Handle union types: split into variants, enrich each separately
    const variants = splitUnionVariants(trimmed);
    if (variants) {
        return variants.map(v => enrichTypeWithDocs(v, docs, indent)).join(' | ');
    }

    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return typeStr;

    const inner = trimmed.slice(1, -1);
    const props = splitTopLevelProps(inner);
    if (props.length === 0) return typeStr;

    const innerIndent = indent + '    ';

    const lines = props.map(prop => {
        const nameMatch = prop.match(/^(?:readonly\s+)?(\w+)\??:/);
        if (!nameMatch) return `${innerIndent}${prop};`;

        const name = nameMatch[1];
        const node = docs.get(name);

        let enrichedProp = prop;
        // Recursively enrich nested object types
        if (node?.children) {
            const nestedObj = findNestedObject(prop);
            if (nestedObj) {
                // Check if the nested object is followed by [] (array-of-object)
                const afterObj = prop.slice(nestedObj.end).trim();
                const enrichedNested = enrichTypeWithDocs(nestedObj.content, node.children, innerIndent);
                if (afterObj.startsWith('[]')) {
                    enrichedProp = prop.slice(0, nestedObj.start) + enrichedNested + '[]' + prop.slice(nestedObj.end + afterObj.indexOf('[]') + 2);
                } else {
                    enrichedProp = prop.slice(0, nestedObj.start) + enrichedNested + prop.slice(nestedObj.end);
                }
            }
        }

        if (node?.doc) {
            return `${innerIndent}/** ${node.doc} */\n${innerIndent}${enrichedProp};`;
        }
        return `${innerIndent}${enrichedProp};`;
    });

    return `{\n${lines.join('\n')}\n${indent}}`;
}

/**
 * Find the top-level `{ ... }` object literal in a property value.
 */
function findNestedObject(prop: string): { start: number; end: number; content: string } | null {
    const colonIdx = prop.indexOf(':');
    if (colonIdx === -1) return null;

    const braceStart = prop.indexOf('{', colonIdx + 1);
    if (braceStart === -1) return null;

    let depth = 0;
    for (let i = braceStart; i < prop.length; i++) {
        if (prop[i] === '{') depth++;
        else if (prop[i] === '}') {
            depth--;
            if (depth === 0) {
                return {
                    start: braceStart,
                    end: i + 1,
                    content: prop.slice(braceStart, i + 1)
                };
            }
        }
    }
    return null;
}

/**
 * Split top-level properties by `;`, respecting nested braces/brackets.
 */
function splitTopLevelProps(inner: string): string[] {
    const props: string[] = [];
    let depth = 0;
    let current = '';
    for (let i = 0; i < inner.length; i++) {
        const ch = inner[i];
        if (ch === '{' || ch === '[' || ch === '(') depth++;
        else if (ch === '}' || ch === ']' || ch === ')') depth--;

        if (ch === ';' && depth === 0) {
            const p = current.trim();
            if (p) props.push(p);
            current = '';
        } else {
            current += ch;
        }
    }
    const last = current.trim();
    if (last) props.push(last);
    return props;
}

/**
 * Detect if a resolved type string is a union of objects at the top level.
 */
function hasTopLevelUnion(typeStr: string): boolean {
    const trimmed = typeStr.trim();
    let depth = 0;
    for (let i = 0; i < trimmed.length; i++) {
        if (trimmed[i] === '{' || trimmed[i] === '(' || trimmed[i] === '[') depth++;
        else if (trimmed[i] === '}' || trimmed[i] === ')' || trimmed[i] === ']') depth--;
        else if (trimmed[i] === '|' && depth === 0) return true;
    }
    return false;
}

/**
 * Split a union type string into its variant blocks.
 * Returns null if not a multi-variant union.
 */
function splitUnionVariants(typeStr: string): string[] | null {
    const trimmed = typeStr.trim();
    if (!trimmed.includes('|')) return null;

    const variants: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < trimmed.length; i++) {
        if (trimmed[i] === '{' || trimmed[i] === '(' || trimmed[i] === '[') depth++;
        else if (trimmed[i] === '}' || trimmed[i] === ')' || trimmed[i] === ']') depth--;
        else if (trimmed[i] === '|' && depth === 0) {
            const variant = trimmed.slice(start, i).trim();
            if (variant) variants.push(variant);
            start = i + 1;
        }
    }
    const last = trimmed.slice(start).trim();
    if (last) variants.push(last);
    return variants.length > 1 ? variants : null;
}

/**
 * Extract component schema names from a union chain like `union(A).or(B).or(C)`.
 */
function extractUnionComponents(code: string, schemaVarName: string): string[] {
    const re = new RegExp(`(?:const|let)\\s+${schemaVarName}\\s*=\\s*(.+?)(?:;|$)`, 'm');
    const match = code.match(re);
    if (!match) return [];

    const rhs = match[1];
    const components: string[] = [];

    const unionMatch = rhs.match(/union\((\w+)\)/);
    if (unionMatch) {
        components.push(unionMatch[1]);
        for (const orMatch of rhs.matchAll(/\.or\((\w+)\)/g)) {
            components.push(orMatch[1]);
        }
    }
    return components;
}

/**
 * Cleans the raw type string from getQuickInfoAtPosition.
 * Input:  "type __PlaygroundInferred = { name: string; email: string; }"
 * Output: "{ name: string; email: string; }"
 */
/**
 * Debug helper: dump the doc tree to console.
 */
function dumpDocTree(tree: DocTree, indent: string = ''): void {
    for (const [key, node] of tree) {
        const parts: string[] = [];
        if (node.doc) parts.push(`doc="${node.doc}"`);
        if (node._debugTypeStr) parts.push(`type="${node._debugTypeStr}"`);
        if (node.children) parts.push(`children=${node.children.size}`);
        console.log(`${indent}  ${key}: ${parts.join(', ')}`);
        if (node.children) dumpDocTree(node.children, indent + '  ');
    }
}

function cleanResolvedType(raw: string, marker: string): string {
    const prefix = `type ${marker} = `;
    const idx = raw.indexOf(prefix);
    if (idx === -1) return '';

    let result = raw.slice(idx + prefix.length).trim();

    // Remove import(...) module paths if any remain
    result = result.replace(/import\([^)]+\)\./g, '');

    if (!result || result === 'any' || result === marker) return '';

    return result;
}
