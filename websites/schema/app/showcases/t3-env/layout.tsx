import { schemaMetadata } from '../../site';

export const metadata = schemaMetadata('/showcases/t3-env');

export default function T3EnvLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return children;
}
