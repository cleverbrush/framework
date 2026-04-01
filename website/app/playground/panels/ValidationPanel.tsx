'use client';

import { useState, useCallback } from 'react';
import type { ExecutionResult } from '../useSchemaExecution';

interface Props {
    result: ExecutionResult;
    testData: string;
    onTestDataChange: (data: string) => void;
}

export function ValidationPanel({ result, testData, onTestDataChange }: Props) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(testData);

    const handleEdit = useCallback(() => {
        setDraft(testData);
        setEditing(true);
    }, [testData]);

    const handleApply = useCallback(() => {
        setEditing(false);
        onTestDataChange(draft);
    }, [draft, onTestDataChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleApply();
        }
        if (e.key === 'Escape') {
            setEditing(false);
        }
    }, [handleApply]);

    if (result.error) {
        return (
            <div className="pg-panel pg-validation-panel">
                <div className="pg-panel-header">
                    <span className="pg-status pg-status-error">Error</span>
                </div>
                <div className="pg-error-box">
                    <pre>{result.error}</pre>
                </div>
            </div>
        );
    }

    const vr = result.validationResult;

    return (
        <div className="pg-panel pg-validation-panel">
            <div className="pg-panel-header">
                {vr ? (
                    <span className={`pg-status ${vr.valid ? 'pg-status-valid' : 'pg-status-invalid'}`}>
                        {vr.valid ? (
                            <><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Valid</>
                        ) : (
                            <><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> Invalid</>
                        )}
                    </span>
                ) : (
                    <span className="pg-status pg-status-idle">Waiting for code...</span>
                )}
            </div>

            {/* Test Data Editor */}
            <div className="pg-test-data">
                <div className="pg-test-data-header">
                    <span className="pg-label">Test Data</span>
                    {!editing ? (
                        <button className="pg-btn-small" onClick={handleEdit}>Edit</button>
                    ) : (
                        <button className="pg-btn-small pg-btn-apply" onClick={handleApply}>Apply (Ctrl+Enter)</button>
                    )}
                </div>
                {editing ? (
                    <textarea
                        className="pg-test-data-editor"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={handleKeyDown}
                        spellCheck={false}
                        autoFocus
                    />
                ) : (
                    <pre className="pg-test-data-display"><code>{testData}</code></pre>
                )}
            </div>

            {/* Validation Result */}
            {vr?.valid && vr.object !== undefined && (
                <div className="pg-result-section">
                    <span className="pg-label">Parsed Value</span>
                    <pre className="pg-result-json"><code>{JSON.stringify(vr.object, null, 2)}</code></pre>
                </div>
            )}

            {/* Errors */}
            {vr?.errors && vr.errors.length > 0 && (
                <div className="pg-result-section">
                    <span className="pg-label">Errors ({vr.errors.length})</span>
                    <ul className="pg-error-list">
                        {vr.errors.map((err, i) => (
                            <li key={i} className="pg-error-item">
                                <span className="pg-error-path">{err.path}</span>
                                <span className="pg-error-message">{err.message}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
