import type { MetadataRoute } from 'next';

// Web-App-Manifest (Session 3.1) – macht NatureScout installierbar (PWA, mobile-first).
// Next.js liefert dies unter /manifest.webmanifest aus und verlinkt es automatisch im <head>.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NatureScout – Habitate erfassen',
    short_name: 'NatureScout',
    description: 'Naturhabitate in Südtirol erfassen und KI-gestützt analysieren – auch offline im Feld.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#4F7942',
    lang: 'de',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
