'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { SECTION_GROUPS, WEB_SECTIONS } from './sections/index';

interface Props {
    currentSlug: string;
    collapsed: boolean;
    onToggle: () => void;
}

export function WebDocNav({ currentSlug, collapsed, onToggle }: Props) {
    const activeRef = useRef<HTMLAnchorElement>(null);

    // biome-ignore lint/correctness/useExhaustiveDependencies: currentSlug triggers scroll
    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({ block: 'nearest' });
        }
    }, [currentSlug]);

    return (
        <aside className={`pg-nav ${collapsed ? 'pg-nav-collapsed' : ''}`}>
            <div className="pg-nav-header">
                <h2 className="pg-nav-title">
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                    >
                        <rect
                            x="2"
                            y="2"
                            width="12"
                            height="12"
                            rx="2"
                            fill="url(#doc-grad-web)"
                        />
                        <path
                            d="M5 6h6M5 9h4"
                            stroke="white"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                        />
                        <defs>
                            <linearGradient
                                id="doc-grad-web"
                                x1="2"
                                y1="2"
                                x2="14"
                                y2="14"
                            >
                                <stop stopColor="#818cf8" />
                                <stop offset="1" stopColor="#22d3ee" />
                            </linearGradient>
                        </defs>
                    </svg>
                    Docs
                </h2>
                <button
                    type="button"
                    className="pg-nav-toggle"
                    onClick={onToggle}
                    aria-label="Toggle sidebar"
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                    >
                        <path
                            d={collapsed ? 'M6 3l5 5-5 5' : 'M10 3L5 8l5 5'}
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </div>

            {!collapsed && (
                <div>
                    {SECTION_GROUPS.map(group => (
                        <div key={group.label} className="pg-nav-group">
                            <h3 className="pg-nav-group-label">
                                {group.label}
                            </h3>
                            {group.slugs.map(slug => {
                                const section = WEB_SECTIONS.find(
                                    s => s.slug === slug
                                );
                                if (!section) return null;
                                const isCurrent = currentSlug === slug;
                                return (
                                    <Link
                                        key={slug}
                                        href={`/web/${slug}`}
                                        className={`pg-nav-item ${isCurrent ? 'pg-nav-active' : ''}`}
                                        ref={isCurrent ? activeRef : undefined}
                                    >
                                        <span className="pg-nav-icon">
                                            {isCurrent ? (
                                                <svg
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 16 16"
                                                    fill="none"
                                                    aria-hidden="true"
                                                >
                                                    <circle
                                                        cx="8"
                                                        cy="8"
                                                        r="5"
                                                        fill="#818cf8"
                                                        opacity="0.3"
                                                    />
                                                    <circle
                                                        cx="8"
                                                        cy="8"
                                                        r="3"
                                                        fill="#818cf8"
                                                    />
                                                </svg>
                                            ) : (
                                                <svg
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 16 16"
                                                    fill="none"
                                                    aria-hidden="true"
                                                >
                                                    <circle
                                                        cx="8"
                                                        cy="8"
                                                        r="5"
                                                        stroke="#475569"
                                                        strokeWidth="1.5"
                                                    />
                                                </svg>
                                            )}
                                        </span>
                                        <span className="pg-nav-item-title">
                                            {section.title}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
        </aside>
    );
}
