import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'standalone',
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
