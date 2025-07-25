import { NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'

// **AUTH.JS INTEGRIERTE** Middleware mit Authentifizierung
export default withAuth(
  function middleware(req) {
    console.log(`[MIDDLEWARE] User: ${req.nextauth.token?.email}`)
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Öffentliche Routen erlauben
        const publicRoutes = [
          '/',
          '/habitat/karte',
          '/api/habitat/public',
          '/api/public-filter-options',
          '/api/organizations',
          '/authentification/anmelden',
          '/authentification/registrieren',
          '/authentification/passwort-vergessen',
          '/authentification/einladung'
        ]
        
        const isPublicRoute = publicRoutes.some(route => 
          req.nextUrl.pathname.startsWith(route)
        )
        
        if (isPublicRoute) {
          return true
        }
        
        // Admin-Routen erfordern Admin-Rolle
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return token?.role === 'admin' || token?.role === 'superadmin'
        }
        
        // Alle anderen Routen erfordern Authentifizierung
        return !!token
      }
    },
    pages: {
      signIn: '/authentification/anmelden'
    }
  }
)

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
} 