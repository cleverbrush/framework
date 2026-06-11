import { schemaMetadata } from '../../site';

export const metadata = schemaMetadata('/showcases/tanstack-form');

export default function TanStackFormLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return children;
}
