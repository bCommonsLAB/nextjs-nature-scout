import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Pfade, die ohne Authentifizierung zugänglich sein sollen
  publicRoutes: [
    // Öffentliche Seiten
    "/",
    "/habitat/karte",
    "/api/habitat/public",
    "/api/habitat/search",
    "/api/habitat/categories",
    "/api/habitat/categoriesDict",
    
    // Webhook-Routen müssen öffentlich sein
    "/api/webhook/clerk",
    
    // Debug-Endpunkte (für Logging)
    "/api/debug/log",
    
    // Statische Assets 
    "/favicon(.*)",
    "/images/(.*)",
  ],
  
  // API-Routen, die ohne CSRF-Schutz funktionieren sollen
  ignoredRoutes: [
    "/api/webhook/clerk",
  ],
});

// Exporter für die Middleware-Konfiguration
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}; 