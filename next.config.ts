import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        domains: ['ragtempproject.blob.core.windows.net','cdn.builder.io'],
        remotePatterns: [
            {
              protocol: 'https',
              hostname: 'naturescout.bcommonslab.org',
            },
        ],
        unoptimized: false,
    }
};

export default nextConfig;
