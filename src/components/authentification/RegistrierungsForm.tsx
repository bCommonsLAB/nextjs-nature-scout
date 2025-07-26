'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, UserPlus, CheckCircle2, Gift, ArrowLeft } from 'lucide-react'

export function RegistrierungsForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const [invitationData, setInvitationData] = useState<{
    name: string
    email: string
    inviterName: string
    organizationName?: string
  } | null>(null)
  const [loadingInvitation, setLoadingInvitation] = useState(false)

  // Lade Einladungsdaten wenn Token vorhanden
  useEffect(() => {
    if (inviteToken) {
      setLoadingInvitation(true)
      fetch(`/api/auth/invite/validate?token=${inviteToken}`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            setInvitationData(data.invitation)
            setFormData(prev => ({
              ...prev,
              name: data.invitation.name,
              email: data.invitation.email
            }))
          } else {
            setError('Ungültiger oder abgelaufener Einladungslink.')
          }
        })
        .catch(() => {
          setError('Fehler beim Laden der Einladungsdaten.')
        })
        .finally(() => {
          setLoadingInvitation(false)
        })
    }
  }, [inviteToken])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('') // Fehler löschen bei Änderung
  }

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError('Bitte geben Sie Ihren Namen ein.')
      return false
    }
    if (!formData.email.trim()) {
      setError('Bitte geben Sie Ihre E-Mail-Adresse ein.')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Bitte geben Sie eine gültige E-Mail-Adresse ein.')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (formData.password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.')
      return false
    }
    if (!acceptTerms) {
      setError('Bitte bestätigen Sie, dass Sie unsere Nutzungsbedingungen akzeptieren.')
      return false
    }
    return true
  }

  const handleNextStep = () => {
    setError('')
    if (validateStep1()) {
      setStep(2)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!validateStep2()) return

    setIsLoading(true)

    try {
      // API-Aufruf zur Registrierung
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          inviteToken: inviteToken || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Registrierung fehlgeschlagen')
      }

      // Erfolgreich registriert - zur Anmeldung weiterleiten
      router.push('/authentification/anmelden?message=registered')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFFF3] to-[#E9F5DB] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg border-[#D3E0BD] bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-6">
            <div className="bg-[#D3E0BD] p-4 rounded-full">
              <UserPlus className="h-10 w-10 text-[#637047]" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-[#2D3321] mb-3">
            {invitationData ? 'Einladung annehmen' : 'Registrierung'}
          </CardTitle>
          <CardDescription className="text-lg text-[#637047]">
            {step === 1 ? 'Schritt 1 von 2' : 'Schritt 2 von 2'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription className="text-base">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Einladungs-Banner */}
          {invitationData && (
            <Alert className="border-[#D3E0BD] bg-[#FAFFF3]">
              <Gift className="h-5 w-5 text-[#637047]" />
              <AlertDescription className="text-base text-[#2D3321]">
                <strong>Sie wurden eingeladen!</strong><br />
                {invitationData.inviterName} hat Sie zu NatureScout eingeladen
                {invitationData.organizationName && ` (${invitationData.organizationName})`}.
              </AlertDescription>
            </Alert>
          )}

          {loadingInvitation && (
            <Alert className="border-[#D3E0BD] bg-[#FAFFF3]">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#637047] mr-2"></div>
              <AlertDescription className="text-base text-[#2D3321]">
                Lade Einladungsdaten...
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNextStep(); } : handleSubmit}>
            {step === 1 && (
              <div className="space-y-6">
                {/* Name */}
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-lg font-medium flex items-center gap-3 text-[#2D3321]">
                    <User className="h-5 w-5 text-[#637047]" />
                    Ihr Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Max Mustermann"
                    required
                    className="h-14 text-lg border-[#D3E0BD] focus:border-[#637047] focus:ring-[#637047]"
                    autoComplete="name"
                    disabled={!!invitationData}
                  />
                  <p className="text-base text-[#637047]">
                    Geben Sie Ihren vollständigen Namen ein, wie er angezeigt werden soll.
                  </p>
                </div>

                {/* E-Mail */}
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-lg font-medium flex items-center gap-3 text-[#2D3321]">
                    <Mail className="h-5 w-5 text-[#637047]" />
                    Ihre E-Mail-Adresse
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="max@beispiel.de"
                    required
                    className="h-14 text-lg border-[#D3E0BD] focus:border-[#637047] focus:ring-[#637047]"
                    autoComplete="email"
                    disabled={!!invitationData}
                  />
                  <p className="text-base text-[#637047]">
                    Diese E-Mail-Adresse verwenden Sie später für die Anmeldung.
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                {/* Passwort */}
                <div className="space-y-3">
                  <Label htmlFor="password" className="text-lg font-medium flex items-center gap-3 text-[#2D3321]">
                    <Lock className="h-5 w-5 text-[#637047]" />
                    Passwort erstellen
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Mindestens 8 Zeichen"
                      required
                      className="h-14 text-lg pr-14 border-[#D3E0BD] focus:border-[#637047] focus:ring-[#637047]"
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 p-0 text-[#637047] hover:bg-[#FAFFF3]"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                  </div>
                  <p className="text-base text-[#637047]">
                    Das Passwort muss mindestens 8 Zeichen lang sein. Verwenden Sie Buchstaben und Zahlen.
                  </p>
                </div>

                {/* Passwort bestätigen */}
                <div className="space-y-3">
                  <Label htmlFor="confirmPassword" className="text-lg font-medium flex items-center gap-3 text-[#2D3321]">
                    <CheckCircle2 className="h-5 w-5 text-[#637047]" />
                    Passwort bestätigen
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Passwort erneut eingeben"
                      required
                      className="h-14 text-lg pr-14 border-[#D3E0BD] focus:border-[#637047] focus:ring-[#637047]"
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 p-0 text-[#637047] hover:bg-[#FAFFF3]"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                  </div>
                  <p className="text-base text-[#637047]">
                    Geben Sie das gleiche Passwort nochmal ein, zur Sicherheit.
                  </p>
                </div>

                {/* Zustimmung */}
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      id="terms" 
                      checked={acceptTerms}
                      onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                      className="mt-1"
                    />
                    <Label htmlFor="terms" className="text-base leading-relaxed text-[#2D3321]">
                      Ich akzeptiere die{' '}
                      <Link href="/nutzungsbedingungen" className="text-[#637047] hover:text-[#2D3321] underline">
                        Nutzungsbedingungen
                      </Link>
                      {' '}und{' '}
                      <Link href="/datenschutz" className="text-[#637047] hover:text-[#2D3321] underline">
                        Datenschutzerklärung
                      </Link>
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <CardFooter className="flex flex-col space-y-4 pt-6">
              {step === 1 ? (
                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg bg-[#637047] hover:bg-[#2D3321] font-medium shadow-md"
                >
                  Weiter
                </Button>
              ) : (
                <div className="space-y-4">
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg bg-[#637047] hover:bg-[#2D3321] font-medium shadow-md"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Registrierung läuft...
                      </>
                    ) : (
                      'Registrierung abschließen'
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost"
                    className="w-full h-14 text-lg border-[#D3E0BD] hover:bg-[#FAFFF3] text-[#2D3321]"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Zurück
                  </Button>
                </div>
              )}
            </CardFooter>
          </form>
        </CardContent>

        {/* Registrierung Link */}
        <div className="px-6 pb-6">
          <div className="text-center text-base text-[#637047] border-t border-[#D3E0BD] pt-6">
            <span>Bereits ein Konto? </span>
            <Link 
              href="/authentification/anmelden" 
              className="text-[#637047] hover:text-[#2D3321] underline font-medium"
            >
              Hier anmelden
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
} 