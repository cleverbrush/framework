'use client';

import dynamic from 'next/dynamic';
import { useCallback, useRef } from 'react';
import { schemaDeclarations } from './schemaDeclarations';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
    ssr: false,
    loading: () => <div className="pg-editor-loading">Loading editor...</div>
});

interface Props {
    code: string;
    onChange: (code: string) => void;
    onMount?: (editor: unknown, monaco: unknown) => void;
}

export function PlaygroundEditor({ code, onChange, onMount }: Props) {
    const editorRef = useRef<unknown>(null);
    const monacoRef = useRef<unknown>(null);
    const initDone = useRef(false);

    const handleBeforeMount = useCallback((monaco: unknown) => {
        defineTheme(monaco as MonacoInstance);
    }, []);

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
