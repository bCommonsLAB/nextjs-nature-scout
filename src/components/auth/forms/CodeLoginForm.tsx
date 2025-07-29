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
import { Mail, Key, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { LoginCodeService } from '@/lib/services/login-code-service'

export default function CodeLoginForm() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [codeStep, setCodeStep] = useState<'email' | 'code'>('email')
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  const router = useRouter()

  // Code-Eingabe verarbeiten
  const handleCodeChange = useCallback((index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1)
    }
    
    const newCode = code.split('')
    newCode[index] = value
    const newCodeString = newCode.join('')
    setCode(newCodeString)

    // Automatisch zum nächsten Feld wechseln
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }, [code])

  // Zurück zum vorherigen Feld
  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }, [code])

  // Code anfordern
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (response.ok) {
        setSuccess('Ein 6-stelliger Code wurde an Ihre E-Mail-Adresse gesendet.')
        setCodeStep('code')
        setCode('')
        inputRefs.current = new Array(6).fill(null)
        setResendCooldown(60) // 60 Sekunden Cooldown
        
        // Cooldown Timer
        const timer = setInterval(() => {
          setResendCooldown(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        const data = await response.json()
        setError(data.message || 'Fehler beim Senden des Codes.')
      }
    } catch (error) {
      console.error('Code-Anforderung Fehler:', error)
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.')
    } finally {
      setIsLoading(false)
    }
  }

  // Code eingeben und anmelden
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) {
      setError('Bitte geben Sie den vollständigen 6-stelligen Code ein.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        code,
        loginType: 'code',
        redirect: false
      })

      if (result?.ok) {
        router.push('/naturescout')
      } else {
        setError('Der Code ist ungültig oder abgelaufen. Bitte versuchen Sie es erneut.')
      }
    } catch (error) {
      console.error('Code-Login Fehler:', error)
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.')
    } finally {
      setIsLoading(false)
    }
  }

  // Zurück zur E-Mail-Eingabe
  const resetCodeFlow = () => {
    setCodeStep('email')
    setCode('')
    setError('')
    setSuccess('')
    setResendCooldown(0)
    inputRefs.current = new Array(6).fill(null)
  }

  // Code erneut anfordern
  const handleResendCode = async () => {
    if (resendCooldown > 0) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (response.ok) {
        setSuccess('Ein neuer Code wurde an Ihre E-Mail-Adresse gesendet.')
        setCode('')
        setResendCooldown(60)
        
        const timer = setInterval(() => {
          setResendCooldown(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        const data = await response.json()
        setError(data.message || 'Fehler beim Senden des Codes.')
      }
    } catch (error) {
      console.error('Code-Neuanforderung Fehler:', error)
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAFFF3] to-[#D3E0BD] p-4">
      <Card className="w-full max-w-lg border-[#D3E0BD] bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-6">
            <div className="bg-[#D3E0BD] p-4 rounded-full">
              <Key className="h-10 w-10 text-[#637047]" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-[#2D3321] mb-3">
            Anmeldung mit Code
          </CardTitle>
          <CardDescription className="text-lg text-[#637047]">
            {codeStep === 'email' 
              ? 'Geben Sie Ihre E-Mail-Adresse ein, um einen 6-stelligen Code zu erhalten'
              : 'Geben Sie den 6-stelligen Code ein, der an Ihre E-Mail gesendet wurde'
            }
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

        {codeStep === 'email' ? (
          <form onSubmit={handleRequestCode}>
            <CardContent className="space-y-6">
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
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full h-14 text-lg bg-[#637047] hover:bg-[#2D3321] font-medium shadow-md"
                disabled={isLoading}
              >
                {isLoading ? 'Wird verarbeitet...' : 'Code anfordern'}
              </Button>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-lg font-medium flex items-center gap-3 text-[#2D3321]">
                  <Key className="h-5 w-5 text-[#637047]" />
                  6-stelliger Code
                </Label>
                <div className="flex gap-2 justify-center">
                  {Array.from({ length: 6 }, (_, index) => (
                                         <Input
                       key={index}
                       ref={(el) => {
                         inputRefs.current[index] = el
                       }}
                       type="text"
                       inputMode="numeric"
                       pattern="[0-9]*"
                       maxLength={1}
                       value={code[index] || ''}
                       onChange={(e) => handleCodeChange(index, e.target.value)}
                       onKeyDown={(e) => handleKeyDown(index, e)}
                       className="h-14 w-14 text-center text-2xl font-bold border-[#D3E0BD] focus:border-[#637047] focus:ring-[#637047]"
                       autoFocus={index === 0}
                     />
                  ))}
                </div>
                <p className="text-base text-[#637047] text-center">
                  Code an <strong>{email}</strong> gesendet
                </p>
              </div>

              <div className="text-center space-y-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-[#637047] hover:text-[#2D3321] underline font-medium"
                >
                  {resendCooldown > 0 
                    ? `Code erneut anfordern (${resendCooldown}s)` 
                    : 'Code erneut anfordern'
                  }
                </Button>
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resetCodeFlow}
                    className="text-[#637047] hover:text-[#2D3321] underline font-medium"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Andere E-Mail-Adresse verwenden
                  </Button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full h-14 text-lg bg-[#637047] hover:bg-[#2D3321] font-medium shadow-md"
                disabled={isLoading || code.length !== 6}
              >
                {isLoading ? 'Wird verarbeitet...' : 'Jetzt anmelden'}
              </Button>
            </CardFooter>
          </form>
        )}

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-[#637047] text-base">
            <Link href="/auth/login" className="text-[#637047] hover:text-[#2D3321] underline font-medium">
              Mit Passwort anmelden
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
} 