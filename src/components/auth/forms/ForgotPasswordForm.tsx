'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, ArrowLeft, Send, CheckCircle, AlertCircle, HelpCircle, ChevronDown, ChevronUp, Key, Lock } from 'lucide-react'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Fehler beim Senden der E-Mail')
      }

      setSuccess(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten.')
    } finally {
      setIsLoading(false)
    }
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
              E-Mail wurde gesendet!
            </CardTitle>
            <CardDescription className="text-lg text-[#637047]">
              Prüfen Sie Ihr E-Mail-Postfach für weitere Anweisungen.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="border-[#D3E0BD] bg-[#FAFFF3]">
              <Mail className="h-5 w-5 text-[#637047]" />
              <AlertDescription className="text-base text-[#2D3321]">
                Falls diese Email-Adresse <strong>{email}</strong> registriert ist, haben wir eine E-Mail an sie gesendet. 
                Klicken Sie auf den Link in der E-Mail, um Ihr Passwort zurückzusetzen.
              </AlertDescription>
            </Alert>

            <div className="bg-[#FAFFF3] p-4 rounded-lg border border-[#D3E0BD]">
              <h4 className="font-medium text-[#2D3321] mb-3 flex items-center gap-2">
                <Key className="h-4 w-4 text-[#637047]" />
                Was passiert jetzt?
              </h4>
              <ul className="text-sm text-[#637047] space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-[#637047] rounded-full mt-2 flex-shrink-0"></span>
                  <span>Öffnen Sie Ihr E-Mail-Programm</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-[#637047] rounded-full mt-2 flex-shrink-0"></span>
                  <span>Suchen Sie nach einer E-Mail von NatureScout</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-[#637047] rounded-full mt-2 flex-shrink-0"></span>
                  <span>Klicken Sie auf den Link in der E-Mail</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-[#637047] rounded-full mt-2 flex-shrink-0"></span>
                  <span>Erstellen Sie ein neues Passwort</span>
                </li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
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
            Passwort zurücksetzen
          </CardTitle>
          <CardDescription className="text-lg text-[#637047]">
            Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen Link zum Zurücksetzen.
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
                Geben Sie die E-Mail-Adresse ein, mit der Sie sich registriert haben.
              </p>
            </div>

            {/* Wichtiger Hinweis */}
            <div className="bg-[#FAFFF3] p-4 rounded-lg border border-[#D3E0BD]">
              <h4 className="font-medium text-[#2D3321] mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#637047]" />
                Wichtiger Hinweis:
              </h4>
              <p className="text-sm text-[#637047]">
                Der Link zum Zurücksetzen ist nur 1 Stunde gültig. 
                Falls Sie keine E-Mail erhalten, prüfen Sie auch Ihren Spam-Ordner.
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
                  E-Mail wird gesendet...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Passwort-Link senden
                </>
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
                      <p>Wenn Sie Ihr Passwort vergessen haben, können Sie es über diesen Weg zurücksetzen:</p>
                      <ol className="list-decimal list-inside ml-2 space-y-1">
                        <li>E-Mail-Adresse eingeben</li>
                        <li>Link per E-Mail erhalten</li>
                        <li>Neues Passwort erstellen</li>
                        <li>Mit neuem Passwort anmelden</li>
                      </ol>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-[#2D3321] mb-2">Häufige Probleme</h5>
                    <div className="text-sm text-[#637047] space-y-2">
                      <p><strong>E-Mail nicht erhalten?</strong> Prüfen Sie Ihren Spam-Ordner oder warten Sie einige Minuten.</p>
                      <p><strong>Link abgelaufen?</strong> Der Link ist nur 1 Stunde gültig. Fordern Sie einen neuen an.</p>
                      <p><strong>Falsche E-Mail-Adresse?</strong> Verwenden Sie die gleiche Adresse wie bei der Registrierung.</p>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-[#2D3321] mb-2">Alternative Anmeldung</h5>
                    <p className="text-sm text-[#637047]">
                      Falls Sie Probleme mit dem Passwort-Reset haben, können Sie auch die <strong>Code-Anmeldung</strong> verwenden, 
                      falls Sie sich an Ihre E-Mail-Adresse erinnern.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#D3E0BD]">
                    <h5 className="font-medium text-[#2D3321] mb-2">Weitere Hilfe benötigt?</h5>
                    <p className="text-sm text-[#637047]">
                      Falls Sie Ihre E-Mail-Adresse vergessen haben oder andere Probleme auftreten, 
                      können Sie uns gerne kontaktieren. Wir helfen Ihnen gerne weiter.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Registrierung Link */}
        <div className="px-6 pb-6">
          <div className="text-center text-base text-[#637047] border-t border-[#D3E0BD] pt-6">
            <span>Noch kein Konto? </span>
            <Link 
              href="/auth/register" 
              className="text-[#637047] hover:text-[#2D3321] underline font-medium"
            >
              Hier registrieren
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
} 