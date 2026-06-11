/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: JSON-LD must be emitted as script content */
import type { Metadata, MetadataRoute } from 'next';

export interface SiteConfig {
    name: string;
    shortName: string;
    description: string;
    url: string;
    repositoryUrl: string;
    logoPath?: string;
    socialImagePath?: string;
}

export interface RouteMetadata {
    path: string;
    title: string;
    description: string;
}

export interface SitemapEntry {
    path: string;
    lastModified?: Date;
    changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency'];
    priority?: number;
}

export function absoluteUrl(site: SiteConfig, path = '/') {
    return new URL(path, site.url).toString();
}

export function createBaseMetadata(site: SiteConfig): Metadata {
    return {
        metadataBase: new URL(site.url),
        title: {
            default: site.name,
            template: `%s | ${site.shortName}`
        },
        description: site.description,
        icons: {
            icon: '/favicon.ico'
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-image-preview': 'large',
                'max-snippet': -1,
                'max-video-preview': -1
            }
        },
        openGraph: {
            type: 'website',
            siteName: site.shortName,
            title: site.name,
            description: site.description,
            url: site.url
        },
        twitter: {
            card: 'summary_large_image',
            title: site.name,
            description: site.description
        }
    };
}

export function createPageMetadata(
    site: SiteConfig,
    route: RouteMetadata
): Metadata {
    const url = absoluteUrl(site, route.path);
    return {
        title: route.title,
        description: route.description,
        alternates: {
            canonical: url
        },
        openGraph: {
            title: route.title,
            description: route.description,
            url,
            siteName: site.shortName,
            type: 'website'
        },
        twitter: {
            card: 'summary_large_image',
            title: route.title,
            description: route.description
        }
    };
}

export function createRobots(site: SiteConfig): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/'
            },
            {
                userAgent: [
                    'GPTBot',
                    'ChatGPT-User',
                    'PerplexityBot',
                    'ClaudeBot',
                    'anthropic-ai',
                    'Google-Extended',
                    'Bingbot'
                ],
                allow: '/'
            }
        ],
        sitemap: absoluteUrl(site, '/sitemap.xml'),
        host: site.url
    };
}

export function createSitemap(
    site: SiteConfig,
    entries: SitemapEntry[]
): MetadataRoute.Sitemap {
    const now = new Date();
    return entries.map(entry => ({
        url: absoluteUrl(site, entry.path),
        lastModified: entry.lastModified ?? now,
        changeFrequency: entry.changeFrequency,
        priority: entry.priority
    }));
}

export function organizationJsonLd(site: SiteConfig) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Cleverbrush',
        url: 'https://cleverbrush.com',
        sameAs: [site.repositoryUrl]
    };
}

export function websiteJsonLd(site: SiteConfig) {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: site.name,
        url: site.url,
        description: site.description,
        publisher: {
            '@type': 'Organization',
            name: 'Cleverbrush'
        }
    };
}

export function softwareSourceCodeJsonLd(site: SiteConfig) {
    return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        name: site.shortName,
        description: site.description,
        codeRepository: site.repositoryUrl,
        programmingLanguage: 'TypeScript',
        runtimePlatform: 'Node.js',
        license: 'https://github.com/cleverbrush/framework/blob/master/LICENSE'
    };
}

export function breadcrumbJsonLd(
    site: SiteConfig,
    items: { name: string; path: string }[]
) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: absoluteUrl(site, item.path)
        }))
    };
}

export function JsonLd({ data }: { data: unknown }) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(data).replace(/</g, '\\u003c')
            }}
        />
    );
}
