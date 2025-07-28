'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, ArrowRight, Key, Smartphone, Gift, Info } from 'lucide-react'

export default function WelcomePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [invitationData, setInvitationData] = useState<{
    name: string
    email: string
    inviterName: string
    organizationName?: string
  } | null>(null)
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(false)
  const [hasToken, setHasToken] = useState(false)

  console.log('🔍 WelcomePage - Status:', status, 'Session:', !!session?.user, 'InvitationData:', !!invitationData)

  useEffect(() => {
    console.log('🔍 WelcomePage useEffect - Start')
    // Token aus URL-Parametern holen
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    
    console.log('🔍 WelcomePage - URL Params:', { token })
    
    if (token) {
      setHasToken(true)
      // Einladungsdaten aus der Datenbank mit Token holen
      fetchInvitationData(token)
    } else {
      console.log('🔍 WelcomePage - Kein Token in URL')
    }
  }, [])

  const fetchInvitationData = async (token: string) => {
    try {
      setIsLoadingInvitation(true)
      console.log('🔍 WelcomePage - Hole Einladungsdaten für Token:', token)
      const response = await fetch(`/api/auth/invite/validate?token=${token}`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        console.log('🔍 WelcomePage - Einladungsdaten erhalten:', data.invitation)
        setInvitationData(data.invitation)
      } else {
        console.log('🔍 WelcomePage - Fehler beim Laden der Einladungsdaten:', data.message)
      }
    } catch (error) {
      console.error('🔍 WelcomePage - Fehler beim API-Call:', error)
    } finally {
      setIsLoadingInvitation(false)
    }
  }

  // Separater useEffect für Navigation
  useEffect(() => {
    console.log('🔍 WelcomePage - Navigation useEffect:', { status, invitationData })
    // KEINE automatische Weiterleitung mehr - Willkommensseite ist für nicht angemeldete Benutzer
    // Die Benutzer können selbst entscheiden, ob sie sich anmelden möchten
  }, [status, invitationData, router])

  // KEINE Fallback-Navigation mehr - wenn Token vorhanden ist, warten wir auf die Daten
  // Nur zur Login-Seite weiterleiten, wenn weder Token noch Einladungsdaten vorhanden sind

  const handleStartNow = async () => {
    console.log('🔍 WelcomePage - handleStartNow aufgerufen')
    
    // Token aus URL holen
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    
    if (!token) {
      console.log('🔍 WelcomePage - Kein Token vorhanden, direkte Weiterleitung')
      router.push('/naturescout')
      return
    }

    try {
      console.log('🔍 WelcomePage - Automatische Anmeldung mit Token:', token)
      
      // NextAuth signIn mit Token
      const result = await signIn('credentials', {
        token: token,
        loginType: 'invite',
        redirect: false
      })

      if (result?.ok) {
        console.log('🔍 WelcomePage - Automatische Anmeldung erfolgreich')
        // Weiterleitung zur Hauptseite
        router.push('/naturescout')
      } else {
        console.log('🔍 WelcomePage - Automatische Anmeldung fehlgeschlagen:', result?.error)
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('🔍 WelcomePage - Fehler bei automatischer Anmeldung:', error)
      router.push('/auth/login')
    }
  }

  if (status === 'loading' || isLoadingInvitation) {
    console.log('🔍 WelcomePage - Loading State')
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFFF3] to-[#E9F5DB] flex items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#637047] mx-auto"></div>
          <p className="mt-4 text-[#637047]">
            {isLoadingInvitation ? 'Lade Einladungsdaten...' : 'Lade...'}
          </p>
        </div>
      </div>
    )
  }

  // Nur zur Login-Seite weiterleiten, wenn keine Einladung vorhanden ist
  // Willkommensseite wird auch für nicht angemeldete Benutzer angezeigt, wenn Einladungsdaten vorhanden sind
  // ODER wenn ein Token in der URL vorhanden ist (Daten werden noch geladen)
  if (!invitationData && !hasToken) {
    console.log('🔍 WelcomePage - Keine Einladungsdaten und kein Token, return null')
    return null
  }

  console.log('🔍 WelcomePage - Rendering Willkommensseite (hasToken:', hasToken, ', invitationData:', !!invitationData, ')')

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFFF3] to-[#E9F5DB] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-2xl border-[#D3E0BD] bg-white/90 backdrop-blur-sm">
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
            Ihre Einladung wurde erfolgreich angenommen
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Einladungs-Bestätigung */}
          {invitationData && (
            <Alert className="border-[#D3E0BD] bg-[#FAFFF3]">
              <CheckCircle className="h-5 w-5 text-[#637047]" />
              <AlertDescription className="text-base text-[#2D3321]">
                <strong>Einladung angenommen!</strong><br />
                {invitationData.inviterName} hat Sie zu NatureScout eingeladen
                {invitationData.organizationName && ` (${invitationData.organizationName})`}.
              </AlertDescription>
            </Alert>
          )}

          {/* Informationsbereich */}
          <div className="bg-[#FAFFF3] p-6 rounded-lg border border-[#D3E0BD]">
            <div className="flex items-start gap-3 mb-4">
              <Info className="h-5 w-5 text-[#637047] mt-0.5" />
              <h3 className="text-lg font-semibold text-[#2D3321]">
                So können Sie sich in Zukunft anmelden
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-[#D3E0BD] p-2 rounded-full mt-0.5">
                  <Key className="h-4 w-4 text-[#637047]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-[#2D3321]">Mit Passwort</h4>
                  <p className="text-[#637047] text-sm mb-2">
                    Erstellen Sie ein persönliches Passwort für einfache Anmeldung über die Login-Seite.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push(`/auth/reset-password?email=${encodeURIComponent(invitationData?.email || '')}&invite=true`)}
                    className="text-[#637047] border-[#D3E0BD] hover:bg-[#D3E0BD] hover:text-[#2D3321]"
                  >
                    <Key className="h-3 w-3 mr-1" />
                    Passwort erstellen
                  </Button>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-[#D3E0BD] p-2 rounded-full mt-0.5">
                  <Smartphone className="h-4 w-4 text-[#637047]" />
                </div>
                <div>
                  <h4 className="font-medium text-[#2D3321]">Mit Code</h4>
                  <p className="text-[#637047] text-sm">
                    Lassen Sie sich über die Login-Seite einen 6-stelligen Code per E-Mail zusenden - sicher und ohne Passwort.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-[#D3E0BD] p-2 rounded-full mt-0.5">
                  <Gift className="h-4 w-4 text-[#637047]" />
                </div>
                <div>
                  <h4 className="font-medium text-[#2D3321]">Mit Einladungslink</h4>
                  <p className="text-[#637047] text-sm">
                    Verwenden Sie diesen Einladungslink jederzeit für direkten Zugang zu NatureScout.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Prominenter Button */}
          <div className="text-center pt-4 space-y-4">
            <Button 
              onClick={handleStartNow}
              className="h-16 text-xl bg-[#637047] hover:bg-[#2D3321] font-semibold shadow-lg px-8"
            >
              <ArrowRight className="h-6 w-6 mr-3" />
              Jetzt sofort loslegen!
            </Button>
            
            {!session?.user && (
              <Button 
                variant="outline"
                onClick={() => router.push(`/auth/login?email=${encodeURIComponent(invitationData?.email || '')}&message=invite_accepted`)}
                className="h-12 text-lg border-[#D3E0BD] hover:bg-[#D3E0BD] hover:text-[#2D3321]"
              >
                <Key className="h-4 w-4 mr-2" />
                Jetzt anmelden
              </Button>
            )}
            
            <p className="text-[#637047] text-sm mt-3">
              Sie können jederzeit über das Menü zu Ihren Anmeldeoptionen gelangen
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 