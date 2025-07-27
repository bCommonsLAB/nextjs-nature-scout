'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
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

  useEffect(() => {
    // Einladungsdaten aus URL-Parametern oder Session holen
    const urlParams = new URLSearchParams(window.location.search)
    const inviteToken = urlParams.get('invite')
    
    if (inviteToken && session?.user) {
      // Einladungsdaten aus der Session oder localStorage holen
      const storedInvitation = localStorage.getItem('invitationData')
      if (storedInvitation) {
        try {
          setInvitationData(JSON.parse(storedInvitation))
        } catch (error) {
          console.error('Fehler beim Parsen der Einladungsdaten:', error)
        }
      }
    }
  }, [session])

  const handleStartNow = () => {
    // Einladungsdaten löschen
    localStorage.removeItem('invitationData')
    // Zur Hauptseite weiterleiten
    router.push('/naturescout')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFFF3] to-[#E9F5DB] flex items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#637047] mx-auto"></div>
          <p className="mt-4 text-[#637047]">Lade...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    router.push('/auth/login')
    return null
  }

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
                <div>
                  <h4 className="font-medium text-[#2D3321]">Mit Passwort</h4>
                  <p className="text-[#637047] text-sm">
                    Erstellen Sie ein persönliches Passwort für einfache Anmeldung über die Login-Seite.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-[#D3E0BD] p-2 rounded-full mt-0.5">
                  <Smartphone className="h-4 w-4 text-[#637047]" />
                </div>
                <div>
                  <h4 className="font-medium text-[#2D3321]">Mit Code</h4>
                  <p className="text-[#637047] text-sm">
                    Lassen Sie sich einen 6-stelligen Code per E-Mail zusenden - sicher und ohne Passwort.
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
          <div className="text-center pt-4">
            <Button 
              onClick={handleStartNow}
              className="h-16 text-xl bg-[#637047] hover:bg-[#2D3321] font-semibold shadow-lg px-8"
            >
              <ArrowRight className="h-6 w-6 mr-3" />
              Jetzt sofort loslegen!
            </Button>
            <p className="text-[#637047] text-sm mt-3">
              Sie können jederzeit über das Menü zu Ihren Anmeldeoptionen gelangen
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 