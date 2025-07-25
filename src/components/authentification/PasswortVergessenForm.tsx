'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, ArrowLeft, Send, CheckCircle, AlertCircle } from 'lucide-react'

export function PasswortVergessenForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              E-Mail wurde gesendet!
            </CardTitle>
            <CardDescription className="text-base text-gray-600">
              Prüfen Sie Ihr E-Mail-Postfach für weitere Anweisungen.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Wir haben eine E-Mail an <strong>{email}</strong> gesendet. 
                Klicken Sie auf den Link in der E-Mail, um Ihr Passwort zurückzusetzen.
              </AlertDescription>
            </Alert>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Was passiert jetzt?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Öffnen Sie Ihr E-Mail-Programm</li>
                <li>• Suchen Sie nach einer E-Mail von NatureScout</li>
                <li>• Klicken Sie auf den Link in der E-Mail</li>
                <li>• Erstellen Sie ein neues Passwort</li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Link href="/authentification/anmelden" className="w-full">
              <Button variant="outline" className="w-full h-12 text-base">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück zur Anmeldung
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-orange-100 p-3 rounded-full">
              <Send className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Passwort zurücksetzen
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen Link zum Zurücksetzen.
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
                Geben Sie die E-Mail-Adresse ein, mit der Sie sich registriert haben.
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-900 mb-2">Wichtiger Hinweis:</h4>
              <p className="text-sm text-yellow-800">
                Der Link zum Zurücksetzen ist nur 1 Stunde gültig. 
                Falls Sie keine E-Mail erhalten, prüfen Sie auch Ihren Spam-Ordner.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full h-12 text-base bg-orange-600 hover:bg-orange-700"
              disabled={isLoading}
            >
              {isLoading ? 'E-Mail wird gesendet...' : 'Passwort-Link senden'}
            </Button>

            <Link href="/authentification/anmelden" className="w-full">
              <Button variant="outline" className="w-full h-12 text-base">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück zur Anmeldung
              </Button>
            </Link>
          </CardFooter>
        </form>

        {/* Hilfetext */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Weitere Hilfe</h4>
            <p className="text-sm text-blue-800">
              Falls Sie Ihre E-Mail-Adresse vergessen haben oder andere Probleme auftreten, 
              können Sie uns gerne kontaktieren.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
} 