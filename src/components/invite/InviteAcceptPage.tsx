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
        // WICHTIG: Einladungsdaten direkt übergeben, nicht auf State warten
        await autoLogin(data.invitation.email, data.user, data.invitation)
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

  const autoLogin = async (email: string, user: any, invitationData: any) => {
    try {
      console.log('🔍 InviteAcceptPage - autoLogin startet:', { email, hasPassword: user.hasPassword })
      
      // Wenn Benutzer bereits ein Passwort hat, zur Login-Seite weiterleiten
      if (user.hasPassword) {
        console.log('👤 Benutzer hat bereits Passwort - zur Login-Seite weiterleiten')
        router.push(`/auth/login?email=${encodeURIComponent(email)}&token=${token}`)
        return
      }

      // Benutzer ohne Passwort - KEIN automatisches Passwort setzen!
      // Stattdessen direkt zur Willkommensseite weiterleiten
      console.log('🆕 Benutzer ohne Passwort - direkte Weiterleitung zur Willkommensseite')
      
      // Nur den Token weitergeben - Daten werden in WelcomePage aus der Datenbank geholt
      console.log('🔍 InviteAcceptPage - Weiterleitung mit Token:', token)
      router.push(`/welcome?token=${token}`)
      
    } catch (error) {
      console.error('Auto-Login Fehler:', error)
      // Fallback: Zur Login-Seite weiterleiten
      router.push(`/auth/login?email=${encodeURIComponent(email)}&token=${token}`)
    }
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