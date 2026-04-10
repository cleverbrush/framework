export interface SchemaSection {
    slug: string;
    title: string;
    group: string;
}

export const SECTION_GROUPS = [
    {
        label: 'Overview',
        slugs: ['getting-started', 'schema-types']
    },
    {
        label: 'Composition',
        slugs: [
            'immutability',
            'discriminated-unions',
            'recursive-schemas',
            'generic-schemas'
        ]
    },
    {
        label: 'Validation',
        slugs: ['validation', 'property-descriptors']
    },
    {
        label: 'Modifiers',
        slugs: ['default-values', 'catch-fallback', 'readonly', 'describe']
    },
    {
        label: 'Extensions',
        slugs: ['extensions', 'built-in-extensions']
    },
    {
        label: 'Integrations',
        slugs: ['standard-schema']
    },
    {
        label: 'Reference',
        slugs: ['comparison', 'api-reference']
    }
];

export const SCHEMA_SECTIONS: SchemaSection[] = [
    { slug: 'getting-started', title: 'Getting Started', group: 'Overview' },
    { slug: 'schema-types', title: 'Schema Types', group: 'Overview' },
    {
        slug: 'immutability',
        title: 'Immutability & Composition',
        group: 'Composition'
    },
    {
        slug: 'discriminated-unions',
        title: 'Discriminated Unions',
        group: 'Composition'
    },
    {
        slug: 'recursive-schemas',
        title: 'Recursive Schemas',
        group: 'Composition'
    },
    {
        slug: 'generic-schemas',
        title: 'Generic Schemas',
        group: 'Composition'
    },
    { slug: 'validation', title: 'Validation', group: 'Validation' },
    {
        slug: 'property-descriptors',
        title: 'PropertyDescriptors',
        group: 'Validation'
    },
    { slug: 'default-values', title: 'Default Values', group: 'Modifiers' },
    { slug: 'catch-fallback', title: 'Catch / Fallback', group: 'Modifiers' },
    { slug: 'readonly', title: 'Readonly Modifier', group: 'Modifiers' },
    { slug: 'describe', title: 'Describe', group: 'Modifiers' },
    { slug: 'extensions', title: 'Extensions', group: 'Extensions' },
    {
        slug: 'built-in-extensions',
        title: 'Built-in Extensions',
        group: 'Extensions'
    },
    {
        slug: 'standard-schema',
        title: 'Standard Schema',
        group: 'Integrations'
    },
    { slug: 'comparison', title: 'Comparison', group: 'Reference' },
    { slug: 'api-reference', title: 'API Reference', group: 'Reference' }
];

export function getSectionBySlug(slug: string): SchemaSection | undefined {
    return SCHEMA_SECTIONS.find(s => s.slug === slug);
}
