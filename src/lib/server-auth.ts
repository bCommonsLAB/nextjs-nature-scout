import { headers } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

// Generisches Server-Auth Interface (Ersatz für Clerk's auth())
export interface ServerAuth {
  userId: string | null
  user: {
    id: string
    email: string
    name: string
    role: 'user' | 'experte' | 'admin' | 'superadmin'
  } | null
  protect: () => void
  redirectToSignIn: () => never
}

// **AUTH.JS INTEGRIERTE** Server-Auth Implementation
export async function auth(): Promise<ServerAuth> {
  // Verwende echte Auth.js Session
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return {
      userId: null,
      user: null,
      protect: () => {
        throw new Error('Nicht authentifiziert')
      },
      redirectToSignIn: () => {
        throw new Error('Umleitung zur Anmeldung')
      }
    }
  }

  // Konvertiere Auth.js Session zu unserem Format
  const user = {
    id: session.user.id || '',
    email: session.user.email || '',
    name: session.user.name || '',
    role: (session.user as any).role || 'user'
  }

  return {
    userId: user.id,
    user,
    protect: () => {
      // Bereits authentifiziert, nichts zu tun
    },
    redirectToSignIn: () => {
      throw new Error('Umleitung zur Anmeldung')
    }
  }
}

// Ersatz für getAuth() - gleiche Funktionalität wie auth()
export async function getAuth(req?: Request): Promise<ServerAuth> {
  return auth()
}

// Utility-Funktionen für häufige Checks
export async function requireAuth(): Promise<ServerAuth> {
  const authResult = await auth()
  if (!authResult.userId) {
    throw new Error('Authentifizierung erforderlich')
  }
  return authResult
}

export async function requireAdmin(): Promise<ServerAuth> {
  const authResult = await requireAuth()
  if (authResult.user?.role !== 'admin' && authResult.user?.role !== 'superadmin') {
    throw new Error('Administrator-Berechtigung erforderlich')
  }
  return authResult
}

export async function requireExpert(): Promise<ServerAuth> {
  const authResult = await requireAuth()
  const allowedRoles = ['experte', 'admin', 'superadmin']
  if (!allowedRoles.includes(authResult.user?.role || '')) {
    throw new Error('Experten-Berechtigung erforderlich')
  }
  return authResult
} 