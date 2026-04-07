'use client';

import { type ReactNode, useState } from 'react';

function CopyIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

interface InstallRowProps {
    command: string;
    label?: string;
}

function InstallRow({ command, label }: InstallRowProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(command).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="install-row">
            {label && <span className="install-row-label"># {label}</span>}
            <div className="install-row-body">
                <span className="install-row-prompt">$</span>
                <span className="install-row-cmd">{command}</span>
                <button
                    type="button"
                    className={`install-copy-btn${copied ? ' copied' : ''}`}
                    onClick={handleCopy}
                    aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
                    title={copied ? 'Copied!' : 'Copy to clipboard'}
                >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    <span className="install-copy-btn-text">
                        {copied ? 'Copied!' : 'Copy'}
                    </span>
                </button>
            </div>
        </div>
    );
}

interface InstallBannerProps {
    /** Single install command */
    command?: string;
    /** Multiple install commands displayed as a group */
    commands?: { command: string; label?: string }[];
    /** Small note below the command(s) */
    note?: ReactNode;
}

export function InstallBanner({ command, commands, note }: InstallBannerProps) {
    const rows = commands ?? (command ? [{ command }] : []);
    return (
        <div className="install-banner">
            {rows.map(row => (
                <InstallRow
                    key={row.command}
                    command={row.command}
                    label={row.label}
                />
            ))}
            {note && <p className="install-banner-note">{note}</p>}
        </div>
    );
}
