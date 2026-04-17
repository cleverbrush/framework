export interface WebSection {
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
    }
];

export const WEB_SECTIONS: WebSection[] = [
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
    }
];

export function getSectionBySlug(slug: string): WebSection | undefined {
    return WEB_SECTIONS.find(s => s.slug === slug);
}
