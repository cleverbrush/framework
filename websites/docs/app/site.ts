import type {
    RouteMetadata,
    SiteConfig
} from '@cleverbrush/website-shared/lib/seo';
import { createPageMetadata } from '@cleverbrush/website-shared/lib/seo';
import { CLIENT_SECTIONS } from './client/sections';

export const DOCS_SITE: SiteConfig = {
    name: 'Cleverbrush Framework Documentation',
    shortName: 'Cleverbrush Docs',
    description:
        'Schema-first TypeScript framework docs for typed HTTP servers, clients, OpenAPI, auth, DI, forms, and supporting packages.',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://docs.cleverbrush.com',
    repositoryUrl: 'https://github.com/cleverbrush/framework'
};

export const DOCS_ROUTES: RouteMetadata[] = [
    {
        path: '/',
        title: 'Cleverbrush — Schema-first Web Framework for TypeScript',
        description:
            'Type-safe HTTP server, auto-typed client, OpenAPI generation, auth, and DI derived from one schema definition.'
    },
    {
        path: '/why',
        title: 'Why Cleverbrush?',
        description:
            'The problem with full-stack TypeScript today and how Cleverbrush solves it with a single schema definition.'
    },
    {
        path: '/getting-started',
        title: 'Getting Started',
        description:
            'Build a typed Cleverbrush API contract, server, client, and OpenAPI output step by step.'
    },
    {
        path: '/comparisons',
        title: 'Cleverbrush Comparisons',
        description:
            'Compare Cleverbrush with tRPC, ts-rest, Hono, and related TypeScript web framework options.'
    },
    {
        path: '/examples',
        title: 'Cleverbrush Examples',
        description:
            'Example applications and implementation patterns for the Cleverbrush TypeScript framework.'
    },
    {
        path: '/demo',
        title: 'Cleverbrush Demo App',
        description:
            'Run the full-stack Cleverbrush Todo demo with Postgres, the typed server, client, forms, and observability.'
    },
    {
        path: '/server',
        title: '@cleverbrush/server',
        description:
            'Schema-first HTTP server for Node.js with typed endpoints, validation, auth, DI, and content negotiation.'
    },
    {
        path: '/auth',
        title: '@cleverbrush/auth',
        description:
            'Authentication and authorization helpers for Cleverbrush servers, including JWT, cookies, OAuth2, OIDC, and principals.'
    },
    {
        path: '/di',
        title: '@cleverbrush/di',
        description:
            'Dependency injection container documentation for schema-keyed tokens, lifetimes, scopes, and endpoint injection.'
    },
    {
        path: '/server-openapi',
        title: '@cleverbrush/server-openapi',
        description:
            'Generate OpenAPI 3.1 from Cleverbrush endpoint contracts, including security schemes, links, callbacks, and webhooks.'
    },
    {
        path: '/env',
        title: '@cleverbrush/env',
        description:
            'Type-safe environment variable parsing and validation with Cleverbrush schema builders.'
    },
    {
        path: '/knex-schema',
        title: '@cleverbrush/knex-schema',
        description:
            'Schema-aware Knex utilities for table names, column names, filtering, eager loading, and typed query helpers.'
    },
    {
        path: '/orm',
        title: '@cleverbrush/orm',
        description:
            'ORM documentation for relations, change tracking, concurrency, inheritance, and schema-backed migrations.'
    },
    {
        path: '/react-form',
        title: '@cleverbrush/react-form',
        description:
            'Headless schema-driven React forms with typed field selectors, validation, renderers, and form providers.'
    },
    {
        path: '/mapper',
        title: '@cleverbrush/mapper',
        description:
            'Schema-driven object mapping with compile-time completeness and type-safe property selectors.'
    },
    {
        path: '/scheduler',
        title: '@cleverbrush/scheduler',
        description:
            'Job scheduling documentation for workers, event handling, schedule calculators, and custom persistence.'
    },
    {
        path: '/log',
        title: '@cleverbrush/log',
        description:
            'Structured logging helpers with message templates, sinks, correlation, and DI integration.'
    },
    {
        path: '/otel',
        title: '@cleverbrush/otel',
        description:
            'OpenTelemetry instrumentation for Cleverbrush servers, endpoint spans, privacy redaction, and tracing integration.'
    },
    {
        path: '/privacy',
        title: 'Privacy Policy',
        description:
            'Privacy and analytics choices for the Cleverbrush Framework documentation site.'
    }
];

export function docsMetadata(path: string) {
    const route = DOCS_ROUTES.find(entry => entry.path === path);
    return createPageMetadata(DOCS_SITE, route ?? DOCS_ROUTES[0]);
}

export function clientSectionMetadata(slug: string) {
    const section = CLIENT_SECTIONS.find(entry => entry.slug === slug);
    const title = section?.title ?? 'Client Documentation';
    const path = section
        ? `/client/${section.slug}`
        : '/client/getting-started';
    return createPageMetadata(DOCS_SITE, {
        path,
        title: `${title} — @cleverbrush/client`,
        description: section
            ? `${title} documentation for the @cleverbrush/client type-safe HTTP client.`
            : 'Client documentation for the @cleverbrush/client type-safe HTTP client.'
    });
}

export const DOCS_SITEMAP_ROUTES = [
    ...DOCS_ROUTES.map(route => ({
        path: route.path,
        changeFrequency: 'monthly' as const,
        priority: route.path === '/' ? 1 : 0.8
    })),
    ...CLIENT_SECTIONS.map(section => ({
        path: `/client/${section.slug}`,
        changeFrequency: 'monthly' as const,
        priority: section.slug === 'getting-started' ? 0.8 : 0.7
    })),
    {
        path: '/api-docs/index.html',
        changeFrequency: 'weekly' as const,
        priority: 0.6
    }
];
