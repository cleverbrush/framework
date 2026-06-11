import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { playgroundMetadata } from '../../site';
import { examples } from '../examples';
import PlaygroundClient from '../PlaygroundClient';

export function generateStaticParams() {
    return [{ slug: [] }, ...examples.map(e => ({ slug: [e.id] }))];
}

export async function generateMetadata({
    params
}: {
    params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
    const { slug } = await params;
    return playgroundMetadata(slug?.[0] ?? null);
}

export default async function PlaygroundPage({
    params
}: {
    params: Promise<{ slug?: string[] }>;
}) {
    const { slug } = await params;
    const exampleId = slug?.[0] ?? null;

    if (exampleId && !examples.some(example => example.id === exampleId)) {
        notFound();
    }

    return <PlaygroundClient exampleId={exampleId} />;
}
