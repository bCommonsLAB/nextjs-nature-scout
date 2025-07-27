'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Gift, ArrowRight } from 'lucide-react'

interface InviteAcceptPageProps {
  token: string
}

export default function InviteAcceptPage({ token }: InviteAcceptPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [invitation, setInvitation] = useState<{
    name: string
    email: string
    inviterName: string
    organizationName?: string
  } | null>(null)

  useEffect(() => {
    handleInvitation()
  }, [token])

  const handleInvitation = async () => {
    try {
      console.log('🔍 Validiere Einladungs-Token:', token)
      const response = await fetch(`/api/auth/invite/validate?token=${token}`)
      
      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error('JSON Parse Error:', jsonError)
        setError('Ungültige Server-Antwort')
        return
      }

      console.log('📡 Einladungs-Validierung Antwort:', { status: response.status, data })

      if (response.ok && data.success) {
        setInvitation(data.invitation)
        
        // Automatisch anmelden oder Benutzer erstellen
        await autoLogin(data.invitation.email, data.user)
      } else {
        setError(data.message || 'Ungültiger Einladungslink')
      }
    } catch (error) {
      console.error('Einladungs-Verarbeitungsfehler:', error)
      setError('Fehler beim Verarbeiten der Einladung')
    } finally {
      setIsLoading(false)
    }
  }

  const autoLogin = async (email: string, user: any) => {
    try {
      // Wenn Benutzer bereits ein Passwort hat, versuche automatische Anmeldung
      if (user.hasPassword) {
        // Hier könnten wir einen automatischen Login-Code senden
        // Für jetzt leiten wir zur Login-Seite weiter
        router.push(`/auth/login?email=${encodeURIComponent(email)}&message=invite_accepted`)
        return
      }

      // Benutzer ohne Passwort - erstelle automatisch ein temporäres Passwort
      const tempPassword = generateTempPassword()
      
      // Passwort setzen
      const passwordResponse = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: tempPassword }),
      })

      if (passwordResponse.ok) {
        // Automatisch anmelden
        const result = await signIn('credentials', {
          email,
          password: tempPassword,
          loginType: 'password',
          redirect: false,
        })

        if (result?.error) {
          console.log('Auto-Login fehlgeschlagen, Fallback zur Login-Seite')
          // Fallback: Zur Login-Seite weiterleiten
          router.push(`/auth/login?email=${encodeURIComponent(email)}&message=invite_accepted`)
        } else {
          console.log('Auto-Login erfolgreich, Weiterleitung zur Begrüßungsseite')
          // Einladungsdaten für die Begrüßungsseite speichern
          if (invitation) {
            localStorage.setItem('invitationData', JSON.stringify(invitation))
          }
          // Zur Begrüßungsseite weiterleiten
          router.push('/welcome?invite=true')
        }
      } else {
        console.log('Passwort-Set fehlgeschlagen, Fallback zur Login-Seite')
        // Fallback: Zur Login-Seite weiterleiten
        router.push(`/auth/login?email=${encodeURIComponent(email)}&message=invite_accepted`)
      }
    } catch (error) {
      console.error('Auto-Login Fehler:', error)
      // Fallback: Zur Login-Seite weiterleiten
      router.push(`/auth/login?email=${encodeURIComponent(email)}&message=invite_accepted`)
    }
  }

  const generateTempPassword = () => {
    // Generiere ein sicheres temporäres Passwort
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFFF3] to-[#E9F5DB] flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg border-[#D3E0BD] bg-white/90 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#637047] mx-auto"></div>
              <p className="mt-4 text-[#637047]">Verarbeite Einladung...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFFF3] to-[#E9F5DB] flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg border-[#D3E0BD] bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 p-4 rounded-full">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-[#2D3321] mb-3">
              Einladung nicht gültig
            </CardTitle>
            <CardDescription className="text-lg text-[#637047]">
              Der Einladungslink konnte nicht verarbeitet werden
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription className="text-base">
                {error}
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => router.push('/auth/login')}
              className="w-full h-14 text-lg bg-[#637047] hover:bg-[#2D3321] font-medium shadow-md"
            >
              Zur Anmeldung
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFFF3] to-[#E9F5DB] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg border-[#D3E0BD] bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-6">
            <div className="bg-[#D3E0BD] p-4 rounded-full">
              <Gift className="h-10 w-10 text-[#637047]" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-[#2D3321] mb-3">
            Willkommen bei NatureScout!
          </CardTitle>
          <CardDescription className="text-lg text-[#637047]">
            Ihre Einladung wird verarbeitet...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {invitation && (
            <Alert className="border-[#D3E0BD] bg-[#FAFFF3]">
              <CheckCircle className="h-5 w-5 text-[#637047]" />
              <AlertDescription className="text-base text-[#2D3321]">
                <strong>Sie wurden eingeladen!</strong><br />
                {invitation.inviterName} hat Sie zu NatureScout eingeladen
                {invitation.organizationName && ` (${invitation.organizationName})`}.
              </AlertDescription>
            </Alert>
          )}
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#637047] mx-auto"></div>
            <p className="mt-4 text-[#637047]">Sie werden automatisch angemeldet...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 