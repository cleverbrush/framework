import type { Metadata } from 'next';
import Script from 'next/script';
import '@cleverbrush/website-shared/styles/globals.css';
import type { FooterSection } from '@cleverbrush/website-shared/components/Footer';
import { Footer } from '@cleverbrush/website-shared/components/Footer';
import type { NavItem } from '@cleverbrush/website-shared/components/Navbar';
import { Navbar } from '@cleverbrush/website-shared/components/Navbar';
import { ThemeProvider } from '@cleverbrush/website-shared/components/ThemeProvider';

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

export const metadata: Metadata = {
    title: 'Cleverbrush Schema — Type-safe Validation for TypeScript',
    description:
        'Zero-dependency schema validation with full type inference, Standard Schema support, and Zod-compatible API. Open-source TypeScript library.',
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
                <ThemeProvider>
                    <Navbar
                        navItems={NAV_ITEMS}
                        brandLabel="Cleverbrush Schema"
                    />
                    {children}
                    <Footer sections={FOOTER_SECTIONS} />
                </ThemeProvider>
            </body>
        </html>
    );
}
