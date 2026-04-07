/**
 * Simple regex-based TypeScript/JavaScript syntax highlighter.
 * Returns an HTML string with <span class="..."> wrappers.
 */

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

interface Token {
    start: number;
    end: number;
    cls: string;
    text: string;
}

const KEYWORDS = new Set([
    'import',
    'from',
    'const',
    'let',
    'var',
    'function',
    'return',
    'if',
    'else',
    'async',
    'await',
    'new',
    'type',
    'export',
    'interface',
    'extends',
    'class',
    'typeof',
    'true',
    'false',
    'null',
    'undefined',
    'void',
    'throw',
    'try',
    'catch'
]);

const TYPE_NAMES = new Set([
    'string',
    'number',
    'boolean',
    'void',
    'any',
    'never',
    'unknown',
    'object',
    'Array',
    'Promise',
    'Record',
    'Partial',
    'Required',
    'Readonly',
    'Pick',
    'Omit'
]);

export function highlightTS(code: string): string {
    const tokens: Token[] = [];

    // Phase 1: Extract comments (highest priority)
    const commentRe = /\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
    let m: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: allow assignment in while condition for regex exec loop
    while ((m = commentRe.exec(code)) !== null) {
        tokens.push({
            start: m.index,
            end: m.index + m[0].length,
            cls: 'cm',
            text: m[0]
        });
    }

    // Phase 2: Extract strings (single, double, backtick)
    const stringRe = /`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;
    // biome-ignore lint/suspicious/noAssignInExpressions: allow assignment in while condition for regex exec loop
    while ((m = stringRe.exec(code)) !== null) {
        if (!isInsideToken(tokens, m.index)) {
            tokens.push({
                start: m.index,
                end: m.index + m[0].length,
                cls: 'str',
                text: m[0]
            });
        }
    }

    // Phase 3: Numbers
    const numberRe = /\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g;
    // biome-ignore lint/suspicious/noAssignInExpressions: allow assignment in while condition for regex exec loop
    while ((m = numberRe.exec(code)) !== null) {
        if (!isInsideToken(tokens, m.index)) {
            tokens.push({
                start: m.index,
                end: m.index + m[0].length,
                cls: 'num',
                text: m[0]
            });
        }
    }

    // Phase 4: Type annotations (after : or in generics < >)
    // Match `: TypeName` patterns (type annotations)
    // Uses capture groups instead of lookbehinds for browser compatibility
    const typeAnnotationRe = /(:\s*)([A-Z][A-Za-z0-9]*(?:<[^>]*>)?)/g;
    // biome-ignore lint/suspicious/noAssignInExpressions: allow assignment in while condition for regex exec loop
    while ((m = typeAnnotationRe.exec(code)) !== null) {
        const typeStart = m.index + m[1].length;
        if (!isInsideToken(tokens, typeStart)) {
            tokens.push({
                start: typeStart,
                end: typeStart + m[2].length,
                cls: 'tp',
                text: m[2]
            });
        }
    }

    // Match type keyword usages like `type X = ...`
    const typeDefRe = /\btype\s+([A-Z][A-Za-z0-9]*)/g;
    // biome-ignore lint/suspicious/noAssignInExpressions: allow assignment in while condition for regex exec loop
    while ((m = typeDefRe.exec(code)) !== null) {
        const nameStart = m.index + m[0].length - m[1].length;
        if (!isInsideToken(tokens, nameStart)) {
            tokens.push({
                start: nameStart,
                end: nameStart + m[1].length,
                cls: 'tp',
                text: m[1]
            });
        }
    }

    // Match `<TypeName>` in generics like InferType<typeof X>
    const genericRe = /<([A-Z][A-Za-z0-9]*)/g;
    // biome-ignore lint/suspicious/noAssignInExpressions: allow assignment in while condition for regex exec loop
    while ((m = genericRe.exec(code)) !== null) {
        const typeStart = m.index + 1;
        if (!isInsideToken(tokens, typeStart)) {
            tokens.push({
                start: typeStart,
                end: typeStart + m[1].length,
                cls: 'tp',
                text: m[1]
            });
        }
    }

    // Match lowercase type names when used as annotations (`: string`, `: number`, etc.)
    const lowerTypeRe =
        /(:\s*)\b(string|number|boolean|void|any|never|unknown)\b(?!\s*[.(])/g;
    // biome-ignore lint/suspicious/noAssignInExpressions: allow assignment in while condition for regex exec loop
    while ((m = lowerTypeRe.exec(code)) !== null) {
        const typeStart = m.index + m[1].length;
        if (!isInsideToken(tokens, typeStart)) {
            tokens.push({
                start: typeStart,
                end: typeStart + m[2].length,
                cls: 'tp',
                text: m[2]
            });
        }
    }

    // Phase 5: Function calls — word followed by (
    const funcCallRe = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g;
    // biome-ignore lint/suspicious/noAssignInExpressions: allow assignment in while condition for regex exec loop
    while ((m = funcCallRe.exec(code)) !== null) {
        if (
            !isInsideToken(tokens, m.index) &&
            !KEYWORDS.has(m[1]) &&
            !TYPE_NAMES.has(m[1])
        ) {
            tokens.push({
                start: m.index,
                end: m.index + m[1].length,
                cls: 'fn',
                text: m[1]
            });
        }
    }

    // Phase 6: Keywords
    const kwRe = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
    // biome-ignore lint/suspicious/noAssignInExpressions: allow assignment in while condition for regex exec loop
    while ((m = kwRe.exec(code)) !== null) {
        if (!isInsideToken(tokens, m.index) && KEYWORDS.has(m[1])) {
            tokens.push({
                start: m.index,
                end: m.index + m[1].length,
                cls: 'kw',
                text: m[1]
            });
        }
    }

    // Sort tokens by start position
    tokens.sort((a, b) => a.start - b.start);

    // Build output
    let result = '';
    let pos = 0;
    for (const token of tokens) {
        if (token.start < pos) continue; // skip overlapping
        if (token.start > pos) {
            result += escapeHtml(code.slice(pos, token.start));
        }
        result += `<span class="${token.cls}">${escapeHtml(token.text)}</span>`;
        pos = token.end;
    }
    if (pos < code.length) {
        result += escapeHtml(code.slice(pos));
    }

    return result;
}

function isInsideToken(tokens: Token[], index: number): boolean {
    return tokens.some(t => index >= t.start && index < t.end);
}
