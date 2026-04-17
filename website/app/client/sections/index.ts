export interface ClientSection {
    slug: string;
    title: string;
    group: string;
}

export const SECTION_GROUPS = [
    {
        label: 'Overview',
        slugs: ['getting-started']
    },
    {
        label: 'Architecture',
        slugs: ['middleware', 'hooks']
    },
    {
        label: 'Resilience',
        slugs: ['retry', 'timeout', 'dedupe', 'cache']
    },
    {
        label: 'Advanced',
        slugs: ['error-handling', 'per-call-overrides']
    },
    {
        label: 'React',
        slugs: ['react-integration']
    }
];

export const CLIENT_SECTIONS: ClientSection[] = [
    { slug: 'getting-started', title: 'Getting Started', group: 'Overview' },
    { slug: 'middleware', title: 'Middleware', group: 'Architecture' },
    { slug: 'hooks', title: 'Lifecycle Hooks', group: 'Architecture' },
    { slug: 'retry', title: 'Retry', group: 'Resilience' },
    { slug: 'timeout', title: 'Timeout', group: 'Resilience' },
    { slug: 'dedupe', title: 'Deduplication', group: 'Resilience' },
    { slug: 'cache', title: 'Cache', group: 'Resilience' },
    {
        slug: 'error-handling',
        title: 'Error Handling',
        group: 'Advanced'
    },
    {
        slug: 'per-call-overrides',
        title: 'Per-Call Overrides',
        group: 'Advanced'
    },
    {
        slug: 'react-integration',
        title: 'React Integration',
        group: 'React'
    }
];

export function getSectionBySlug(slug: string): ClientSection | undefined {
    return CLIENT_SECTIONS.find(s => s.slug === slug);
}
