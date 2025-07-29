'use client'

import { SessionProvider } from "next-auth/react"
import { AuthProvider } from "@/context/auth-context"
import { NatureScoutProvider } from "@/context/nature-scout-context"

interface AuthProvidersProps {
  children: React.ReactNode
}

export function AuthProviders({ children }: AuthProvidersProps) {
  return (
    <SessionProvider>
      <AuthProvider>
        <NatureScoutProvider>
          {children}
        </NatureScoutProvider>
      </AuthProvider>
    </SessionProvider>
  )
} 