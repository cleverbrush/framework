import { examples } from '../examples';
import PlaygroundClient from '../PlaygroundClient';

export function generateStaticParams() {
    return [{ slug: [] }, ...examples.map(e => ({ slug: [e.id] }))];
}

export default async function PlaygroundPage({
    params
}: {
    params: Promise<{ slug?: string[] }>;
}) {
    const { slug } = await params;
    const exampleId = slug?.[0] ?? null;
    return <PlaygroundClient exampleId={exampleId} />;
}
