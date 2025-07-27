'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, ArrowLeft, HelpCircle, ChevronDown, ChevronUp, Key } from 'lucide-react'

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [token, setToken] = useState('')
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
      // Token validieren
      validateToken(tokenParam)
    } else {
      setError('Ungültiger Link. Token fehlt.')
      setTokenValid(false)
    }
  }, [searchParams])

  const validateToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/validate-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      if (response.ok) {
        setTokenValid(true)
      } else {
        setTokenValid(false)
        setError('Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.')
      }
    } catch (error) {
      setTokenValid(false)
      setError('Fehler beim Überprüfen des Links.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validierung
    if (password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Fehler beim Zurücksetzen des Passworts')
      }

      setSuccess(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten.')
    } finally {
      setIsLoading(false)
    }
  }

  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFFF3] to-[#E9F5DB] flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg border-[#D3E0BD] bg-white/90 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#637047] mx-auto"></div>
              <p className="mt-4 text-[#637047]">Überprüfe Link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFFF3] to-[#E9F5DB] flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg border-[#D3E0BD] bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-6">
              <div className="bg-[#D3E0BD] p-4 rounded-full">
                <CheckCircle className="h-10 w-10 text-[#637047]" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-[#2D3321] mb-3">
              Passwort erfolgreich geändert!
            </CardTitle>
            <CardDescription className="text-lg text-[#637047]">
              Ihr Passwort wurde erfolgreich zurückgesetzt. Sie können sich jetzt anmelden.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="border-[#D3E0BD] bg-[#FAFFF3]">
              <CheckCircle className="h-5 w-5 text-[#637047]" />
              <AlertDescription className="text-base text-[#2D3321]">
                Ihr neues Passwort ist jetzt aktiv. Sie können sich mit Ihrer E-Mail-Adresse und dem neuen Passwort anmelden.
              </AlertDescription>
            </Alert>

            <div className="bg-[#FAFFF3] p-4 rounded-lg border border-[#D3E0BD]">
              <h4 className="font-medium text-[#2D3321] mb-3 flex items-center gap-2">
                <Key className="h-4 w-4 text-[#637047]" />
                Nächste Schritte:
              </h4>
              <ul className="text-sm text-[#637047] space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-[#637047] rounded-full mt-2 flex-shrink-0"></span>
                  <span>Gehen Sie zur Anmeldeseite</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-[#637047] rounded-full mt-2 flex-shrink-0"></span>
                  <span>Geben Sie Ihre E-Mail-Adresse ein</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-[#637047] rounded-full mt-2 flex-shrink-0"></span>
                  <span>Verwenden Sie Ihr neues Passwort</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-[#637047] rounded-full mt-2 flex-shrink-0"></span>
                  <span>Sie sind angemeldet!</span>
                </li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Link href="/auth/login" className="w-full">
              <Button className="w-full h-14 text-lg bg-[#637047] hover:bg-[#2D3321] font-medium shadow-md">
                Jetzt anmelden
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!tokenValid) {
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
              Ungültiger Link
            </CardTitle>
            <CardDescription className="text-lg text-[#637047]">
              Der Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription className="text-base">
                {error}
              </AlertDescription>
            </Alert>

            <div className="bg-[#FAFFF3] p-4 rounded-lg border border-[#D3E0BD]">
              <h4 className="font-medium text-[#2D3321] mb-2">Was können Sie tun?</h4>
              <div className="text-sm text-[#637047] space-y-2">
                <p><strong>Neuen Link anfordern:</strong> Gehen Sie zur Passwort-vergessen-Seite und fordern Sie einen neuen Link an.</p>
                <p><strong>Code-Anmeldung:</strong> Falls Sie sich an Ihre E-Mail-Adresse erinnern, können Sie auch die Code-Anmeldung verwenden.</p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Link href="/auth/forgot-password" className="w-full">
              <Button className="w-full h-14 text-lg bg-[#637047] hover:bg-[#2D3321] font-medium shadow-md">
                Neuen Link anfordern
              </Button>
            </Link>
            <Link href="/auth/login" className="w-full">
              <Button variant="outline" className="w-full h-14 text-lg border-[#D3E0BD] hover:bg-[#FAFFF3] text-[#2D3321]">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Zurück zur Anmeldung
              </Button>
            </Link>
          </CardFooter>
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
              <Lock className="h-10 w-10 text-[#637047]" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-[#2D3321] mb-3">
            Neues Passwort erstellen
          </CardTitle>
          <CardDescription className="text-lg text-[#637047]">
            Erstellen Sie ein neues Passwort für Ihr Konto. Es muss mindestens 8 Zeichen lang sein.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="text-base">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Neues Passwort */}
            <div className="space-y-3">
              <Label htmlFor="password" className="text-lg font-medium flex items-center gap-3 text-[#2D3321]">
                <Lock className="h-5 w-5 text-[#637047]" />
                Neues Passwort
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
              <p className="text-base text-[#637047]">
                Geben Sie das gleiche Passwort nochmal ein, zur Sicherheit.
              </p>
            </div>

            {/* Wichtiger Hinweis */}
            <div className="bg-[#FAFFF3] p-4 rounded-lg border border-[#D3E0BD]">
              <h4 className="font-medium text-[#2D3321] mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#637047]" />
                Wichtiger Hinweis:
              </h4>
              <p className="text-sm text-[#637047]">
                Nach dem Zurücksetzen des Passworts können Sie sich mit Ihrer E-Mail-Adresse und dem neuen Passwort anmelden.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full h-14 text-lg bg-[#637047] hover:bg-[#2D3321] font-medium shadow-md"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Passwort wird gesetzt...
                </>
              ) : (
                'Neues Passwort setzen'
              )}
            </Button>

            <Link href="/auth/login" className="w-full">
              <Button variant="outline" className="w-full h-14 text-lg border-[#D3E0BD] hover:bg-[#FAFFF3] text-[#2D3321]">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Zurück zur Anmeldung
              </Button>
            </Link>
          </CardFooter>
        </form>

        {/* Aufklappbares Hilfe-Panel */}
        <div className="px-6 pb-6">
          <div className="border border-[#D3E0BD] rounded-md overflow-hidden">
            <div 
              className="flex justify-between items-center p-4 cursor-pointer bg-[#FAFFF3] hover:bg-[#E9F5DB]"
              onClick={() => setShowHelp(!showHelp)}
            >
              <span className="font-semibold text-[#2D3321] flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-[#637047]" />
                Hilfe & Informationen
              </span>
              <span className="transition">
                {showHelp ? <ChevronUp className="h-5 w-5 text-[#637047]" /> : <ChevronDown className="h-5 w-5 text-[#637047]" />}
              </span>
            </div>
            
            {showHelp && (
              <div className="p-4 border-t border-[#D3E0BD] bg-white">
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-[#2D3321] mb-2 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-[#637047]" />
                      Passwort zurücksetzen
                    </h5>
                    <div className="text-sm text-[#637047] space-y-2">
                      <p>Sie sind dabei, Ihr Passwort zurückzusetzen. Folgen Sie diesen Schritten:</p>
                      <ol className="list-decimal list-inside ml-2 space-y-1">
                        <li>Erstellen Sie ein sicheres Passwort (mindestens 8 Zeichen)</li>
                        <li>Bestätigen Sie das Passwort</li>
                        <li>Klicken Sie auf "Neues Passwort setzen"</li>
                        <li>Melden Sie sich mit dem neuen Passwort an</li>
                      </ol>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-[#2D3321] mb-2">Sicherheitshinweise</h5>
                    <div className="text-sm text-[#637047] space-y-2">
                      <p><strong>Starkes Passwort:</strong> Verwenden Sie mindestens 8 Zeichen mit Buchstaben und Zahlen.</p>
                      <p><strong>Einzigartig:</strong> Verwenden Sie ein Passwort, das Sie nirgendwo anders nutzen.</p>
                      <p><strong>Sicher aufbewahren:</strong> Notieren Sie sich das neue Passwort an einem sicheren Ort.</p>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-[#2D3321] mb-2">Nach dem Reset</h5>
                    <p className="text-sm text-[#637047]">
                      Nach dem erfolgreichen Zurücksetzen können Sie sich mit Ihrer E-Mail-Adresse und dem neuen Passwort anmelden. 
                      Das alte Passwort ist nicht mehr gültig.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#D3E0BD]">
                    <h5 className="font-medium text-[#2D3321] mb-2">Probleme?</h5>
                    <p className="text-sm text-[#637047]">
                      Falls Sie Probleme haben, können Sie einen neuen Reset-Link anfordern oder uns kontaktieren.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
} 