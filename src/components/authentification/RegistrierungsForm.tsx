'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, UserPlus, CheckCircle2 } from 'lucide-react'

export function RegistrierungsForm() {
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
  const router = useRouter()

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
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <UserPlus className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Bei NatureScout registrieren
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            Schritt {step} von 2: {step === 1 ? 'Persönliche Daten' : 'Passwort erstellen'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNextStep(); } : handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {step === 1 && (
              <>
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Ihr Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Max Mustermann"
                    required
                    className="h-12 text-base"
                    autoComplete="name"
                  />
                  <p className="text-sm text-gray-500">
                    Geben Sie Ihren vollständigen Namen ein, wie er angezeigt werden soll.
                  </p>
                </div>

                {/* E-Mail */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Ihre E-Mail-Adresse
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="max@beispiel.de"
                    required
                    className="h-12 text-base"
                    autoComplete="email"
                  />
                  <p className="text-sm text-gray-500">
                    Diese E-Mail-Adresse verwenden Sie später für die Anmeldung.
                  </p>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                {/* Passwort */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
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
                      className="h-12 text-base pr-12"
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Das Passwort muss mindestens 8 Zeichen lang sein. Verwenden Sie Buchstaben und Zahlen.
                  </p>
                </div>

                {/* Passwort bestätigen */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-base font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
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
                      className="h-12 text-base pr-12"
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Geben Sie das gleiche Passwort nochmal ein, zur Sicherheit.
                  </p>
                </div>

                {/* Zustimmung */}
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      id="terms" 
                      checked={acceptTerms}
                      onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                    />
                    <Label htmlFor="terms" className="text-sm leading-relaxed">
                      Ich akzeptiere die Nutzungsbedingungen und bin damit einverstanden, 
                      dass meine Daten zur Nutzung von NatureScout gespeichert werden.
                    </Label>
                  </div>
                </div>
              </>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            {step === 1 ? (
              <Button 
                type="submit" 
                className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
              >
                Weiter zu Schritt 2
              </Button>
            ) : (
              <div className="w-full space-y-3">
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Wird registriert...' : 'Registrierung abschließen'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  className="w-full h-12 text-base"
                  onClick={() => setStep(1)}
                >
                  Zurück zu Schritt 1
                </Button>
              </div>
            )}

            <div className="text-center text-sm text-gray-600">
              <span>Bereits ein Konto? </span>
              <Link 
                href="/authentification/anmelden" 
                className="text-green-600 hover:text-green-700 underline font-medium"
              >
                Hier anmelden
              </Link>
            </div>
          </CardFooter>
        </form>

        {/* Hilfetext */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Was passiert nach der Registrierung?</h4>
            <p className="text-sm text-blue-800">
              Sie erhalten eine Willkommens-E-Mail und können sich sofort anmelden. 
              Ihre Daten werden sicher gespeichert.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
} 