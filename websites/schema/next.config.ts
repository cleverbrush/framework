import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://www.google-analytics.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://www.google-analytics.com",
    'frame-src https://www.googletagmanager.com',
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests'
].join('; ');

const securityHeaders = [
    {
        key: 'Content-Security-Policy',
        value: cspHeader
    },
    {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
    },
    {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
    },
    {
        key: 'X-Frame-Options',
        value: 'DENY'
    },
    {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
    },
    {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()'
    },
    {
        key: 'Link',
        value: '</llms.txt>; rel="alternate"; type="text/markdown", </sitemap.xml>; rel="sitemap"; type="application/xml"'
    }
];

const nextConfig: NextConfig = {
    output: 'standalone',
    transpilePackages: [
        '@t3-oss/env-nextjs',
        '@t3-oss/env-core',
        '@cleverbrush/website-shared'
    ],
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: securityHeaders
            },
            {
                source: '/:file(robots.txt|sitemap.xml|llms.txt)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=300, stale-while-revalidate=86400'
                    }
                ]
            }
        ];
    }
};

export default nextConfig;
