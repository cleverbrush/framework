'use client';

import { useCallback, useRef, useState } from 'react';
import { type ExecutionResult, useSandboxExecutor } from './useSandboxExecutor';

export type { ExecutionResult };

type MonacoRef = {
    languages: {
        typescript: {
            getTypeScriptWorker(): Promise<
                (uri: unknown) => Promise<{
                    getEmitOutput(uri: string): Promise<{
                        outputFiles: { text: string }[];
                        emitSkipped: boolean;
                    }>;
                }>
            >;
        };
    };
};

type EditorRef = {
    getModel(): { uri: { toString(): string } } | null;
};

/**
 * Transpiles TypeScript code to JavaScript using Monaco's TS worker,
 * then executes it inside a sandboxed iframe (opaque origin — no access
 * to the parent page's cookies, localStorage, or same-origin APIs).
 */
export function useSchemaExecution() {
    const [result, setResult] = useState<ExecutionResult>({});
    const [isRunning, setIsRunning] = useState(false);
    const { execute: sandboxExecute } = useSandboxExecutor();
    const editorRef = useRef<EditorRef | null>(null);
    const monacoRef = useRef<MonacoRef | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

    const setEditor = useCallback((editor: unknown, monaco: unknown) => {
        editorRef.current = editor as EditorRef;
        monacoRef.current = monaco as MonacoRef;
    }, []);

    const execute = useCallback(
        (code: string, testDataJson?: string) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);

            debounceRef.current = setTimeout(async () => {
                setIsRunning(true);
                try {
                    // Transpile TS → JS via Monaco's TypeScript worker
                    const jsCode = await transpile(
                        editorRef.current,
                        monacoRef.current
                    );
                    if (jsCode === null) {
                        // Fallback: send the raw code (imports will be stripped in sandbox)
                        const fallbackResult = await sandboxExecute(
                            code,
                            testDataJson
                        );
                        setResult(fallbackResult);
                        return;
                    }
                    const execResult = await sandboxExecute(
                        jsCode,
                        testDataJson
                    );
                    setResult(execResult);
                } catch {
                    setResult({ error: 'Unexpected execution error' });
                } finally {
                    setIsRunning(false);
                }
            }, 300);
        },
        [sandboxExecute]
    );

    return { result, execute, isRunning, setEditor };
}

async function transpile(
    editor: EditorRef | null,
    monaco: MonacoRef | null
): Promise<string | null> {
    if (!editor || !monaco) return null;

    const model = editor.getModel();
    if (!model) return null;

    const worker = await monaco.languages.typescript.getTypeScriptWorker();
    const client = await worker(model.uri);
    const output = await client.getEmitOutput(model.uri.toString());

    if (output.emitSkipped || output.outputFiles.length === 0) return null;

    return output.outputFiles[0].text;
}
