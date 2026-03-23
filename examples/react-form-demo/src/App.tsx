import { useState, useEffect, useCallback } from 'react';
import HomePage from './pages/HomePage';
import SchemaPage from './pages/SchemaPage';
import MapperPage from './pages/MapperPage';
import ReactFormPage from './pages/ReactFormPage';
import SandboxPage from './pages/SandboxPage';

/* ── Nav links ───────────────────────────────────────────────────── */

const NAV_ITEMS = [
    { href: '#/', label: 'Home' },
    { href: '#/schema', label: 'Schema' },
    { href: '#/mapper', label: 'Mapper' },
    { href: '#/react-form', label: 'React Form' },
    { href: '#/sandbox', label: 'Sandbox' }
];

/* ── Router ──────────────────────────────────────────────────────── */

function useRoute(): string {
    const [hash, setHash] = useState(window.location.hash);

    useEffect(() => {
        const onHash = () => setHash(window.location.hash);
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    if (!hash || hash === '#' || hash === '#/') return '/';
    return hash.replace(/^#/, '');
}

function Router() {
    const route = useRoute();
    switch (route) {
        case '/schema':
            return <SchemaPage />;
        case '/mapper':
            return <MapperPage />;
        case '/react-form':
            return <ReactFormPage />;
        case '/sandbox':
            return <SandboxPage />;
        default:
            return <HomePage />;
    }
}

/* ── Navbar ──────────────────────────────────────────────────────── */

function Navbar() {
    const route = useRoute();
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

    // Close menu on navigation
    useEffect(() => {
        setMenuOpen(false);
        window.scrollTo(0, 0);
    }, [route]);

    const isActive = (href: string) => {
        const path = href.replace(/^#/, '');
        return path === route;
    };

    return (
        <nav className="navbar">
            <a href="#/" className="navbar-brand">
                Cleverbrush Framework
            </a>
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
                    <a
                        key={item.href}
                        href={item.href}
                        className={isActive(item.href) ? 'active' : ''}
                    >
                        {item.label}
                    </a>
                ))}
            </div>
        </nav>
    );
}

/* ── Footer ──────────────────────────────────────────────────────── */

function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h4>Cleverbrush Framework</h4>
                    <p>
                        Open-source TypeScript libraries for schema validation,
                        object mapping, and headless React forms.
                    </p>
                </div>
                <div className="footer-section">
                    <h4>Links</h4>
                    <a
                        href="https://github.com/cleverbrush/framework"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        GitHub Repository
                    </a>
                    <a
                        href="https://docs.cleverbrush.com"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Documentation
                    </a>
                    <a
                        href="https://cleverbrush.com/editor"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Cleverbrush Editor
                    </a>
                </div>
                <div className="footer-section">
                    <h4>Packages</h4>
                    <a
                        href="https://www.npmjs.com/package/@cleverbrush/schema"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        @cleverbrush/schema
                    </a>
                    <a
                        href="https://www.npmjs.com/package/@cleverbrush/mapper"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        @cleverbrush/mapper
                    </a>
                    <a
                        href="https://www.npmjs.com/package/@cleverbrush/react-form"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        @cleverbrush/react-form
                    </a>
                </div>
            </div>
            <div className="footer-bottom">
                <p>
                    BSD-3-Clause License •{' '}
                    <a
                        href="https://cleverbrush.com"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        cleverbrush.com
                    </a>
                </p>
            </div>
        </footer>
    );
}

/* ── App ─────────────────────────────────────────────────────────── */

function App() {
    return (
        <>
            <Navbar />
            <Router />
            <Footer />
        </>
    );
}

export default App;
