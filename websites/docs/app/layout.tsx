import type { Metadata } from 'next';
import 'performative-ui/styles.css';
import '@cleverbrush/website-shared/styles/globals.css';
import { ConsentManager } from '@cleverbrush/website-shared/components/ConsentManager';
import type { FooterSection } from '@cleverbrush/website-shared/components/Footer';
import { Footer } from '@cleverbrush/website-shared/components/Footer';
import type { NavItem } from '@cleverbrush/website-shared/components/Navbar';
import { Navbar } from '@cleverbrush/website-shared/components/Navbar';
import { ThemeProvider } from '@cleverbrush/website-shared/components/ThemeProvider';
import {
    createBaseMetadata,
    JsonLd,
    organizationJsonLd,
    softwareSourceCodeJsonLd,
    websiteJsonLd
} from '@cleverbrush/website-shared/lib/seo';
import { DOCS_SITE } from './site';

const GTM_ID = 'GTM-WRLXDMG';

const NAV_ITEMS: NavItem[] = [
    { href: '/', label: 'Home' },
    { href: '/why', label: 'Why' },
    { href: '/getting-started', label: 'Get Started' },
    {
        href: '#',
        label: 'Packages',
        children: [
            { href: '/server', label: 'Server' },
            { href: '/client', label: 'Client' },
            { href: '/auth', label: 'Auth' },
            { href: '/di', label: 'DI' },
            { href: '/server-openapi', label: 'OpenAPI' },
            { href: '/env', label: 'Env' },
            { href: '/knex-schema', label: 'Knex Schema' },
            { href: '/orm', label: 'ORM' },
            { href: '/react-form', label: 'React Form' },
            { href: '/mapper', label: 'Mapper' },
            { href: '/scheduler', label: 'Scheduler' },
            { href: '/log', label: 'Log' },
            { href: '/otel', label: 'OpenTelemetry' }
        ]
    },
    { href: '/comparisons', label: 'Comparisons' },
    { href: '/examples', label: 'Examples' },
    { href: '/demo', label: 'Demo App' },
    { href: '/api-docs', label: 'API Docs' },
    {
        href: 'https://schema.cleverbrush.com',
        label: 'Schema Library →',
        external: true
    }
];

const BrandIcon = (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{
            marginRight: '0.4rem',
            verticalAlign: 'middle',
            display: 'inline-block',
            marginTop: '-2px'
        }}
    >
        <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
        />
    </svg>
);

const FOOTER_SECTIONS: FooterSection[] = [
    {
        title: 'Cleverbrush Framework',
        titleIcon: BrandIcon,
        description:
            'Schema-first web framework for TypeScript — type-safe servers, auto-typed clients, OpenAPI for free. Open source & community-driven.',
        links: []
    },
    {
        title: 'Resources',
        links: [
            {
                label: 'Getting Started',
                href: '/getting-started'
            },
            {
                label: 'Why Cleverbrush?',
                href: '/why'
            },
            {
                label: 'Comparisons',
                href: '/comparisons'
            },
            {
                label: 'Example App',
                href: '/examples'
            },
            {
                label: 'API Reference',
                href: '/api-docs'
            },
            {
                label: 'GitHub Repository',
                href: 'https://github.com/cleverbrush/framework',
                external: true
            },
            {
                label: 'Privacy Policy',
                href: '/privacy'
            }
        ]
    },
    {
        title: 'Related',
        links: [
            {
                label: 'Schema Library',
                href: 'https://schema.cleverbrush.com',
                external: true
            },
            {
                label: 'Cleverbrush Editor',
                href: 'https://cleverbrush.com/editor',
                external: true
            }
        ]
    },
    {
        title: 'Packages',
        links: [
            {
                label: '@cleverbrush/server',
                href: 'https://www.npmjs.com/package/@cleverbrush/server',
                external: true
            },
            {
                label: '@cleverbrush/client',
                href: 'https://www.npmjs.com/package/@cleverbrush/client',
                external: true
            },
            {
                label: '@cleverbrush/auth',
                href: 'https://www.npmjs.com/package/@cleverbrush/auth',
                external: true
            },
            {
                label: '@cleverbrush/di',
                href: 'https://www.npmjs.com/package/@cleverbrush/di',
                external: true
            },
            {
                label: '@cleverbrush/server-openapi',
                href: 'https://www.npmjs.com/package/@cleverbrush/server-openapi',
                external: true
            }
        ]
    }
];

export const metadata: Metadata = createBaseMetadata(DOCS_SITE);

export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                <JsonLd data={organizationJsonLd(DOCS_SITE)} />
                <JsonLd data={websiteJsonLd(DOCS_SITE)} />
                <JsonLd data={softwareSourceCodeJsonLd(DOCS_SITE)} />
            </head>
            <body>
                <ThemeProvider>
                    <a href="#main-content" className="skip-link">
                        Skip to main content
                    </a>
                    <Navbar
                        navItems={NAV_ITEMS}
                        brandLabel="Cleverbrush Docs"
                    />
                    <main id="main-content">{children}</main>
                    <Footer sections={FOOTER_SECTIONS} />
                    <ConsentManager gtmId={GTM_ID} />
                </ThemeProvider>
            </body>
        </html>
    );
}
