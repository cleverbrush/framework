import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const metadata: Metadata = {
    title: 'Cleverbrush — Schema, Mapper & React Form Libraries',
    description:
        'Type-safe schema validation, object mapping, and headless React forms. Open-source TypeScript libraries by Cleverbrush.'
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
            </head>
            <body>
                <Navbar />
                {children}
                <Footer />
            </body>
        </html>
    );
}
