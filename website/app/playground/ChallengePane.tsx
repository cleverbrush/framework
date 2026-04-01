'use client';

import { useState, useCallback } from 'react';
import type { Challenge } from './challenges';

interface Props {
    challenge: Challenge;
    onCheck: () => { passed: boolean; feedback: string };
    onShowSolution: () => void;
    onNext: () => void;
    isCompleted: boolean;
    hasNext: boolean;
}

export function ChallengePane({ challenge, onCheck, onShowSolution, onNext, isCompleted, hasNext }: Props) {
    const [hints, setHints] = useState(0);
    const [feedback, setFeedback] = useState<{ passed: boolean; feedback: string } | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);

    const handleCheck = useCallback(() => {
        const result = onCheck();
        setFeedback(result);
        if (result.passed) {
            setShowExplanation(true);
        }
    }, [onCheck]);

    const handleHint = useCallback(() => {
        setHints(h => Math.min(h + 1, challenge.hints.length));
    }, [challenge.hints.length]);

    const handleNext = useCallback(() => {
        setHints(0);
        setFeedback(null);
        setShowExplanation(false);
        onNext();
    }, [onNext]);

    // Reset state when challenge changes
    const [prevId, setPrevId] = useState(challenge.id);
    if (challenge.id !== prevId) {
        setPrevId(challenge.id);
        setHints(0);
        setFeedback(null);
        setShowExplanation(false);
    }

    return (
        <div className="pg-challenge">
            <div className="pg-challenge-header">
                <div className="pg-challenge-info">
                    <h2 className="pg-challenge-title">
                        {isCompleted && (
                            <svg className="pg-challenge-check" width="18" height="18" viewBox="0 0 16 16" fill="none">
                                <path d="M13.5 4.5L6 12L2.5 8.5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                        {challenge.title}
                    </h2>
                    <span className="pg-challenge-concept">{challenge.concept}</span>
                </div>
                <div className="pg-challenge-actions">
                    {challenge.hints.length > 0 && hints < challenge.hints.length && (
                        <button className="pg-btn pg-btn-hint" onClick={handleHint}>
                            💡 Hint {hints > 0 ? `(${hints}/${challenge.hints.length})` : ''}
                        </button>
                    )}
                    <button className="pg-btn pg-btn-solution" onClick={onShowSolution}>
                        Show Solution
                    </button>
                    <button className="pg-btn pg-btn-check" onClick={handleCheck}>
                        ▶ Check
                    </button>
                    {(isCompleted || feedback?.passed) && hasNext && (
                        <button className="pg-btn pg-btn-next" onClick={handleNext}>
                            Next →
                        </button>
                    )}
                </div>
            </div>

            <p className="pg-challenge-desc" dangerouslySetInnerHTML={{__html: challenge.description}} />

            {/* Progressive Hints */}
            {hints > 0 && (
                <div className="pg-hints">
                    {challenge.hints.slice(0, hints).map((hint, i) => (
                        <div key={i} className="pg-hint">
                            <span className="pg-hint-icon">💡</span>
                            <span>{hint}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Feedback */}
            {feedback && (
                <div className={`pg-feedback ${feedback.passed ? 'pg-feedback-success' : 'pg-feedback-fail'}`}>
                    <span className="pg-feedback-icon">{feedback.passed ? '🎉' : '💭'}</span>
                    <span>{feedback.feedback}</span>
                </div>
            )}

            {/* Post-completion Explanation */}
            {showExplanation && (
                <div className="pg-explanation">
                    <button
                        className="pg-explanation-toggle"
                        onClick={() => setShowExplanation(v => !v)}
                    >
                        📚 What you learned
                    </button>
                    <div className="pg-explanation-content" dangerouslySetInnerHTML={{ __html: challenge.explanation }} />
                </div>
            )}
        </div>
    );
}
