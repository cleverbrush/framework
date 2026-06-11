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
import { SCHEMA_SITE } from './site';

const GTM_ID = 'GTM-WRLXDMG';

const NAV_ITEMS: NavItem[] = [
    { href: '/', label: 'Home' },
    { href: '/docs', label: 'Docs' },
    { href: '/playground', label: 'Playground', highlight: true },
    { href: '/showcases', label: 'Showcases' },
    {
        href: 'https://docs.cleverbrush.com',
        label: 'Web Framework →',
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
        title: 'Cleverbrush Schema',
        titleIcon: BrandIcon,
        description:
            'Type-safe schema validation, object mapping, and Standard Schema interop. Open source & community-driven.',
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
                label: 'Privacy Policy',
                href: '/privacy'
            },
            { label: 'Playground', href: '/playground' },
            {
                label: 'API Reference',
                href: 'https://docs.cleverbrush.com/api-docs',
                external: true
            }
        ]
    },
    {
        title: 'Related',
        links: [
            {
                label: 'Web Framework Docs',
                href: 'https://docs.cleverbrush.com',
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
                label: '@cleverbrush/schema',
                href: 'https://www.npmjs.com/package/@cleverbrush/schema',
                external: true
            },
            {
                label: '@cleverbrush/mapper',
                href: 'https://www.npmjs.com/package/@cleverbrush/mapper',
                external: true
            },
            {
                label: '@cleverbrush/schema-json',
                href: 'https://www.npmjs.com/package/@cleverbrush/schema-json',
                external: true
            }
        ]
    }
];

export const metadata: Metadata = createBaseMetadata(SCHEMA_SITE);

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
                <JsonLd data={organizationJsonLd(SCHEMA_SITE)} />
                <JsonLd data={websiteJsonLd(SCHEMA_SITE)} />
                <JsonLd data={softwareSourceCodeJsonLd(SCHEMA_SITE)} />
            </head>
            <body>
                <ThemeProvider>
                    <a href="#main-content" className="skip-link">
                        Skip to main content
                    </a>
                    <Navbar
                        navItems={NAV_ITEMS}
                        brandLabel="Cleverbrush Schema"
                    />
                    <main id="main-content">{children}</main>
                    <Footer sections={FOOTER_SECTIONS} />
                    <ConsentManager gtmId={GTM_ID} />
                </ThemeProvider>
            </body>
        </html>
    );
}
