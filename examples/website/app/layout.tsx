import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const metadata: Metadata = {
    title: 'Cleverbrush Libs — Schema, Mapper & React Form Libraries',
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
            <body>
                <Navbar />
                {children}
                <Footer />
            </body>
        </html>
    );
}
