'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { PlaygroundEditor } from './PlaygroundEditor';
import { ChallengeNav } from './ChallengeNav';
import { ChallengePane } from './ChallengePane';
import { ValidationPanel } from './panels/ValidationPanel';
import { TypePanel } from './panels/TypePanel';
import { IntrospectionPanel } from './panels/IntrospectionPanel';
import { useSchemaExecution } from './useSchemaExecution';
import { useTypeInference } from './useTypeInference';
import { challenges, getChallengeById } from './challenges';

const STORAGE_KEY = 'pg-completed';
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

type PanelTab = 'validation' | 'type' | 'introspection';
const SHARED_CODE_PREVIEW_LENGTH = 300;

function loadCompleted(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
        return new Set();
    }
}

function saveCompleted(ids: Set<string>) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
        // ignore
    }
}

function encodeShare(code: string, challengeId: string | null): string {
    try {
        const data = JSON.stringify({ c: code, id: challengeId });
        return btoa(encodeURIComponent(data));
    } catch {
        return '';
    }
}

function decodeShare(hash: string): { code?: string; challengeId?: string | null } {
    try {
        const data = JSON.parse(decodeURIComponent(atob(hash)));
        return { code: data.c, challengeId: data.id ?? null };
    } catch {
        return {};
    }
}

export default function PlaygroundPage() {
    // State
    const [currentChallengeId, setCurrentChallengeId] = useState<string | null>('hello-schema');
    const [code, setCode] = useState(challenges[0].startingCode);
    const [testData, setTestData] = useState(challenges[0].testData);
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
    const [activePanel, setActivePanel] = useState<PanelTab>('validation');
    const [navCollapsed, setNavCollapsed] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [shareToast, setShareToast] = useState(false);
    const [pendingShared, setPendingShared] = useState<{ code: string; challengeId: string | null } | null>(null);

    const { result, execute, isRunning } = useSchemaExecution();
    const { typeInfo, setEditor, extractType } = useTypeInference();
    const initDone = useRef(false);

    // Load state from localStorage and URL hash on mount
    useEffect(() => {
        if (initDone.current) return;
        initDone.current = true;

        const completed = loadCompleted();
        setCompletedIds(completed);

        // Check URL hash for shared state — require user confirmation before running
        const hash = window.location.hash.slice(1);
        if (hash) {
            const { code: sharedCode, challengeId } = decodeShare(hash);
            if (sharedCode) {
                setPendingShared({ code: sharedCode, challengeId: challengeId ?? null });
                return;
            }
        }

        // Show welcome on first visit
        if (completed.size === 0 && !localStorage.getItem('pg-visited')) {
            setShowWelcome(true);
            localStorage.setItem('pg-visited', '1');
        }
    }, []);

    const handleAcceptShared = useCallback(() => {
        if (!pendingShared) return;
        const { code: sharedCode, challengeId } = pendingShared;
        setCode(sharedCode);
        setCurrentChallengeId(challengeId);
        if (challengeId) {
            const ch = getChallengeById(challengeId);
            if (ch) {
                setTestData(ch.testData);
                setActivePanel(ch.activePanel);
            }
        }
        setPendingShared(null);
    }, [pendingShared]);

    const handleDeclineShared = useCallback(() => {
        setPendingShared(null);
        window.location.hash = '';
    }, []);

    // Run code on change
    useEffect(() => {
        execute(code, testData);
        extractType(code);
    }, [code, testData, execute, extractType]);

    // Select a challenge
    const handleSelectChallenge = useCallback((id: string | null) => {
        if (id === null) {
            setCurrentChallengeId(null);
            setCode(FREE_PLAY_DEFAULT);
            setTestData('{ "name": "Alice", "email": "alice@example.com", "age": 30 }');
            setActivePanel('validation');
            return;
        }
        const ch = getChallengeById(id);
        if (ch) {
            setCurrentChallengeId(id);
            setCode(ch.startingCode);
            setTestData(ch.testData);
            setActivePanel(ch.activePanel);
        }
    }, []);

    // Check challenge
    const handleCheck = useCallback(() => {
        const ch = currentChallengeId ? getChallengeById(currentChallengeId) : null;
        if (!ch) return { passed: false, feedback: 'No challenge selected.' };
        const checkResult = ch.validate(result);
        if (checkResult.passed) {
            setCompletedIds(prev => {
                const next = new Set(prev);
                next.add(currentChallengeId!);
                saveCompleted(next);
                return next;
            });
        }
        return checkResult;
    }, [currentChallengeId, result]);

    // Show solution
    const handleShowSolution = useCallback(() => {
        const ch = currentChallengeId ? getChallengeById(currentChallengeId) : null;
        if (ch) setCode(ch.solution);
    }, [currentChallengeId]);

    // Next challenge
    const handleNext = useCallback(() => {
        if (!currentChallengeId) return;
        const idx = challenges.findIndex(c => c.id === currentChallengeId);
        if (idx < challenges.length - 1) {
            handleSelectChallenge(challenges[idx + 1].id);
        }
    }, [currentChallengeId, handleSelectChallenge]);

    // Share
    const handleShare = useCallback(() => {
        const hash = encodeShare(code, currentChallengeId);
        const url = `${window.location.origin}${window.location.pathname}#${hash}`;
        navigator.clipboard.writeText(url).then(() => {
            setShareToast(true);
            setTimeout(() => setShareToast(false), 2000);
        });
    }, [code, currentChallengeId]);

    // Editor mount
    const handleEditorMount = useCallback((editor: unknown, monaco: unknown) => {
        setEditor(editor, monaco);
    }, [setEditor]);

    // Test data change
    const handleTestDataChange = useCallback((data: string) => {
        setTestData(data);
    }, []);

    const currentChallenge = currentChallengeId ? getChallengeById(currentChallengeId) : null;
    const challengeIdx = currentChallengeId ? challenges.findIndex(c => c.id === currentChallengeId) : -1;
    const hasNext = challengeIdx >= 0 && challengeIdx < challenges.length - 1;

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                if (currentChallenge) handleCheck();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [currentChallenge, handleCheck, handleNext]);

    return (
        <div className="pg-layout">
            {/* Welcome Modal */}
            {showWelcome && (
                <div className="pg-welcome-overlay" onClick={() => setShowWelcome(false)}>
                    <div className="pg-welcome" onClick={e => e.stopPropagation()}>
                        <h2>Welcome to the Schema Playground</h2>
                        <p>
                            An interactive environment to learn <code>@cleverbrush/schema</code> with live code execution,
                            real-time validation, type inference, and schema introspection.
                        </p>
                        <div className="pg-welcome-buttons">
                            <button className="pg-btn pg-btn-check" onClick={() => {
                                setShowWelcome(false);
                                handleSelectChallenge('hello-schema');
                            }}>
                                🚀 Start Guided Tour
                            </button>
                            <button className="pg-btn pg-btn-solution" onClick={() => {
                                setShowWelcome(false);
                                handleSelectChallenge(null);
                            }}>
                                ⚡ Free Play
                            </button>
                        </div>
                        <p className="pg-welcome-shortcuts">
                            <kbd>Ctrl+Enter</kbd> Check &nbsp; <kbd>Ctrl+→</kbd> Next Challenge
                        </p>
                    </div>
                </div>
            )}

            {/* Shared-code confirmation banner */}
            {pendingShared && (
                <div className="pg-welcome-overlay">
                    <div className="pg-welcome" onClick={e => e.stopPropagation()}>
                        <h2>Run shared code?</h2>
                        <p>
                            This link contains code that will be executed in the playground.
                            Only run code from sources you trust.
                        </p>
                        <pre className="pg-shared-preview">{pendingShared.code.slice(0, SHARED_CODE_PREVIEW_LENGTH)}{pendingShared.code.length > SHARED_CODE_PREVIEW_LENGTH ? '\n…' : ''}</pre>
                        <div className="pg-welcome-buttons">
                            <button className="pg-btn pg-btn-check" onClick={handleAcceptShared}>
                                ▶ Run Code
                            </button>
                            <button className="pg-btn pg-btn-solution" onClick={handleDeclineShared}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <ChallengeNav
                currentId={currentChallengeId}
                completedIds={completedIds}
                onSelect={handleSelectChallenge}
                collapsed={navCollapsed}
                onToggle={() => setNavCollapsed(v => !v)}
            />

            {/* Main Area */}
            <div className="pg-main">
                {/* Challenge header (if in challenge mode) */}
                {currentChallenge && (
                    <ChallengePane
                        challenge={currentChallenge}
                        onCheck={handleCheck}
                        onShowSolution={handleShowSolution}
                        onNext={handleNext}
                        isCompleted={completedIds.has(currentChallengeId!)}
                        hasNext={hasNext}
                    />
                )}

                {/* Free play header */}
                {!currentChallenge && (
                    <div className="pg-freeplay-header">
                        <h2>Free Play</h2>
                        <p>Experiment freely — full API available with IntelliSense.</p>
                        <button className="pg-btn pg-btn-hint" onClick={handleShare}>
                            📋 Share
                        </button>
                        {shareToast && <span className="pg-toast">URL copied!</span>}
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
                            {currentChallenge && (
                                <button className="pg-btn-small" onClick={handleShare}>
                                    Share
                                </button>
                            )}
                        </div>
                        <PlaygroundEditor
                            code={code}
                            onChange={setCode}
                            onMount={handleEditorMount}
                        />
                    </div>

                    <div className="pg-panels-pane">
                        {/* Panel Tabs */}
                        <div className="pg-panel-tabs">
                            <button
                                className={`pg-panel-tab ${activePanel === 'validation' ? 'pg-panel-tab-active' : ''}`}
                                onClick={() => setActivePanel('validation')}
                            >
                                Validation
                            </button>
                            <button
                                className={`pg-panel-tab ${activePanel === 'type' ? 'pg-panel-tab-active' : ''}`}
                                onClick={() => setActivePanel('type')}
                            >
                                Type
                            </button>
                            <button
                                className={`pg-panel-tab ${activePanel === 'introspection' ? 'pg-panel-tab-active' : ''}`}
                                onClick={() => setActivePanel('introspection')}
                            >
                                Introspection
                            </button>
                        </div>

                        {/* Active Panel */}
                        <div className="pg-panel-content">
                            {activePanel === 'validation' && (
                                <ValidationPanel
                                    result={result}
                                    testData={testData}
                                    onTestDataChange={handleTestDataChange}
                                />
                            )}
                            {activePanel === 'type' && (
                                <TypePanel typeInfo={typeInfo} />
                            )}
                            {activePanel === 'introspection' && (
                                <IntrospectionPanel introspection={result.introspection} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
