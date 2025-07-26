'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { User, LogOut, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { InvitationModal } from './InvitationModal'

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
  const [open, setOpen] = useState(false)
  const [invitationModalOpen, setInvitationModalOpen] = useState(false)
  
  if (!user) return null

  const initials = user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-8 h-8 rounded-full p-0">
            <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">
              {initials}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex items-center p-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white">
                {initials}
              </div>
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium">{user.name || user.email}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
          <DropdownMenuSeparator />
          <Link href="/profile">
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Mein Profil</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => {
              setInvitationModalOpen(true)
              setOpen(false) // Dropdown schließen
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            <span>Andere einladen</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="cursor-pointer text-red-600 hover:text-red-700 focus:text-red-700"
            onClick={() => signOut({ redirectUrl: afterSignOutUrl || '/' })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Ausloggen</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <InvitationModal 
        open={invitationModalOpen} 
        onOpenChange={setInvitationModalOpen} 
      />
    </>
  )
} 