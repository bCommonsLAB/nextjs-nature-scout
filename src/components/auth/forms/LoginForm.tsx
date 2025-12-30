'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, Gift, RefreshCw } from 'lucide-react'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Dialog für Passwort-Aktualisierung
  const [showPasswordUpdateDialog, setShowPasswordUpdateDialog] = useState(false)
  
  // Neue States für Einladungs-Flow
  const [invitationData, setInvitationData] = useState<{
    name: string
    email: string
    inviterName: string
    organizationName?: string
  } | null>(null)
  const [isNewUser, setIsNewUser] = useState(false)
  const [showPasswordCreation, setShowPasswordCreation] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [invitationStatus, setInvitationStatus] = useState<'valid' | 'used' | 'expired' | 'invalid' | null>(null)
  
  const router = useRouter()
  
  // URL-Parameter verarbeiten
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const inviteToken = urlParams.get('invite')
    const token = urlParams.get('token')
    const emailParam = urlParams.get('email')
    const message = urlParams.get('message')
    
    // E-Mail aus URL-Parameter setzen (überschreibt Cookies)
    if (emailParam) {
      setEmail(emailParam)
    }
    
    // Einladungs-Token verarbeiten
    if (inviteToken) {
      handleInvitationToken(inviteToken)
    }
    
    // Token aus Einladung verarbeiten (für Benutzer mit Passwort)
    if (token && !inviteToken) {
      handleInvitationToken(token)
    }
    
    // Nachrichten anzeigen
    // Keine separate "invite_accepted" Nachricht mehr - wird durch Einladungs-Banner ersetzt
  }, [])

  // Einladungs-Token verarbeiten
  const handleInvitationToken = async (token: string) => {
    setIsLoading(true)
    setError('')
    setInvitationStatus(null)
    
    try {
      const response = await fetch(`/api/auth/invite/validate?token=${token}`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        // Gültige Einladung
        setInvitationStatus('valid')
        setInvitationData(data.invitation)
        setEmail(data.invitation.email)
        
        // Prüfen, ob Benutzer bereits ein Passwort hat
        console.log('🔍 Einladungs-Validierung - Benutzer hat Passwort:', data.user.hasPassword)
        if (!data.user.hasPassword) {
          // Neuer Benutzer ohne Passwort
          console.log('🆕 Neuer Benutzer ohne Passwort - Passwort-Erstellung aktiviert')
          setIsNewUser(true)
          setShowPasswordCreation(true)
        } else {
          console.log('👤 Bestehender Benutzer mit Passwort - Normale Anmeldung')
        }
      } else {
        // Einladung ist ungültig, verwendet oder abgelaufen
        const status = response.status
        if (status === 400) {
          // Bereits verwendet oder abgelaufen
          if (data.message?.includes('bereits verwendet')) {
            setInvitationStatus('used')
            setEmail(data.invitation?.email || '')
          } else if (data.message?.includes('abgelaufen')) {
            setInvitationStatus('expired')
          } else {
            setInvitationStatus('invalid')
          }
        } else {
          setInvitationStatus('invalid')
        }
      }
    } catch (error) {
      console.error('Einladungs-Validierung Fehler:', error)
      setInvitationStatus('invalid')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      if (showPasswordCreation) {
        // Passwort erstellen für neuen Benutzer
        await handlePasswordCreation()
      } else {
      // Normale Anmeldung
      const result = await signIn('credentials', {
        email,
        password,
          redirect: false
      })

        if (result?.ok) {
          router.push('/naturescout')
      } else {
          // Bei falschen Anmeldedaten zeigen wir zuerst den Dialog an
          setShowPasswordUpdateDialog(true)
          setError('E-Mail-Adresse oder Passwort ist falsch. Bitte versuchen Sie es erneut.')
        }
      }
    } catch (error) {
      console.error('Anmeldungsfehler:', error)
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordCreation = async () => {
    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }

    if (password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }

    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (response.ok) {
      // Passwort erfolgreich erstellt, jetzt anmelden
        const result = await signIn('credentials', {
        email,
        password,
          redirect: false
        })

        if (result?.ok) {
          router.push('/naturescout')
      } else {
          setError('Passwort erstellt, aber Anmeldung fehlgeschlagen. Bitte versuchen Sie sich anzumelden.')
        }
      } else {
      const data = await response.json()
        setError(data.message || 'Fehler beim Erstellen des Passworts.')
      }
    } catch (error) {
      console.error('Passwort-Erstellung Fehler:', error)
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAFFF3] to-[#D3E0BD] p-4">
      <Card className="w-full max-w-lg border-[#D3E0BD] bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-6">
            <div className="bg-[#D3E0BD] p-4 rounded-full">
              <CheckCircle className="h-10 w-10 text-[#637047]" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-[#2D3321] mb-3">
            Willkommen zurück!
          </CardTitle>
          <CardDescription className="text-lg text-[#637047]">
            Melden Sie sich mit Ihrer E-Mail-Adresse und Ihrem Passwort an
          </CardDescription>
        </CardHeader>

          {error && (
            <div className="px-6 mb-6">
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="text-base">
                  {error}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {success && (
            <div className="px-6 mb-6">
              <Alert className="border-[#D3E0BD] bg-[#FAFFF3]">
                <CheckCircle className="h-5 w-5 text-[#637047]" />
                <AlertDescription className="text-base text-[#2D3321]">
                  {success}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Einladungs-Status-Banner */}
          {invitationStatus === 'valid' && invitationData && (
            <div className="px-6 mb-6">
              <Alert className="border-[#D3E0BD] bg-[#FAFFF3]">
                <Gift className="h-5 w-5 text-[#637047]" />
                <AlertDescription className="text-base text-[#2D3321]">
                  <strong>Sie wurden eingeladen!</strong><br />
                  {invitationData.inviterName} hat Sie zu NatureScout eingeladen
                  {invitationData.organizationName && ` (${invitationData.organizationName})`}.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {invitationStatus === 'used' && (
            <div className="px-6 mb-6">
              <Alert className="border-[#D3E0BD] bg-[#FAFFF3]">
                <CheckCircle className="h-5 w-5 text-[#637047]" />
                <AlertDescription className="text-base text-[#2D3321]">
                  <strong>Einladung bereits verwendet</strong><br />
                  Sie haben diesen Einladungslink bereits verwendet. Melden Sie sich jetzt mit Ihrer E-Mail-Adresse an.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {invitationStatus === 'expired' && (
            <div className="px-6 mb-6">
              <Alert className="border-[#D3E0BD] bg-[#FAFFF3]">
                <AlertCircle className="h-5 w-5 text-[#637047]" />
                <AlertDescription className="text-base text-[#2D3321]">
                  <strong>Einladung abgelaufen</strong><br />
                  Diese Einladung ist leider abgelaufen. Kontaktieren Sie den Einladenden für eine neue Einladung.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {invitationStatus === 'invalid' && (
            <div className="px-6 mb-6">
              <Alert className="border-[#D3E0BD] bg-[#FAFFF3]">
                <AlertCircle className="h-5 w-5 text-[#637047]" />
                <AlertDescription className="text-base text-[#2D3321]">
                  <strong>Ungültiger Einladungslink</strong><br />
                  Der Einladungslink ist nicht gültig. Melden Sie sich mit Ihrer E-Mail-Adresse an oder kontaktieren Sie den Einladenden.
                </AlertDescription>
              </Alert>
            </div>
          )}

            <form onSubmit={handlePasswordSubmit}>
              <CardContent className="space-y-6">
                {/* E-Mail Eingabe */}
                <div className="space-y-3">
              <Label htmlFor="email" className="text-lg font-medium flex items-center gap-3 text-[#2D3321]">
                    <Mail className="h-5 w-5 text-[#637047]" />
                    Ihre E-Mail-Adresse
                  </Label>
                  <Input
                id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="beispiel@email.de"
                    required
                    className="h-14 text-lg border-[#D3E0BD] focus:border-[#637047] focus:ring-[#637047]"
                    autoComplete="email"
                  />
                  <p className="text-base text-[#637047]">
                    Die E-Mail-Adresse, die Sie bei der Registrierung verwendet haben.
                  </p>
                </div>

                {/* Passwort Eingabe */}
                <div className="space-y-3">
                  <Label htmlFor="password" className="text-lg font-medium flex items-center gap-3 text-[#2D3321]">
                    <Lock className="h-5 w-5 text-[#637047]" />
                    {showPasswordCreation ? 'Passwort erstellen' : 'Ihr Passwort'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={showPasswordCreation ? "Mindestens 8 Zeichen" : "Ihr Passwort eingeben"}
                      required
                      className="h-14 text-lg pr-14 border-[#D3E0BD] focus:border-[#637047] focus:ring-[#637047]"
                      autoComplete={showPasswordCreation ? "new-password" : "current-password"}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 p-0 text-[#637047] hover:bg-[#FAFFF3]"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-base text-[#637047]">
                    {showPasswordCreation 
                      ? 'Das Passwort muss mindestens 8 Zeichen lang sein. Verwenden Sie Buchstaben und Zahlen.'
                      : 'Klicken Sie auf das Auge-Symbol, um Ihr Passwort sichtbar zu machen.'
                    }
                  </p>
                </div>

                {/* Passwort bestätigen für neue Benutzer */}
                {showPasswordCreation && (
                  <div className="space-y-3">
                    <Label htmlFor="confirmPassword" className="text-lg font-medium flex items-center gap-3 text-[#2D3321]">
                      <CheckCircle className="h-5 w-5 text-[#637047]" />
                      Passwort bestätigen
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                    <p className="text-base text-[#637047]">
                      Geben Sie das gleiche Passwort nochmal ein, zur Sicherheit.
                    </p>
                  </div>
                )}

            {/* Links */}
            <div className="space-y-3 pt-2">
              <div className="text-center">
                  <Link 
                    href="/auth/forgot-password" 
                    className="text-[#637047] hover:text-[#2D3321] text-base underline font-medium"
                  >
                    Passwort vergessen?
                  </Link>
              </div>
              <div className="text-center">
                <Link 
                  href="/auth/code-login" 
                  className="text-[#637047] hover:text-[#2D3321] text-base underline font-medium"
                >
                  Mit Code anmelden
                </Link>
              </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4">
                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg bg-[#637047] hover:bg-[#2D3321] font-medium shadow-md"
                  disabled={isLoading}
                >
                  {isLoading ? 'Wird verarbeitet...' : (showPasswordCreation ? 'Passwort erstellen & anmelden' : 'Jetzt anmelden')}
                </Button>
              </CardFooter>
            </form>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-[#637047] text-base">
            Noch kein Konto?{' '}
            <Link href="/auth/register" className="text-[#637047] hover:text-[#2D3321] underline font-medium">
              Hier registrieren
            </Link>
          </p>
        </div>
      </Card>

      {/* Dialog für Passwort-Aktualisierung */}
      <Dialog open={showPasswordUpdateDialog} onOpenChange={setShowPasswordUpdateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="bg-[#D3E0BD] p-3 rounded-full">
                <RefreshCw className="h-8 w-8 text-[#637047]" />
              </div>
            </div>
            <DialogTitle className="text-xl font-bold text-[#2D3321] text-center">
              Authentifizierungssystem aktualisiert
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-center text-[#637047] space-y-3 pt-2">
                <p>
                  Wir haben das Authentifizierungssystem aktualisiert und es kann sein, 
                  dass alte Passwörter nicht mehr funktionieren.
                </p>
                <p>
                  Können Sie bitte mit "Passwort zurücksetzen" ein neues Passwort erstellen?
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col space-y-3 sm:space-y-0 sm:flex-row sm:space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowPasswordUpdateDialog(false)}
              className="w-full sm:w-auto border-[#D3E0BD] text-[#637047] hover:bg-[#FAFFF3]"
            >
              Erneut versuchen
            </Button>
            <Button
              onClick={() => {
                setShowPasswordUpdateDialog(false)
                router.push('/auth/forgot-password')
              }}
              className="w-full sm:w-auto bg-[#637047] hover:bg-[#2D3321]"
            >
              Passwort zurücksetzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 