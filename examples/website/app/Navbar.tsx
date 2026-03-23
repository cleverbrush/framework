'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
    { href: '/', label: 'Home' },
    { href: '/schema', label: 'Schema' },
    { href: '/mapper', label: 'Mapper' },
    { href: '/react-form', label: 'React Form' },
    { href: '/sandbox', label: 'Sandbox' }
];

export function Navbar() {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

    // Close menu on navigation
    useEffect(() => {
        setMenuOpen(false);
        window.scrollTo(0, 0);
    }, [pathname]);

    const isActive = (href: string) => {
        return href === pathname;
    };

    return (
        <nav className="navbar">
            <Link href="/" className="navbar-brand">
                Cleverbrush Libs
            </Link>
            <button
                className={`navbar-toggle${menuOpen ? ' open' : ''}`}
                onClick={toggleMenu}
                aria-label="Toggle navigation"
            >
                <span />
                <span />
                <span />
            </button>
            <div className={`navbar-links${menuOpen ? ' show' : ''}`}>
                {NAV_ITEMS.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={isActive(item.href) ? 'active' : ''}
                    >
                        {item.label}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
