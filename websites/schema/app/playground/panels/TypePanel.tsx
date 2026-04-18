'use client';

import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';
import type { TypeInfo } from '../useTypeInference';

interface Props {
    typeInfo: TypeInfo;
}

export function TypePanel({ typeInfo }: Props) {
    if (!typeInfo.available) {
        return (
            <div className="pg-panel pg-type-panel">
                <div className="pg-panel-header">
                    <span className="pg-label">Inferred Type</span>
                    {typeInfo.inferring && <span className="pg-spinner" />}
                </div>
                <div className="pg-type-placeholder">
                    <p>Define a schema to see its inferred TypeScript type.</p>
                    <p className="pg-type-hint">
                        <code>InferType&lt;typeof schema&gt;</code>{' '}
                        automatically derives the TypeScript type from your
                        schema definition.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="pg-panel pg-type-panel">
            <div className="pg-panel-header">
                <span className="pg-label">Inferred Type</span>
                {typeInfo.inferring ? (
                    <span className="pg-spinner" />
                ) : (
                    <span className="pg-badge">InferType&lt;T&gt;</span>
                )}
            </div>
            <pre className="pg-type-code">
                <code
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(typeInfo.typeString)
                    }}
                />
            </pre>
            <div className="pg-type-note">
                Types update automatically as you modify the schema. Required
                fields lose <code>| undefined</code>, branded types get phantom
                tags.
            </div>
        </div>
    );
}
