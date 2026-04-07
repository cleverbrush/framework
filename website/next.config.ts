import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'standalone',
    transpilePackages: ['@t3-oss/env-nextjs', '@t3-oss/env-core'],
    async redirects() {
        return [
            {
                source: '/api-docs',
                destination: '/api-docs/index.html',
                permanent: false
            },
            {
                source: '/api-docs/latest',
                destination: '/api-docs/latest/index.html',
                permanent: false
            }
        ];
    }
};

export default nextConfig;
