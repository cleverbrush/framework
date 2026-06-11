import { breadcrumbJsonLd, JsonLd } from '@cleverbrush/website-shared/lib/seo';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { clientSectionMetadata, DOCS_SITE } from '../../site';
import BatchingSection from '../sections/batching';
import CacheSection from '../sections/cache';
import CacheTagsSection from '../sections/cacheTags';
import DedupeSection from '../sections/dedupe';
import ErrorHandlingSection from '../sections/error-handling';
import GettingStartedSection from '../sections/getting-started';
import HooksSection from '../sections/hooks';
import IdempotencySection from '../sections/idempotency';
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
    idempotency: IdempotencySection,
    cache: CacheSection,
    'cache-tags': CacheTagsSection,
    batching: BatchingSection,
    'error-handling': ErrorHandlingSection,
    'per-call-overrides': PerCallOverridesSection,
    'react-integration': ReactIntegrationSection,
    subscriptions: SubscriptionsSection
};

export async function generateMetadata({
    params
}: {
    params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const currentSlug = slug?.[0] ?? null;

    if (!currentSlug) {
        return clientSectionMetadata('getting-started');
    }

    if (!SECTION_COMPONENTS[currentSlug]) {
        return {
            title: 'Not Found',
            robots: {
                index: false,
                follow: false
            }
        };
    }

    return clientSectionMetadata(currentSlug);
}

export default async function ClientDocPage({
    params
}: {
    params: Promise<{ slug?: string[] }>;
}) {
    const { slug } = await params;
    const currentSlug = slug?.[0] ?? null;

    if (!currentSlug) {
        permanentRedirect('/client/getting-started');
    }

    const SectionComponent = SECTION_COMPONENTS[currentSlug];
    if (!SectionComponent) {
        notFound();
    }

    const section = CLIENT_SECTIONS.find(entry => entry.slug === currentSlug);

    return (
        <>
            <JsonLd
                data={breadcrumbJsonLd(DOCS_SITE, [
                    { name: 'Home', path: '/' },
                    {
                        name: '@cleverbrush/client',
                        path: '/client/getting-started'
                    },
                    {
                        name: section?.title ?? 'Client documentation',
                        path: `/client/${currentSlug}`
                    }
                ])}
            />
            <ClientDocLayout currentSlug={currentSlug}>
                <SectionComponent />
            </ClientDocLayout>
        </>
    );
}
