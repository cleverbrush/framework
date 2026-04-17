'use client';

import { useState } from 'react';
import { ClientDocNav } from '../ClientDocNav';

interface Props {
    currentSlug: string;
    children: React.ReactNode;
}

export function ClientDocLayout({ currentSlug, children }: Props) {
    const [navCollapsed, setNavCollapsed] = useState(false);

    return (
        <div className="doc-layout">
            <ClientDocNav
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
