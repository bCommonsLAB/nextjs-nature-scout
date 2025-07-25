'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface SignInButtonProps {
  mode?: 'redirect' | 'modal'
  children?: ReactNode
  className?: string
  fallbackRedirectUrl?: string
}

export function SignInButton({ 
  mode = 'redirect', 
  children, 
  className,
  fallbackRedirectUrl = '/authentification/anmelden'
}: SignInButtonProps) {
  const { signIn } = useAuth()

  const defaultChildren = (
    <Button className={className}>
      Anmelden
    </Button>
  )

  if (mode === 'modal') {
    // Temporär: Modal-Modus als Redirect behandeln
    return (
      <div onClick={() => signIn()} style={{ cursor: 'pointer' }}>
        {children || defaultChildren}
      </div>
    )
  }

  // Redirect-Modus
  return (
    <Link href={fallbackRedirectUrl}>
      {children || defaultChildren}
    </Link>
  )
}
interface SignedInProps {
  children: ReactNode
}

export function SignedIn({ children }: SignedInProps) {
  const { isSignedIn, isLoaded } = useAuth()
  
  if (!isLoaded) {
    return null // Loading state
  }
  
  return isSignedIn ? <>{children}</> : null
}

interface SignedOutProps {
  children: ReactNode
}

export function SignedOut({ children }: SignedOutProps) {
  const { isSignedIn, isLoaded } = useAuth()
  
  if (!isLoaded) {
    return null // Loading state
  }
  
  return !isSignedIn ? <>{children}</> : null
}

interface SignUpButtonProps {
  mode?: 'redirect' | 'modal'
  children?: ReactNode
  className?: string
  fallbackRedirectUrl?: string
}

export function SignUpButton({ 
  mode = 'redirect', 
  children, 
  className,
  fallbackRedirectUrl = '/authentification/registrieren'
}: SignUpButtonProps) {
  const defaultChildren = (
    <Button variant="outline" className={className}>
      Registrieren
    </Button>
  )

  return (
    <Link href={fallbackRedirectUrl}>
      {children || defaultChildren}
    </Link>
  )
}

interface UserButtonProps {
  appearance?: any
  afterSignOutUrl?: string
}

export function UserButton({ appearance, afterSignOutUrl }: UserButtonProps) {
  const { user, signOut } = useAuth()
  
  if (!user) return null

  const initials = (user.firstName?.[0] || '') + (user.lastName?.[0] || '') || user.name?.[0] || '?'

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        className="w-8 h-8 rounded-full p-0"
        onClick={() => signOut()}
      >
        <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">
          {initials}
        </div>
      </Button>
    </div>
  )
} 