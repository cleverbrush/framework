'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from './ThemeProvider';

export interface NavItem {
    href: string;
    label: string;
    highlight?: boolean;
    external?: boolean;
    children?: NavItem[];
}

export interface NavbarProps {
    navItems: NavItem[];
    brandLabel?: string;
    githubUrl?: string;
}

function ChevronDown() {
    return (
        <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ marginLeft: '3px', transition: 'transform 0.2s' }}
        >
            <path d="M2 3.5L5 6.5L8 3.5" />
        </svg>
    );
}

export function Navbar({
    navItems,
    brandLabel = 'Cleverbrush',
    githubUrl = 'https://github.com/cleverbrush/framework'
}: NavbarProps) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const { theme, toggle: toggleTheme } = useTheme();
    const navRef = useRef<HTMLElement>(null);

    const toggleMenu = useCallback(() => setMenuOpen(v => !v), []);

    // Close menu and dropdowns on navigation
    // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is used as trigger to reset menu state on route change
    useEffect(() => {
        setMenuOpen(false);
        setOpenDropdown(null);
        window.scrollTo(0, 0);
    }, [pathname]);

    // Track scroll for navbar shadow
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Close dropdown on click outside or Escape
    useEffect(() => {
        if (!openDropdown) return;
        const onClickOutside = (e: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpenDropdown(null);
        };
        document.addEventListener('mousedown', onClickOutside);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onClickOutside);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [openDropdown]);

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname === href || pathname.startsWith(href + '/');
    };

    const isDropdownActive = (item: NavItem) =>
        item.children?.some(child => isActive(child.href)) ?? false;

    const renderLink = (item: NavItem) =>
        item.external ? (
            <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={item.highlight ? 'navbar-playground' : ''}
            >
                {item.label}
            </a>
        ) : (
            <Link
                key={item.href}
                href={item.href}
                className={`${isActive(item.href) ? 'active' : ''}${item.highlight ? ' navbar-playground' : ''}`}
            >
                {item.label}
            </Link>
        );

    const renderDropdown = (item: NavItem) => {
        const isOpen = openDropdown === item.label;
        const hasActiveChild = isDropdownActive(item);
        return (
            <div
                key={item.label}
                className={`navbar-dropdown${isOpen ? ' open' : ''}`}
                onMouseEnter={() => setOpenDropdown(item.label)}
                onMouseLeave={() => setOpenDropdown(null)}
            >
                <button
                    type="button"
                    className={`navbar-dropdown-trigger${hasActiveChild ? ' active' : ''}`}
                    onClick={() =>
                        setOpenDropdown(v =>
                            v === item.label ? null : item.label
                        )
                    }
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                >
                    {item.label}
                    <ChevronDown />
                </button>
                <div className="navbar-dropdown-panel">
                    {item.children?.map(child => renderLink(child))}
                </div>
            </div>
        );
    };

    return (
        <nav
            ref={navRef}
            className="navbar"
            style={
                scrolled
                    ? {
                          boxShadow:
                              '0 4px 30px rgba(0,0,0,0.3), 0 1px 0 rgba(129,140,248,0.04)'
                      }
                    : undefined
            }
        >
            <Link href="/" className="navbar-brand">
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    style={{
                        marginRight: '0.5rem',
                        verticalAlign: 'middle',
                        display: 'inline-block',
                        marginTop: '-2px'
                    }}
                >
                    <path
                        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                        stroke="url(#brand-grad)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <defs>
                        <linearGradient
                            id="brand-grad"
                            x1="2"
                            y1="2"
                            x2="22"
                            y2="22"
                        >
                            <stop stopColor="#818cf8" />
                            <stop offset="1" stopColor="#22d3ee" />
                        </linearGradient>
                    </defs>
                </svg>
                {brandLabel}
            </Link>
            <button
                type="button"
                className={`navbar-toggle${menuOpen ? ' open' : ''}`}
                onClick={toggleMenu}
                aria-label="Toggle navigation"
            >
                <span />
                <span />
                <span />
            </button>
            <div className={`navbar-links${menuOpen ? ' show' : ''}`}>
                {navItems.map(item =>
                    item.children ? renderDropdown(item) : renderLink(item)
                )}
                <button
                    type="button"
                    className="navbar-icon-btn"
                    onClick={toggleTheme}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? (
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            role="img"
                        >
                            <title>Switch to light mode</title>
                            <circle cx="12" cy="12" r="5" />
                            <line x1="12" y1="1" x2="12" y2="3" />
                            <line x1="12" y1="21" x2="12" y2="23" />
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                            <line x1="1" y1="12" x2="3" y2="12" />
                            <line x1="21" y1="12" x2="23" y2="12" />
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                        </svg>
                    ) : (
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            role="img"
                        >
                            <title>Switch to dark mode</title>
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                    )}
                </button>
                <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="navbar-icon-btn"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        role="img"
                        aria-label="GitHub"
                        style={{ opacity: 0.7 }}
                    >
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                </a>
            </div>
        </nav>
    );
}
