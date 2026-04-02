'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ExampleNav } from './ExampleNav';
import { getExampleById } from './examples';
import { PlaygroundEditor } from './PlaygroundEditor';
import { TypePanel } from './panels/TypePanel';
import { ValidationPanel } from './panels/ValidationPanel';
import { useSchemaExecution } from './useSchemaExecution';
import { useTypeInference } from './useTypeInference';

const FREE_PLAY_DEFAULT = `import { object, string, number } from '@cleverbrush/schema';

// Welcome to the @cleverbrush/schema playground!
// Write your schema code here and see live results →

const UserSchema = object({
    name: string().required().minLength(2),
    email: string().required().email(),
    age: number().min(0).max(120)
});

const result = UserSchema.validate({
    name: "Alice",
    email: "alice@example.com",
    age: 30
});
`;

const FREE_PLAY_TEST_DATA =
    '{ "name": "Alice", "email": "alice@example.com", "age": 30 }';

function encodeShare(code: string): string {
    try {
        return btoa(encodeURIComponent(code));
    } catch {
        return '';
    }
}

function decodeShare(hash: string): string | null {
    try {
        return decodeURIComponent(atob(hash));
    } catch {
        return null;
    }
}

export default function PlaygroundClient({
    exampleId
}: {
    exampleId: string | null;
}) {
    const router = useRouter();

    const example = exampleId ? getExampleById(exampleId) : null;

    // State
    const [code, setCode] = useState(() => example?.code ?? FREE_PLAY_DEFAULT);
    const [testData, setTestData] = useState(
        () => example?.testData ?? FREE_PLAY_TEST_DATA
    );
    const [navCollapsed, setNavCollapsed] = useState(false);
    const [shareToast, setShareToast] = useState(false);
    const [pendingShared, setPendingShared] = useState<string | null>(null);

    const {
        result,
        execute,
        isRunning,
        setEditor: setExecutionEditor
    } = useSchemaExecution();
    const {
        typeInfo,
        setEditor: setTypeEditor,
        extractType
    } = useTypeInference();
    const initDone = useRef(false);
    const prevExampleId = useRef<string | null | undefined>(undefined);

    // Handle example changes (via URL)
    useEffect(() => {
        // Skip the first render — handled by init
        if (prevExampleId.current === undefined) {
            prevExampleId.current = exampleId;
            return;
        }
        if (prevExampleId.current === exampleId) return;
        prevExampleId.current = exampleId;

        if (example) {
            setCode(example.code);
            setTestData(example.testData);
        } else {
            setCode(FREE_PLAY_DEFAULT);
            setTestData(FREE_PLAY_TEST_DATA);
        }
    }, [exampleId, example]);

    // Init on mount: check URL hash for shared code, or load example/free play
    useEffect(() => {
        if (initDone.current) return;
        initDone.current = true;

        const hash = window.location.hash.slice(1);
        if (hash) {
            const sharedCode = decodeShare(hash);
            if (sharedCode) {
                setPendingShared(sharedCode);
                return;
            }
        }

        if (example) {
            setCode(example.code);
            setTestData(example.testData);
        } else {
            setCode(FREE_PLAY_DEFAULT);
            setTestData(FREE_PLAY_TEST_DATA);
        }
    }, [example]);

    const handleAcceptShared = useCallback(() => {
        if (!pendingShared) return;
        setCode(pendingShared);
        setPendingShared(null);
        window.history.replaceState(null, '', window.location.pathname);
    }, [pendingShared]);

    const handleDeclineShared = useCallback(() => {
        setPendingShared(null);
        window.history.replaceState(null, '', window.location.pathname);
    }, []);

    // Run code on change
    useEffect(() => {
        if (!code) return;
        execute(code, testData);
        extractType(code);
    }, [code, testData, execute, extractType]);

    // Share
    const handleShare = useCallback(() => {
        const hash = encodeShare(code);
        const url = `${window.location.origin}${window.location.pathname}#${hash}`;
        navigator.clipboard.writeText(url).then(() => {
            setShareToast(true);
            setTimeout(() => setShareToast(false), 2000);
        });
    }, [code]);

    // Editor mount
    const handleEditorMount = useCallback(
        (editor: unknown, monaco: unknown) => {
            setExecutionEditor(editor, monaco);
            setTypeEditor(editor, monaco);
            extractType(code);
        },
        [setExecutionEditor, setTypeEditor, extractType, code]
    );

    // Redirect unknown slugs to /playground
    useEffect(() => {
        if (exampleId && !example) {
            router.replace('/playground');
        }
    }, [exampleId, example, router]);

    return (
        <div className="pg-layout">
            {/* Shared-code confirmation banner */}
            {pendingShared && (
                <div className="pg-welcome-overlay">
                    <div
                        className="pg-welcome"
                        role="dialog"
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => e.stopPropagation()}
                    >
                        <h2>Run shared code?</h2>
                        <p>
                            This link contains code that will be executed in the
                            playground. Only run code from sources you trust.
                        </p>
                        <pre className="pg-shared-preview">
                            {pendingShared.slice(0, 300)}
                            {pendingShared.length > 300 ? '\n…' : ''}
                        </pre>
                        <div className="pg-welcome-buttons">
                            <button
                                type="button"
                                className="pg-btn pg-btn-check"
                                onClick={handleAcceptShared}
                            >
                                ▶ Run Code
                            </button>
                            <button
                                type="button"
                                className="pg-btn pg-btn-solution"
                                onClick={handleDeclineShared}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <ExampleNav
                currentId={exampleId}
                collapsed={navCollapsed}
                onToggle={() => setNavCollapsed(v => !v)}
            />

            {/* Main Area */}
            <div className="pg-main">
                {/* Example header */}
                {example ? (
                    <div className="pg-example-header">
                        <h2>{example.title}</h2>
                        <p
                            dangerouslySetInnerHTML={{
                                __html: example.description
                            }}
                        />
                        <button
                            type="button"
                            className="pg-btn pg-btn-hint"
                            onClick={handleShare}
                        >
                            📋 Share
                        </button>
                        {shareToast && (
                            <span className="pg-toast">URL copied!</span>
                        )}
                    </div>
                ) : (
                    <div className="pg-freeplay-header">
                        <h2>Free Play</h2>
                        <p>
                            Experiment freely — full API available with
                            IntelliSense.
                        </p>
                        <button
                            type="button"
                            className="pg-btn pg-btn-hint"
                            onClick={handleShare}
                        >
                            📋 Share
                        </button>
                        {shareToast && (
                            <span className="pg-toast">URL copied!</span>
                        )}
                    </div>
                )}

                {/* Editor + Panels */}
                <div className="pg-workspace">
                    <div className="pg-editor-pane">
                        <div className="pg-editor-toolbar">
                            <span className="pg-editor-label">
                                {isRunning && <span className="pg-spinner" />}
                                editor.ts
                            </span>
                            <button
                                type="button"
                                className="pg-btn-small"
                                onClick={handleShare}
                            >
                                Share
                            </button>
                        </div>
                        <PlaygroundEditor
                            code={code}
                            onChange={setCode}
                            onMount={handleEditorMount}
                        />
                    </div>

                    <div className="pg-panels-pane">
                        <div className="pg-panel-content">
                            <ValidationPanel result={result} />
                            <TypePanel typeInfo={typeInfo} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
