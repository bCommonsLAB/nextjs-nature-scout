'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react'

// Generische User-Interface (temporär ohne Auth)
export interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'experte' | 'admin' | 'superadmin'
  image?: string
  organizationId?: string
  organizationName?: string
  organizationLogo?: string
}

// Generische Auth-Interface
export interface AuthState {
  user: User | null
  isLoaded: boolean
  isSignedIn: boolean
  isLoading: boolean
}

// Auth-Aktionen Interface
export interface AuthActions {
  signIn: (credentials?: any) => Promise<void>
  signOut: (options?: { redirectUrl?: string }) => Promise<void>
  updateUser: (userData: Partial<User>) => Promise<void>
}

// Kombinierter Auth-Context
export interface AuthContextType extends AuthState, AuthActions {}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// **AUTH.JS INTEGRIERTER** Auth-Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  // Verwende echte Auth.js Session
  const { data: session, status } = useSession()
  
  // Konvertiere Auth.js Session zu unserem User-Format
  const user: User | null = session?.user ? {
    id: session.user.id || '',

    email: session.user.email || '',
    name: session.user.name || '',
    role: (session.user as any).role || 'user',
    image: session.user.image || undefined,
    organizationId: (session.user as any).organizationId || undefined,
    organizationName: (session.user as any).organizationName || undefined
  } : null

  const authState: AuthState = {
    user,
    isLoaded: status !== 'loading',
    isSignedIn: !!session,
    isLoading: status === 'loading'
  }

  const authActions: AuthActions = {
    signIn: async (credentials?: any) => {
      console.log('SignIn aufgerufen mit Auth.js')
      if (credentials?.email && credentials?.password) {
        const result = await nextAuthSignIn('credentials', {
          email: credentials.email,
          password: credentials.password,
          redirect: false
        })
        if (result?.error) {
          throw new Error(result.error)
        }
      } else {
        // Weiterleitung zu Login-Seite
        window.location.href = '/authentification/anmelden'
      }
    },

    signOut: async (options?: { redirectUrl?: string }) => {
      console.log('SignOut aufgerufen mit Auth.js')
      await nextAuthSignOut({ 
        redirect: true,
        callbackUrl: options?.redirectUrl || '/'
      })
    },

    updateUser: async (userData: Partial<User>) => {
      console.log('UpdateUser aufgerufen:', userData)
      // TODO: Implementiere User-Update über API
      console.warn('User-Update noch nicht implementiert')
    }
  }

  const contextValue: AuthContextType = {
    ...authState,
    ...authActions
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook für Auth-Zugriff
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden')
  }
  return context
}

// Hook für User-Daten
export function useUser() {
  const auth = useAuth()
  return {
    user: auth.user,
    isLoaded: auth.isLoaded,
    isSignedIn: auth.isSignedIn
  }
} 