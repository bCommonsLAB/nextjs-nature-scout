'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'

export function AnmeldeForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('E-Mail oder Passwort sind nicht korrekt. Bitte prüfen Sie Ihre Eingaben.')
      } else {
        // Erfolgreiche Anmeldung
        router.push('/naturescout')
        router.refresh()
      }
    } catch (error) {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Willkommen zurück!
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            Melden Sie sich mit Ihrer E-Mail-Adresse an, um NatureScout zu nutzen.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* E-Mail Eingabe */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Ihre E-Mail-Adresse
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="beispiel@email.de"
                required
                className="h-12 text-base"
                autoComplete="email"
              />
              <p className="text-sm text-gray-500">
                Die gleiche E-Mail-Adresse, die Sie bei der Registrierung verwendet haben.
              </p>
            </div>

            {/* Passwort Eingabe */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Ihr Passwort
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ihr Passwort eingeben"
                  required
                  className="h-12 text-base pr-12"
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                Klicken Sie auf das Auge-Symbol, um Ihr Passwort sichtbar zu machen.
              </p>
            </div>

            {/* Passwort vergessen Link */}
            <div className="text-center">
              <Link 
                href="/authentification/passwort-vergessen" 
                className="text-green-600 hover:text-green-700 text-sm underline"
              >
                Passwort vergessen? Hier klicken zum Zurücksetzen
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? 'Wird angemeldet...' : 'Jetzt anmelden'}
            </Button>

            <div className="text-center text-sm text-gray-600">
              <span>Noch kein Konto? </span>
              <Link 
                href="/authentification/registrieren" 
                className="text-green-600 hover:text-green-700 underline font-medium"
              >
                Hier registrieren
              </Link>
            </div>
          </CardFooter>
        </form>

        {/* Hilfetext */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Hilfe benötigt?</h4>
            <p className="text-sm text-blue-800">
              Falls Sie Probleme haben, können Sie uns gerne kontaktieren. 
              Wir helfen Ihnen gerne weiter.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
} 