'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { schemaDeclarations } from './schemaDeclarations';
import { zodDeclarations } from './zodDeclarations';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
    ssr: false,
    loading: () => <div className="pg-editor-loading">Loading editor...</div>
});

interface Props {
    code: string;
    onChange: (code: string) => void;
    onMount?: (editor: unknown, monaco: unknown) => void;
}

const monacoVsPath = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs';

let monacoPrepared = false;

export function PlaygroundEditor({ code, onChange, onMount }: Props) {
    const editorRef = useRef<unknown>(null);
    const monacoRef = useRef<unknown>(null);
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
        'loading'
    );
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        import('@monaco-editor/react')
            .then(({ loader }) => {
                loader.config({
                    paths: {
                        vs: monacoVsPath
                    }
                });
                return loader.init();
            })
            .then(monaco => {
                if (cancelled) return;
                prepareMonaco(monaco as MonacoInstance);
                setLoadState('ready');
            })
            .catch(error => {
                const message = describeMonacoError(error);
                console.error('Monaco initialization error:', message);
                if (cancelled) return;
                setLoadError(message);
                setLoadState('error');
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const handleBeforeMount = useCallback((monaco: unknown) => {
        prepareMonaco(monaco as MonacoInstance);
    }, []);

    const handleMount = useCallback(
        (editor: unknown, monaco: unknown) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
            prepareMonaco(monaco as MonacoInstance);

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

    if (loadState === 'error') {
        return (
            <div className="pg-editor-container">
                <div className="pg-editor-loading pg-editor-loading--error">
                    Editor failed to load: {loadError ?? 'unknown error'}
                </div>
            </div>
        );
    }

    if (loadState === 'loading') {
        return (
            <div className="pg-editor-container">
                <div className="pg-editor-loading">Loading editor...</div>
            </div>
        );
    }

    return (
        <div className="pg-editor-container">
            <MonacoEditor
                height="100%"
                language="typescript"
                theme="playground-dark"
                path="file:///playground.ts"
                value={code}
                onChange={handleChange}
                beforeMount={handleBeforeMount}
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

function prepareMonaco(monaco: MonacoInstance) {
    defineTheme(monaco);

    if (monacoPrepared) return;
    monacoPrepared = true;
    configureMonaco(monaco);
}

function defineTheme(monaco: MonacoInstance) {
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
}

function describeMonacoError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof Event !== 'undefined' && error instanceof Event) {
        const target = error.target as
            | (EventTarget & { src?: string; href?: string })
            | null;
        const url = target?.src ?? target?.href;
        return url
            ? `${error.type || 'load'} event for ${url}`
            : `${error.type || 'unknown'} event`;
    }

    if (typeof error === 'string') {
        return error;
    }

    try {
        const json = JSON.stringify(error);
        if (json) return json;
    } catch {
        // Fall through to String().
    }

    return String(error);
}

function configureMonaco(monaco: MonacoInstance) {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: 99, // ESNext
        module: 99, // ESNext
        moduleResolution: 100, // Bundler — resolves .js imports to .d.ts
        strict: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
    });

    // Register real .d.ts files from @cleverbrush/schema dist
    for (const [filePath, content] of Object.entries(schemaDeclarations)) {
        monaco.languages.typescript.typescriptDefaults.addExtraLib(
            content,
            filePath
        );
    }

    // Register Zod .d.ts files for extern() playground examples
    for (const [filePath, content] of Object.entries(zodDeclarations)) {
        monaco.languages.typescript.typescriptDefaults.addExtraLib(
            content,
            filePath
        );
    }

    // Relax diagnostics — playground code doesn't need perfect types
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        diagnosticCodesToIgnore: [
            2307, // Cannot find module
            1259, // Module can only be default-imported
            1192 // Module has no default export
        ]
    });
}
