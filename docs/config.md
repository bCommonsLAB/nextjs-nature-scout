next.config.ts:




import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
              protocol: 'https',
              hostname: 'ragtempproject.blob.core.windows.net',
            },
            {
              protocol: 'https',
              hostname: 'cdn.builder.io',
            },
            {
              protocol: 'https',
              hostname: 'naturescout.bcommonslab.org',
            },
            {
              protocol: 'http',
              hostname: 'localhost',
            },
        ],
        unoptimized: false,
    },
    eslint: {
        // Warnung: Aktiviere das nur für die Produktion, für die Entwicklung sollte ESLint aktiv bleiben
        ignoreDuringBuilds: true,
    }
};

export default nextConfig;