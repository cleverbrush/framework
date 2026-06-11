import { docsMetadata } from '../site';

export const metadata = docsMetadata('/react-form');

export default function ReactFormLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return children;
}
