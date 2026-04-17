import { redirect } from 'next/navigation';
import CacheSection from '../sections/cache';
import DedupeSection from '../sections/dedupe';
import ErrorHandlingSection from '../sections/error-handling';
import GettingStartedSection from '../sections/getting-started';
import HooksSection from '../sections/hooks';
import { CLIENT_SECTIONS } from '../sections/index';
import MiddlewareSection from '../sections/middleware';
import PerCallOverridesSection from '../sections/per-call-overrides';
import ReactIntegrationSection from '../sections/react-integration';
import RetrySection from '../sections/retry';
import SubscriptionsSection from '../sections/subscriptions';
import TimeoutSection from '../sections/timeout';
import { ClientDocLayout } from './ClientDocLayout';

export function generateStaticParams() {
    return [{ slug: [] }, ...CLIENT_SECTIONS.map(s => ({ slug: [s.slug] }))];
}

const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
    'getting-started': GettingStartedSection,
    middleware: MiddlewareSection,
    hooks: HooksSection,
    retry: RetrySection,
    timeout: TimeoutSection,
    dedupe: DedupeSection,
    cache: CacheSection,
    'error-handling': ErrorHandlingSection,
    'per-call-overrides': PerCallOverridesSection,
    'react-integration': ReactIntegrationSection,
    subscriptions: SubscriptionsSection
};

export default async function ClientDocPage({
    params
}: {
    params: Promise<{ slug?: string[] }>;
}) {
    const { slug } = await params;
    const currentSlug = slug?.[0] ?? null;

    if (!currentSlug) {
        redirect('/client/getting-started');
    }

    const SectionComponent = SECTION_COMPONENTS[currentSlug];
    if (!SectionComponent) {
        redirect('/client/getting-started');
    }

    return (
        <ClientDocLayout currentSlug={currentSlug}>
            <SectionComponent />
        </ClientDocLayout>
    );
}
