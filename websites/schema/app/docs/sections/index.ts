export interface SchemaSection {
    slug: string;
    title: string;
    group: string;
}

export const SECTION_GROUPS = [
    {
        label: 'Fundamentals',
        slugs: [
            'why',
            'getting-started',
            'schema-types',
            'validation',
            'type-inference'
        ]
    },
    {
        label: 'Composition',
        slugs: [
            'immutability',
            'discriminated-unions',
            'recursive-schemas',
            'parse-string',
            'object-constructors'
        ]
    },
    {
        label: 'Modifiers',
        slugs: ['schema-modifiers']
    },
    {
        label: 'Superpowers',
        slugs: [
            'extensions',
            'built-in-extensions',
            'generic-schemas',
            'property-descriptors',
            'extern'
        ]
    },
    {
        label: 'Ecosystem',
        slugs: ['standard-schema']
    },
    {
        label: 'Reference',
        slugs: ['comparison', 'migrating-from-zod', 'api-reference']
    }
];

export const SCHEMA_SECTIONS: SchemaSection[] = [
    { slug: 'why', title: 'Why @cleverbrush/schema?', group: 'Fundamentals' },
    {
        slug: 'getting-started',
        title: 'Getting Started',
        group: 'Fundamentals'
    },
    { slug: 'schema-types', title: 'Schema Types', group: 'Fundamentals' },
    { slug: 'validation', title: 'Validation', group: 'Fundamentals' },
    {
        slug: 'type-inference',
        title: 'Type Inference',
        group: 'Fundamentals'
    },
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
        slug: 'parse-string',
        title: 'Parse String & Coercion',
        group: 'Composition'
    },
    {
        slug: 'object-constructors',
        title: 'Object Constructors',
        group: 'Composition'
    },
    {
        slug: 'schema-modifiers',
        title: 'Schema Modifiers',
        group: 'Modifiers'
    },
    { slug: 'extensions', title: 'Extensions', group: 'Superpowers' },
    {
        slug: 'built-in-extensions',
        title: 'Built-in Extensions',
        group: 'Superpowers'
    },
    {
        slug: 'generic-schemas',
        title: 'Generic Schemas',
        group: 'Superpowers'
    },
    {
        slug: 'property-descriptors',
        title: 'PropertyDescriptors',
        group: 'Superpowers'
    },
    {
        slug: 'extern',
        title: 'extern() Interop',
        group: 'Superpowers'
    },
    {
        slug: 'standard-schema',
        title: 'Standard Schema',
        group: 'Ecosystem'
    },
    { slug: 'comparison', title: 'Comparison', group: 'Reference' },
    {
        slug: 'migrating-from-zod',
        title: 'Migrating from Zod',
        group: 'Reference'
    },
    { slug: 'api-reference', title: 'API Reference', group: 'Reference' }
];

/** Slugs that should redirect to the merged schema-modifiers page */
export const MODIFIER_REDIRECTS: Record<string, string> = {
    'default-values': 'schema-modifiers#default-values',
    'catch-fallback': 'schema-modifiers#catch-fallback',
    readonly: 'schema-modifiers#readonly',
    describe: 'schema-modifiers#describe',
    'schema-name': 'schema-modifiers#schema-name',
    'promise-schema': 'schema-modifiers#promise-schema'
};

export function getSectionBySlug(slug: string): SchemaSection | undefined {
    return SCHEMA_SECTIONS.find(s => s.slug === slug);
}
