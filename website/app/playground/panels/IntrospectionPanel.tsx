'use client';

import { useState, useCallback } from 'react';

interface Props {
    introspection?: Record<string, unknown>;
}

export function IntrospectionPanel({ introspection }: Props) {
    if (!introspection || Object.keys(introspection).length === 0) {
        return (
            <div className="pg-panel pg-introspection-panel">
                <div className="pg-panel-header">
                    <span className="pg-label">PropertyDescriptors</span>
                </div>
                <div className="pg-type-placeholder">
                    <p>Define a schema to see its internal descriptor tree.</p>
                    <p className="pg-type-hint">
                        <code>.introspect()</code> reveals every validator, preprocessor, extension, and constraint — making schemas transparent and machine-readable.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="pg-panel pg-introspection-panel">
            <div className="pg-panel-header">
                <span className="pg-label">PropertyDescriptors</span>
                <span className="pg-badge">.introspect()</span>
            </div>
            <div className="pg-introspection-callout">
                This is what makes @cleverbrush/schema unique — schemas are transparent and introspectable.
            </div>
            <div className="pg-tree">
                <JsonTree data={introspection} />
            </div>
        </div>
    );
}

function JsonTree({ data, depth = 0 }: { data: unknown; depth?: number }) {
    if (data === null) return <span className="pg-tree-null">null</span>;
    if (data === undefined) return <span className="pg-tree-null">undefined</span>;
    if (typeof data === 'string') {
        if (data === '[Function]') return <span className="pg-tree-fn">{data}</span>;
        return <span className="pg-tree-string">&quot;{data}&quot;</span>;
    }
    if (typeof data === 'number') return <span className="pg-tree-number">{data}</span>;
    if (typeof data === 'boolean') return <span className="pg-tree-boolean">{String(data)}</span>;

    if (Array.isArray(data)) {
        if (data.length === 0) return <span className="pg-tree-bracket">[]</span>;
        return <ArrayNode items={data} depth={depth} />;
    }

    if (typeof data === 'object') {
        const entries = Object.entries(data as Record<string, unknown>);
        if (entries.length === 0) return <span className="pg-tree-bracket">{'{}'}</span>;
        return <ObjectNode entries={entries} depth={depth} />;
    }

    return <span>{String(data)}</span>;
}

function ObjectNode({ entries, depth }: { entries: [string, unknown][]; depth: number }) {
    const [collapsed, setCollapsed] = useState(depth > 2);
    const toggle = useCallback(() => setCollapsed(v => !v), []);

    const keyClass = getKeyClass(entries);

    return (
        <span>
            <button className="pg-tree-toggle" onClick={toggle}>
                {collapsed ? '▶' : '▼'}
            </button>
            <span className="pg-tree-bracket">{'{'}</span>
            {collapsed ? (
                <span className="pg-tree-collapsed" onClick={toggle}> {entries.length} keys... </span>
            ) : (
                <div className={`pg-tree-indent ${keyClass}`}>
                    {entries.map(([key, val]) => (
                        <div key={key} className="pg-tree-entry">
                            <span className="pg-tree-key">{key}</span>
                            <span className="pg-tree-colon">: </span>
                            <JsonTree data={val} depth={depth + 1} />
                        </div>
                    ))}
                </div>
            )}
            <span className="pg-tree-bracket">{'}'}</span>
        </span>
    );
}

function ArrayNode({ items, depth }: { items: unknown[]; depth: number }) {
    const [collapsed, setCollapsed] = useState(depth > 2);
    const toggle = useCallback(() => setCollapsed(v => !v), []);

    return (
        <span>
            <button className="pg-tree-toggle" onClick={toggle}>
                {collapsed ? '▶' : '▼'}
            </button>
            <span className="pg-tree-bracket">[</span>
            {collapsed ? (
                <span className="pg-tree-collapsed" onClick={toggle}> {items.length} items... </span>
            ) : (
                <div className="pg-tree-indent">
                    {items.map((item, i) => (
                        <div key={i} className="pg-tree-entry">
                            <span className="pg-tree-index">{i}</span>
                            <span className="pg-tree-colon">: </span>
                            <JsonTree data={item} depth={depth + 1} />
                        </div>
                    ))}
                </div>
            )}
            <span className="pg-tree-bracket">]</span>
        </span>
    );
}

/** Color-code object nodes based on their content */
function getKeyClass(entries: [string, unknown][]): string {
    const keys = entries.map(([k]) => k);
    if (keys.includes('type') && keys.includes('validators')) return 'pg-tree-schema';
    if (keys.includes('validate')) return 'pg-tree-validator';
    if (keys.some(k => k === 'extensions')) return 'pg-tree-extensions';
    return '';
}
