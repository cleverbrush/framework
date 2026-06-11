'use client';

import { useState } from 'react';
import { SchemaDocNav } from '../SchemaDocNav';

interface Props {
    currentSlug: string;
    children: React.ReactNode;
}

export function SchemaDocLayout({ currentSlug, children }: Props) {
    const [navCollapsed, setNavCollapsed] = useState(false);

    return (
        <div className="doc-layout">
            <SchemaDocNav
                currentSlug={currentSlug}
                collapsed={navCollapsed}
                onToggle={() => setNavCollapsed(c => !c)}
            />
            <div className="doc-main">
                <div className="container">{children}</div>
            </div>
        </div>
    );
}
