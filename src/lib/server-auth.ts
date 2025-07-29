import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth"
import { UserService } from "./services/user-service"

/**
 * Holt die aktuelle Session vom Server
 */
export async function auth() {
  const session = await getServerSession(authOptions)
  return session
}

/**
 * Holt die aktuelle Session und gibt User-Info zurück
 */
export async function getAuth() {
  const session = await getServerSession(authOptions)
  return {
    user: session?.user,
    isAuthenticated: !!session?.user
  }
}

/**
 * Prüft ob der Benutzer angemeldet ist
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error('Nicht angemeldet')
  }
  return session.user
}

/**
 * Prüft ob der Benutzer Admin-Rechte hat
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    throw new Error('Nicht angemeldet')
  }
  
  const isAdmin = await UserService.isAdmin(session.user.email)
  if (!isAdmin) {
    throw new Error('Keine Administratorrechte')
  }
  
  return session.user
}

/**
 * Prüft ob der Benutzer Experte ist
 */
export async function requireExpert() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    throw new Error('Nicht angemeldet')
  }
  
  const isExpert = await UserService.isExpert(session.user.email)
  if (!isExpert) {
    throw new Error('Keine Expertenrechte')
  }
  
  return session.user
}

/**
 * Prüft Admin-Rechte und gibt Boolean zurück (für API-Routen)
 */
export async function checkAdminAccess() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { isAdmin: false, error: 'Nicht angemeldet' }
    }
    
    const isAdmin = await UserService.isAdmin(session.user.email)
    if (!isAdmin) {
      return { isAdmin: false, error: 'Keine Administratorrechte' }
    }
    
    return { isAdmin: true, error: null, user: session.user }
  } catch (error) {
    return { isAdmin: false, error: 'Authentifizierungsfehler' }
  }
}

/**
 * Prüft Experten-Rechte und gibt Boolean zurück (für API-Routen)
 */
export async function checkExpertAccess() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { isExpert: false, error: 'Nicht angemeldet' }
    }
    
    const isExpert = await UserService.isExpert(session.user.email)
    if (!isExpert) {
      return { isExpert: false, error: 'Keine Expertenrechte' }
    }
    
    return { isExpert: true, error: null, user: session.user }
  } catch (error) {
    return { isExpert: false, error: 'Authentifizierungsfehler' }
  }
} 