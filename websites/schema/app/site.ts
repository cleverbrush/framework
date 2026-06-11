import type {
    RouteMetadata,
    SiteConfig
} from '@cleverbrush/website-shared/lib/seo';
import { createPageMetadata } from '@cleverbrush/website-shared/lib/seo';
import { SCHEMA_SECTIONS } from './docs/sections';
import { examples } from './playground/examples';

export const SCHEMA_SITE: SiteConfig = {
    name: 'Cleverbrush Schema Documentation',
    shortName: 'Cleverbrush Schema',
    description:
        'Type-safe schema validation for TypeScript with runtime introspection, Standard Schema support, object mapping, and form generation.',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://schema.cleverbrush.com',
    repositoryUrl: 'https://github.com/cleverbrush/framework'
};

export const SCHEMA_ROUTES: RouteMetadata[] = [
    {
        path: '/',
        title: 'Cleverbrush Schema — Type-safe Validation for TypeScript',
        description:
            'Zero-dependency TypeScript schema validation with full type inference, Standard Schema support, and runtime introspection.'
    },
    {
        path: '/mapper',
        title: '@cleverbrush/mapper',
        description:
            'Schema-driven object mapping with compile-time completeness and type-safe property selectors.'
    },
    {
        path: '/schema-json',
        title: '@cleverbrush/schema-json',
        description:
            'Generate JSON Schema from Cleverbrush schemas and map JSON Schema concepts back to schema builders.'
    },
    {
        path: '/showcases',
        title: 'Cleverbrush Schema Showcases',
        description:
            'Live integrations showing @cleverbrush/schema with Standard Schema-compatible tools.'
    },
    {
        path: '/showcases/t3-env',
        title: 'T3 Env + Standard Schema',
        description:
            'Use @cleverbrush/schema as the Standard Schema validator for T3 Env configuration.'
    },
    {
        path: '/showcases/tanstack-form',
        title: 'TanStack Form + Standard Schema',
        description:
            'Build a live TanStack Form demo backed by @cleverbrush/schema and Standard Schema validation.'
    },
    {
        path: '/privacy',
        title: 'Privacy Policy',
        description:
            'Privacy and analytics choices for the Cleverbrush Schema documentation site.'
    }
];

export function schemaMetadata(path: string) {
    const route = SCHEMA_ROUTES.find(entry => entry.path === path);
    return createPageMetadata(SCHEMA_SITE, route ?? SCHEMA_ROUTES[0]);
}

export function schemaDocMetadata(slug: string) {
    const section = SCHEMA_SECTIONS.find(entry => entry.slug === slug);
    const title = section?.title ?? '@cleverbrush/schema Documentation';
    const path = section ? `/docs/${section.slug}` : '/docs/why';
    return createPageMetadata(SCHEMA_SITE, {
        path,
        title: `${title} — @cleverbrush/schema`,
        description: section
            ? `${title} documentation for @cleverbrush/schema, a type-safe TypeScript validation library with runtime introspection.`
            : 'Documentation for @cleverbrush/schema, a type-safe TypeScript validation library with runtime introspection.'
    });
}

export function playgroundMetadata(slug: string | null) {
    const example = slug ? examples.find(entry => entry.id === slug) : null;
    return createPageMetadata(SCHEMA_SITE, {
        path: example ? `/playground/${example.id}` : '/playground',
        title: example
            ? `${example.title} — Schema Playground`
            : 'Schema Playground',
        description: example
            ? example.description.replace(/<[^>]*>/g, '')
            : 'Interactive @cleverbrush/schema playground with runnable examples, validation output, and type inference.'
    });
}

export const SCHEMA_SITEMAP_ROUTES = [
    ...SCHEMA_ROUTES.map(route => ({
        path: route.path,
        changeFrequency: 'monthly' as const,
        priority: route.path === '/' ? 1 : 0.8
    })),
    ...SCHEMA_SECTIONS.map(section => ({
        path: `/docs/${section.slug}`,
        changeFrequency: 'monthly' as const,
        priority:
            section.slug === 'getting-started' || section.slug === 'why'
                ? 0.9
                : 0.75
    })),
    {
        path: '/playground',
        changeFrequency: 'weekly' as const,
        priority: 0.9
    },
    ...examples.map(example => ({
        path: `/playground/${example.id}`,
        changeFrequency: 'monthly' as const,
        priority: example.id === 'quick-start' ? 0.8 : 0.6
    }))
];
