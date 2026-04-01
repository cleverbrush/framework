'use client';

import { useCallback, useRef, useState } from 'react';
import * as schema from '@cleverbrush/schema';

export interface ExecutionResult {
    validationResult?: {
        valid: boolean;
        object?: unknown;
        errors?: { path: string; message: string }[];
    };
    introspection?: Record<string, unknown>;
    error?: string;
}

/**
 * Executes user code against the @cleverbrush/schema library.
 * Returns validation results, introspection data, and any runtime errors.
 */
export function useSchemaExecution() {
    const [result, setResult] = useState<ExecutionResult>({});
    const [isRunning, setIsRunning] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    const execute = useCallback((code: string, testDataJson?: string) => {
        // Debounce rapid changes
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            setIsRunning(true);
            try {
                const execResult = runCode(code, testDataJson);
                setResult(execResult);
            } catch {
                setResult({ error: 'Unexpected execution error' });
            } finally {
                setIsRunning(false);
            }
        }, 300);
    }, []);

    return { result, execute, isRunning };
}

function runCode(code: string, testDataJson?: string): ExecutionResult {
    try {
        // Strip import statements and collect what's imported
        const strippedCode = code.replace(
            /import\s+\{([^}]+)\}\s+from\s+['"]@cleverbrush\/schema['"];?/g,
            ''
        );

        // Build the function body — inject schema module as `__schema`
        // and destructure all exports into scope
        const allExports = Object.keys(schema);
        const destructure = `const { ${allExports.join(', ')} } = __schema;`;

        // Wrap in a function that captures the last assigned variable
        const wrappedCode = `
${destructure}
let __lastSchema = undefined;
let __lastResult = undefined;
${strippedCode.replace(
    /const\s+(\w+)\s*=\s*((?:string|number|boolean|date|func|any|object|array|union|defineExtension|withExtensions)\s*\()/g,
    (match, varName, rest) => {
        return `const ${varName} = ${rest}`;
    }
)}

// Find schemas and results by scanning local vars
try {
    ${getSchemaDetectionCode(strippedCode)}
} catch(__e) {}

return { __lastSchema, __lastResult };
`;

        // Execute via Function constructor with schema module injected
        // eslint-disable-next-line no-new-func
        const fn = new Function('__schema', wrappedCode);
        const { __lastSchema: lastSchema, __lastResult: lastResult } = fn(schema);

        const output: ExecutionResult = {};

        // If we found a schema, introspect it
        if (lastSchema && typeof lastSchema.introspect === 'function') {
            try {
                const introspection = lastSchema.introspect();
                output.introspection = sanitizeIntrospection(introspection);
            } catch {
                // introspection optional
            }
        }

        // If we found a result object with .valid, use it
        if (lastResult && typeof lastResult === 'object' && 'valid' in lastResult) {
            output.validationResult = {
                valid: lastResult.valid,
                object: lastResult.object,
                errors: lastResult.errors?.map((e: { path?: string; message?: string }) => ({
                    path: e.path ?? '$',
                    message: e.message ?? 'Validation failed'
                }))
            };
        } else if (lastSchema && typeof lastSchema.validate === 'function' && testDataJson) {
            // Auto-validate with test data
            try {
                const testData = JSON.parse(testDataJson);
                const validationResult = lastSchema.validate(testData);
                output.validationResult = {
                    valid: validationResult.valid,
                    object: validationResult.object,
                    errors: validationResult.errors?.map((e: { path?: string; message?: string }) => ({
                        path: e.path ?? '$',
                        message: e.message ?? 'Validation failed'
                    }))
                };
            } catch {
                // Invalid test data JSON
            }
        }

        return output;
    } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
    }
}

/**
 * Detect schema and result variable names from the code and build
 * assignment expressions that capture them.
 */
function getSchemaDetectionCode(code: string): string {
    const lines: string[] = [];

    // Find const declarations that look like schema assignments
    const constRegex = /(?:const|let)\s+(\w+)\s*=\s*/g;
    let match: RegExpExecArray | null;
    const varNames: string[] = [];
    while ((match = constRegex.exec(code)) !== null) {
        varNames.push(match[1]);
    }

    // Assign last schema-like variable and last result-like variable
    for (const name of varNames) {
        lines.push(
            `if (typeof ${name} !== 'undefined' && ${name} !== null) {`,
            `  if (typeof ${name}.validate === 'function' || typeof ${name}.introspect === 'function') __lastSchema = ${name};`,
            `  if (typeof ${name} === 'object' && 'valid' in ${name}) __lastResult = ${name};`,
            `}`
        );
    }

    return lines.join('\n');
}

/**
 * Clean up the introspection result for display — make validators/preprocessors
 * representable as JSON.
 */
function sanitizeIntrospection(obj: unknown): Record<string, unknown> {
    if (obj === null || obj === undefined) return {};
    if (typeof obj !== 'object') return {};

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (typeof value === 'function') {
            result[key] = '[Function]';
        } else if (Array.isArray(value)) {
            result[key] = value.map((item) => {
                if (typeof item === 'function') return '[Function]';
                if (typeof item === 'object' && item !== null) {
                    // For validators/preprocessors, show a summary
                    const summary: Record<string, unknown> = {};
                    for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
                        summary[k] = typeof v === 'function' ? '[Function]' : v;
                    }
                    return summary;
                }
                return item;
            });
        } else if (typeof value === 'object' && value !== null) {
            result[key] = sanitizeIntrospection(value);
        } else {
            result[key] = value;
        }
    }
    return result;
}
