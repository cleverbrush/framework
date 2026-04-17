'use client';

import { useState } from 'react';
import { WebDocNav } from '../WebDocNav';

interface Props {
    currentSlug: string;
    children: React.ReactNode;
}

export function WebDocLayout({ currentSlug, children }: Props) {
    const [navCollapsed, setNavCollapsed] = useState(false);

    return (
        <div className="doc-layout">
            <WebDocNav
                currentSlug={currentSlug}
                collapsed={navCollapsed}
                onToggle={() => setNavCollapsed(c => !c)}
            />
            <main className="doc-main">
                <div className="container">{children}</div>
            </main>
        </div>
    );
}
