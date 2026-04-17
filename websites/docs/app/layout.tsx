import type { Metadata } from 'next';
import Script from 'next/script';
import '@cleverbrush/website-shared/styles/globals.css';
import { Navbar } from '@cleverbrush/website-shared/components/Navbar';
import { Footer } from '@cleverbrush/website-shared/components/Footer';
import type { NavItem } from '@cleverbrush/website-shared/components/Navbar';
import type { FooterSection } from '@cleverbrush/website-shared/components/Footer';

const GTM_ID = 'GTM-WRLXDMG';

const NAV_ITEMS: NavItem[] = [
    { href: '/', label: 'Home' },
    { href: '/server', label: 'Server' },
    { href: '/client', label: 'Client' },
    { href: '/auth', label: 'Auth' },
    { href: '/di', label: 'DI' },
    { href: '/server-openapi', label: 'OpenAPI' },
    { href: '/env', label: 'Env' },
    { href: '/knex-schema', label: 'Knex Schema' },
    { href: '/react-form', label: 'React Form' },
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
                label: 'GitHub Repository',
                href: 'https://github.com/cleverbrush/framework',
                external: true
            },
            {
                label: 'API Reference',
                href: '/api-docs'
            },
            {
                label: 'Schema Library',
                href: 'https://schema.cleverbrush.com',
                external: true
            },
            {
                label: 'Playground',
                href: 'https://schema.cleverbrush.com/playground',
                external: true
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

export const metadata: Metadata = {
    title: 'Cleverbrush — Schema-first Web Framework for TypeScript',
    description:
        'Type-safe HTTP server, auto-typed client, OpenAPI generation, auth, and DI — all derived from one schema definition. Zero duplication, zero type drift.',
    icons: {
        icon: '/favicon.ico'
    }
};

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
                <Script
                    id="gtm-script"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{
                        __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`
                    }}
                />
            </head>
            <body>
                <noscript>
                    <iframe
                        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                        height="0"
                        width="0"
                        title="Google Tag Manager"
                        style={{ display: 'none', visibility: 'hidden' }}
                    />
                </noscript>
                <Navbar navItems={NAV_ITEMS} brandLabel="Cleverbrush Docs" />
                {children}
                <Footer sections={FOOTER_SECTIONS} />
            </body>
        </html>
    );
}
