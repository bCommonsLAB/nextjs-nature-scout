import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Standalone output für Docker-Build
    output: 'standalone',

    images: {
        remotePatterns: [
            {
              protocol: 'https',
              hostname: 'ragtempproject.blob.core.windows.net',
              port: '',
              pathname: '/**',
            },
            {
              protocol: 'https',
              hostname: 'cdn.builder.io',
              port: '',
              pathname: '/**',
            },
            {
              protocol: 'https',
              hostname: 'naturescout.bcommonslab.org',
              port: '',
              pathname: '/**',
            },
            {
              protocol: 'https',
              hostname: 'nature.bcommonslab.org',
              port: '',
              pathname: '/**',
            },
            {
              protocol: 'http',
              hostname: 'localhost',
              port: '',
              pathname: '/**',
            },
            {
              protocol: 'https',
              hostname: 'cms.umwelt.bz.it',
              port: '',
              pathname: '/**',
            },
            {
              protocol: 'https',
              hostname: 'www.umwelt.bz.it',
              port: '',
              pathname: '/**',
            },
        ],
        unoptimized: true, // Temporär deaktiviert für Debugging
        // EXIF-Orientierung automatisch korrigieren
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
        // Automatische Orientierungskorrektur aktivieren
        formats: ['image/webp', 'image/avif'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        // Cache-Kontrolle für Azure Storage Bilder
        minimumCacheTTL: 0,
    },
    // Cache-Control Headers für Azure Storage
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=0, must-revalidate',
                    },
                ],
            },
        ];
    },
    eslint: {
        // Warnung: Aktiviere das nur für die Produktion, für die Entwicklung sollte ESLint aktiv bleiben
        ignoreDuringBuilds: true,
    },
    typescript: {
        // Warnung: Aktiviere das nur für die Produktion, für die Entwicklung sollte TypeScript aktiv bleiben
        ignoreBuildErrors: true,
    }
};

export default nextConfig;
