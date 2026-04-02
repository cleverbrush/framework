'use client';

import type { ExecutionResult, ErrorTreeNode } from '../useSandboxExecutor';

interface Props {
    result: ExecutionResult;
}

function ErrorTreeView({ tree, depth = 0 }: { tree: Record<string, ErrorTreeNode>; depth?: number }) {
    return (
        <ul className="pg-error-tree" style={{ paddingLeft: depth > 0 ? 16 : 0 }}>
            {Object.entries(tree).map(([name, node]) => (
                <li key={name} className="pg-error-tree-node">
                    <div className="pg-error-tree-prop">
                        <span className="pg-error-tree-name">{name}</span>
                        {node.seenValue !== undefined && (
                            <span className="pg-error-tree-seen">
                                {typeof node.seenValue === 'string'
                                    ? `"${node.seenValue}"`
                                    : String(node.seenValue ?? 'undefined')}
                            </span>
                        )}
                    </div>
                    {node.errors.length > 0 && (
                        <ul className="pg-error-tree-messages">
                            {node.errors.map((msg, i) => (
                                <li key={i} className="pg-error-tree-msg">{msg}</li>
                            ))}
                        </ul>
                    )}
                    {node.children && <ErrorTreeView tree={node.children} depth={depth + 1} />}
                </li>
            ))}
        </ul>
    );
}

export function ValidationPanel({ result }: Props) {

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

            {!vr && !result.error && (
                <div className="pg-hint-box">
                    Assign a validation result to a variable to see output here, e.g.{' '}
                    <code>const result = schema.validate(data)</code>
                </div>
            )}

            {/* Validation Result */}
            {vr?.valid && vr.object !== undefined && (
                <div className="pg-result-section">
                    <span className="pg-label">Parsed Value</span>
                    <pre className="pg-result-json"><code>{JSON.stringify(vr.object, null, 2)}</code></pre>
                </div>
            )}

            {/* Errors */}
            {vr?.errorTree && Object.keys(vr.errorTree).length > 0 && (
                <div className="pg-result-section">
                    <span className="pg-label">Errors</span>
                    <ErrorTreeView tree={vr.errorTree} />
                </div>
            )}

            {/* Flat errors fallback (non-object schemas) */}
            {(!vr?.errorTree || Object.keys(vr.errorTree).length === 0) && vr?.errors && vr.errors.length > 0 && (
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
