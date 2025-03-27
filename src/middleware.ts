import { clerkMiddleware } from '@clerk/nextjs/server';

// Konfiguriere die Middleware
export default clerkMiddleware({
  publicRoutes: [
    // Öffentliche Seiten
    "/",
    "/habitat/karte",
    
    // API-Routen
    "/api/habitat/public",
    "/api/habitat/search",
    "/api/habitat/categories",
    "/api/habitat/categoriesDict",
    
    // Webhook-Routen
    "/api/webhook/clerk",
    
    // Debug-Routen
    "/api/debug/log",
    
    // Statische Assets
    "/(.*).png",
    "/(.*).jpg",
    "/(.*).jpeg",
    "/(.*).svg",
    "/(.*).ico",
    "/favicon.ico"
  ]
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 