import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Definiere öffentliche Routen mit createRouteMatcher
const isPublicRoute = createRouteMatcher([
  // Öffentliche Seiten
  "/",
  "/habitat/karte",
  "/unsere-habitate",
  "/api/public-filter-options",
  
  // API-Routen
  "/api/habitat/public",
  "/api/habitat/search",
  "/api/habitat/categories",
  "/api/habitat/categoriesDict",
  "/api/organizations",
  "/api/init/db-indexes",
  
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
]);

// Verwende den Handler-Ansatz für die Middleware
export default clerkMiddleware((auth, req) => {
  // Wenn es eine öffentliche Route ist, schütze sie nicht
  if (isPublicRoute(req)) {
    return;
  }
  
  // Alle anderen Routen sind geschützt
  auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 