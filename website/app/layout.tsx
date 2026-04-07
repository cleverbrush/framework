import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

const GTM_ID = 'GTM-WRLXDMG';

export const metadata: Metadata = {
    title: 'Cleverbrush — Schema, Mapper & React Form Libraries',
    description:
        'Type-safe schema validation, object mapping, and headless React forms. Open-source TypeScript libraries by Cleverbrush.',
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
                <Navbar />
                {children}
                <Footer />
            </body>
        </html>
    );
}
