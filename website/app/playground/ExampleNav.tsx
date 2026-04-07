'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { EXAMPLE_GROUPS, type Example, examples } from './examples';

interface Props {
    currentId: string | null;
    collapsed: boolean;
    onToggle: () => void;
}

export function ExampleNav({ currentId, collapsed, onToggle }: Props) {
    const activeRef = useRef<HTMLAnchorElement>(null);

    // biome-ignore lint/correctness/useExhaustiveDependencies: currentId is used as trigger to scroll active item into view
    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({ block: 'nearest' });
        }
    }, [currentId]);

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
                        <path
                            d="M8 1l2 3h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-3z"
                            fill="url(#star-grad)"
                        />
                        <defs>
                            <linearGradient
                                id="star-grad"
                                x1="2"
                                y1="1"
                                x2="14"
                                y2="15"
                            >
                                <stop stopColor="#818cf8" />
                                <stop offset="1" stopColor="#22d3ee" />
                            </linearGradient>
                        </defs>
                    </svg>
                    Examples
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
                <>
                    {/* Free Play */}
                    <Link
                        href="/playground"
                        className={`pg-nav-item pg-nav-freeplay ${currentId === null ? 'pg-nav-active' : ''}`}
                    >
                        <span className="pg-nav-icon">⚡</span>
                        Free Play
                    </Link>

                    {/* Grouped Examples */}
                    {EXAMPLE_GROUPS.map(group => (
                        <div key={group.label} className="pg-nav-group">
                            <h3 className="pg-nav-group-label">
                                {group.label}
                            </h3>
                            {group.ids.map(id => {
                                const example = examples.find(
                                    (e: Example) => e.id === id
                                );
                                if (!example) return null;
                                const isCurrent = currentId === id;
                                return (
                                    <Link
                                        key={id}
                                        href={`/playground/${id}`}
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
                                            {example.title}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </>
            )}
        </aside>
    );
}
