'use client';

import { useCallback } from 'react';
import { challenges, CHALLENGE_GROUPS } from './challenges';

interface Props {
    currentId: string | null;
    completedIds: Set<string>;
    onSelect: (id: string | null) => void;
    collapsed: boolean;
    onToggle: () => void;
}

export function ChallengeNav({ currentId, completedIds, onSelect, collapsed, onToggle }: Props) {
    const handleFreePlay = useCallback(() => onSelect(null), [onSelect]);

    return (
        <aside className={`pg-nav ${collapsed ? 'pg-nav-collapsed' : ''}`}>
            <div className="pg-nav-header">
                <h2 className="pg-nav-title">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 1l2 3h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-3z" fill="url(#star-grad)" />
                        <defs>
                            <linearGradient id="star-grad" x1="2" y1="1" x2="14" y2="15">
                                <stop stopColor="#818cf8" />
                                <stop offset="1" stopColor="#22d3ee" />
                            </linearGradient>
                        </defs>
                    </svg>
                    Challenges
                </h2>
                <button className="pg-nav-toggle" onClick={onToggle} aria-label="Toggle sidebar">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d={collapsed ? 'M6 3l5 5-5 5' : 'M10 3L5 8l5 5'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            {!collapsed && (
                <>
                    {/* Free Play */}
                    <button
                        className={`pg-nav-item pg-nav-freeplay ${currentId === null ? 'pg-nav-active' : ''}`}
                        onClick={handleFreePlay}
                    >
                        <span className="pg-nav-icon">⚡</span>
                        Free Play
                    </button>

                    {/* Challenge Progress */}
                    <div className="pg-nav-progress">
                        <div className="pg-nav-progress-bar">
                            <div
                                className="pg-nav-progress-fill"
                                style={{ width: `${(completedIds.size / challenges.length) * 100}%` }}
                            />
                        </div>
                        <span className="pg-nav-progress-text">{completedIds.size}/{challenges.length}</span>
                    </div>

                    {/* Grouped Challenges */}
                    {CHALLENGE_GROUPS.map(group => (
                        <div key={group.label} className="pg-nav-group">
                            <h3 className="pg-nav-group-label">{group.label}</h3>
                            {group.ids.map(id => {
                                const challenge = challenges.find(c => c.id === id);
                                if (!challenge) return null;
                                const isCompleted = completedIds.has(id);
                                const isCurrent = currentId === id;
                                return (
                                    <button
                                        key={id}
                                        className={`pg-nav-item ${isCurrent ? 'pg-nav-active' : ''} ${isCompleted ? 'pg-nav-completed' : ''}`}
                                        onClick={() => onSelect(id)}
                                    >
                                        <span className="pg-nav-icon">
                                            {isCompleted ? (
                                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                                    <circle cx="8" cy="8" r="7" fill="#22c55e" opacity="0.15" />
                                                    <path d="M5 8l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            ) : isCurrent ? (
                                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                                    <circle cx="8" cy="8" r="5" fill="#818cf8" opacity="0.3" />
                                                    <circle cx="8" cy="8" r="3" fill="#818cf8" />
                                                </svg>
                                            ) : (
                                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                                    <circle cx="8" cy="8" r="5" stroke="#475569" strokeWidth="1.5" />
                                                </svg>
                                            )}
                                        </span>
                                        <span className="pg-nav-item-title">{challenge.title}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </>
            )}
        </aside>
    );
}
