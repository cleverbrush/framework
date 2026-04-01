'use client';

import { useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
    ssr: false,
    loading: () => <div className="pg-editor-loading">Loading editor...</div>
});

// Hand-written ambient type declarations for Monaco's TypeScript service.
// Covers the playground API surface without needing the full .d.ts chain.
const SCHEMA_DECLARATIONS = `
declare module '@cleverbrush/schema' {
    export interface ValidationError {
        path: string;
        message: string;
    }

    export interface ValidationResult<T> {
        valid: boolean;
        object?: T;
        errors?: ValidationError[];
    }

    interface BaseSchemaBuilder<T> {
        required(message?: string): this;
        optional(): this;
        addJSDoc(description: string): this;
        addValidator(fn: (value: T) => { valid: boolean; errors?: { message: string }[] } | Promise<{ valid: boolean; errors?: { message: string }[] }>): this;
        addPreprocessor(fn: (value: unknown) => unknown): this;
        validate(value: unknown, context?: unknown): ValidationResult<T>;
        validateAsync(value: unknown, context?: unknown): Promise<ValidationResult<T>>;
        parse(value: unknown, context?: unknown): T;
        safeParse(value: unknown, context?: unknown): ValidationResult<T>;
        introspect(): Record<string, unknown>;
        brand<B extends string>(brand?: B): this;
    }

    export interface StringSchemaBuilder<T extends string = string> extends BaseSchemaBuilder<T> {
        minLength(length: number, message?: string): StringSchemaBuilder<T>;
        maxLength(length: number, message?: string): StringSchemaBuilder<T>;
        matches(regex: RegExp, message?: string): StringSchemaBuilder<T>;
        startsWith(prefix: string, message?: string): StringSchemaBuilder<T>;
        endsWith(suffix: string, message?: string): StringSchemaBuilder<T>;
        equals<V extends string>(value: V, message?: string): StringSchemaBuilder<V>;
        email(message?: string): StringSchemaBuilder<T>;
        url(message?: string): StringSchemaBuilder<T>;
        uuid(message?: string): StringSchemaBuilder<T>;
        ip(message?: string): StringSchemaBuilder<T>;
        trim(): StringSchemaBuilder<T>;
        toLowerCase(): StringSchemaBuilder<T>;
        nonempty(message?: string): StringSchemaBuilder<T>;
        brand<B extends string>(brand?: B): StringSchemaBuilder<T>;
    }

    export interface NumberSchemaBuilder<T extends number = number> extends BaseSchemaBuilder<T> {
        min(value: number, message?: string): NumberSchemaBuilder<T>;
        max(value: number, message?: string): NumberSchemaBuilder<T>;
        isInteger(message?: string): NumberSchemaBuilder<T>;
        isFloat(message?: string): NumberSchemaBuilder<T>;
        equals<V extends number>(value: V, message?: string): NumberSchemaBuilder<V>;
        positive(message?: string): NumberSchemaBuilder<T>;
        negative(message?: string): NumberSchemaBuilder<T>;
        finite(message?: string): NumberSchemaBuilder<T>;
        multipleOf(value: number, message?: string): NumberSchemaBuilder<T>;
        brand<B extends string>(brand?: B): NumberSchemaBuilder<T>;
    }

    export interface BooleanSchemaBuilder extends BaseSchemaBuilder<boolean> {}
    export interface DateSchemaBuilder extends BaseSchemaBuilder<Date> {
        min(date: Date, message?: string): DateSchemaBuilder;
        max(date: Date, message?: string): DateSchemaBuilder;
    }
    export interface FunctionSchemaBuilder extends BaseSchemaBuilder<(...args: any[]) => any> {}
    export interface AnySchemaBuilder extends BaseSchemaBuilder<any> {}

    export interface ObjectSchemaBuilder<P extends Record<string, BaseSchemaBuilder<any>>> extends BaseSchemaBuilder<{ [K in keyof P]: P[K] extends BaseSchemaBuilder<infer T> ? T : never }> {
        minLength(n: number, message?: string): this;
        maxLength(n: number, message?: string): this;
    }

    export interface ArraySchemaBuilder<E extends BaseSchemaBuilder<any>> extends BaseSchemaBuilder<Array<E extends BaseSchemaBuilder<infer T> ? T : never>> {
        minLength(n: number, message?: string): this;
        maxLength(n: number, message?: string): this;
        nonempty(message?: string): this;
        unique(keyFn?: (item: unknown) => unknown, message?: string): this;
    }

    export interface UnionSchemaBuilder<T extends BaseSchemaBuilder<any>> extends BaseSchemaBuilder<T extends BaseSchemaBuilder<infer U> ? U : never> {
        or<U extends BaseSchemaBuilder<any>>(schema: U): UnionSchemaBuilder<T | U>;
    }

    export function string(): StringSchemaBuilder;
    export function string<T extends string>(equals: T): StringSchemaBuilder<T>;
    export function number(): NumberSchemaBuilder;
    export function number<T extends number>(equals: T): NumberSchemaBuilder<T>;
    export function boolean(): BooleanSchemaBuilder;
    export function date(): DateSchemaBuilder;
    export function func(): FunctionSchemaBuilder;
    export function any(): AnySchemaBuilder;
    export function object<P extends Record<string, BaseSchemaBuilder<any>>>(properties?: P): ObjectSchemaBuilder<P>;
    export function array<E extends BaseSchemaBuilder<any>>(elementSchema?: E): ArraySchemaBuilder<E>;
    export function union<T extends BaseSchemaBuilder<any>>(schema: T): UnionSchemaBuilder<T>;

    export type InferType<T extends BaseSchemaBuilder<any>> = T extends BaseSchemaBuilder<infer U> ? U : never;

    export type ExtensionMethod<TBuilder extends BaseSchemaBuilder<any> = BaseSchemaBuilder<any>> =
        (this: TBuilder, ...args: any[]) => TBuilder;

    export interface ExtensionConfig {
        [builderName: string]: {
            [methodName: string]: ExtensionMethod<any>;
        };
    }

    export interface ExtensionDescriptor {}
    export function defineExtension(config: ExtensionConfig): ExtensionDescriptor;
    export function withExtensions(...descriptors: ExtensionDescriptor[]): {
        string: typeof string;
        number: typeof number;
        boolean: typeof boolean;
        date: typeof date;
        func: typeof func;
        any: typeof any;
        object: typeof object;
        array: typeof array;
        union: typeof union;
    };
}
`;

interface Props {
    code: string;
    onChange: (code: string) => void;
    onMount?: (editor: unknown, monaco: unknown) => void;
}

export function PlaygroundEditor({ code, onChange, onMount }: Props) {
    const editorRef = useRef<unknown>(null);
    const monacoRef = useRef<unknown>(null);
    const initDone = useRef(false);

    const handleMount = useCallback(
        (editor: unknown, monaco: unknown) => {
            editorRef.current = editor;
            monacoRef.current = monaco;

            if (!initDone.current) {
                initDone.current = true;
                configureMonaco(monaco as MonacoInstance);
            }

            onMount?.(editor, monaco);
        },
        [onMount]
    );

    const handleChange = useCallback(
        (value: string | undefined) => {
            if (value !== undefined) onChange(value);
        },
        [onChange]
    );

    return (
        <div className="pg-editor-container">
            <MonacoEditor
                height="100%"
                language="typescript"
                theme="playground-dark"
                value={code}
                onChange={handleChange}
                onMount={handleMount}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    wordWrap: 'on',
                    padding: { top: 16, bottom: 16 },
                    renderLineHighlight: 'gutter',
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    bracketPairColorization: { enabled: true },
                    suggest: {
                        showKeywords: true,
                        showSnippets: true
                    }
                }}
            />
        </div>
    );
}

type MonacoInstance = {
    editor: {
        defineTheme(name: string, theme: unknown): void;
    };
    languages: {
        typescript: {
            typescriptDefaults: {
                setCompilerOptions(options: Record<string, unknown>): void;
                addExtraLib(content: string, filePath?: string): void;
                setDiagnosticsOptions(options: Record<string, unknown>): void;
            };
        };
    };
};

function configureMonaco(monaco: MonacoInstance) {
    // Define custom dark theme matching the website
    monaco.editor.defineTheme('playground-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
            { token: 'keyword', foreground: 'c084fc' },
            { token: 'string', foreground: '86efac' },
            { token: 'number', foreground: 'fbbf24' },
            { token: 'type', foreground: 'f472b6' },
            { token: 'function', foreground: '22d3ee' },
            { token: 'variable', foreground: 'f1f5f9' }
        ],
        colors: {
            'editor.background': '#06080f',
            'editor.foreground': '#f1f5f9',
            'editor.lineHighlightBackground': '#0c1018',
            'editor.selectionBackground': '#818cf833',
            'editorCursor.foreground': '#818cf8',
            'editorLineNumber.foreground': '#334155',
            'editorLineNumber.activeForeground': '#818cf8',
            'editor.inactiveSelectionBackground': '#818cf81a',
            'editorWidget.background': '#0c1018',
            'editorWidget.border': '#1e293b',
            'editorSuggestWidget.background': '#0c1018',
            'editorSuggestWidget.border': '#1e293b',
            'editorSuggestWidget.selectedBackground': '#818cf833'
        }
    });

    // TypeScript compiler options
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: 99, // ESNext
        module: 99,
        moduleResolution: 2,
        strict: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        noEmit: true
    });

    // Add schema type declarations
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
        SCHEMA_DECLARATIONS,
        'file:///node_modules/@cleverbrush/schema/index.d.ts'
    );

    // Relax diagnostics — playground code doesn't need perfect types
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        diagnosticCodesToIgnore: [
            2307, // Cannot find module
            1259, // Module can only be default-imported
            1192, // Module has no default export
        ]
    });
}
