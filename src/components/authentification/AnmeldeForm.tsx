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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, Key, Smartphone, ArrowLeft, HelpCircle, Info, ChevronDown, ChevronUp } from 'lucide-react'

export function AnmeldeForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('password')
  const [codeStep, setCodeStep] = useState<'email' | 'code'>('email')
  const [showHelp, setShowHelp] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()
  const [firstInputMaxLength, setFirstInputMaxLength] = useState(1)
  
  // Debug: Logge maxLength Änderungen
  useEffect(() => {
    console.log('🔧 firstInputMaxLength geändert auf:', firstInputMaxLength)
  }, [firstInputMaxLength])

  // Callback für Input-Referenzen
  const setInputRef = useCallback((index: number) => (el: HTMLInputElement | null) => {
    if (inputRefs.current) {
      inputRefs.current[index] = el
    }
  }, [])

  // Hilfsfunktion für sicheren Zugriff auf Referenzen
  const getInputRef = useCallback((index: number): HTMLInputElement | null => {
    const ref = inputRefs.current?.[index] || null
    console.log(`🔍 getInputRef(${index}):`, ref)
    return ref
  }, [])

  // Initialisiere Referenzen beim ersten Render
  useEffect(() => {
    if (codeStep === 'code' && inputRefs.current.length === 0) {
      inputRefs.current = new Array(6).fill(null)
    }
  }, [codeStep])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        loginType: 'password',
        redirect: false,
      })

      if (result?.error) {
        setError('E-Mail oder Passwort sind nicht korrekt. Bitte prüfen Sie Ihre Eingaben.')
      } else {
        router.push('/naturescout')
        router.refresh()
      }
    } catch (error) {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Bitte geben Sie Ihre E-Mail-Adresse ein.')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Fehler beim Anfordern des Codes')
      } else {
        setSuccess('Code wurde erfolgreich an Ihre E-Mail-Adresse gesendet!')
        setCodeStep('code')
        // Starte Cooldown-Timer für erneutes Senden
        setResendCooldown(60)
        const timer = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }
    } catch (error) {
      setError('Fehler beim Anfordern des Codes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        code,
        loginType: 'code',
        redirect: false,
      })

      if (result?.error) {
        setError('Der Code ist nicht korrekt oder abgelaufen. Bitte prüfen Sie Ihre Eingabe.')
      } else {
        // Erfolgreiche Anmeldung
        router.push('/naturescout')
        router.refresh()
      }
    } catch (error) {
      setError('Der Code ist nicht korrekt. Bitte prüfen Sie Ihre Eingabe.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetCodeFlow = () => {
    setCodeStep('email')
    setCode('')
    setError('')
    setSuccess('')
    setResendCooldown(0)
    inputRefs.current = new Array(6).fill(null)
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return
    
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Fehler beim erneuten Senden des Codes')
      } else {
        setSuccess('Neuer Code wurde erfolgreich gesendet!')
        // Starte Cooldown-Timer
        setResendCooldown(60)
        const timer = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }
    } catch (error) {
      setError('Fehler beim erneuten Senden des Codes')
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
              <CheckCircle className="h-10 w-10 text-[#637047]" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-[#2D3321] mb-3">
            Willkommen zurück!
          </CardTitle>
          <CardDescription className="text-lg text-[#637047]">
            Wählen Sie Ihre bevorzugte Anmeldemethode
          </CardDescription>
        </CardHeader>

        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value)
          if (value === 'code') {
            setCodeStep('email')
            setCode('')
            setError('')
            setSuccess('')
            setResendCooldown(0)
            inputRefs.current = new Array(6).fill(null)
          }
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#FAFFF3] border-[#D3E0BD]">
            <TabsTrigger 
              value="password" 
              className="text-base py-3 px-6 data-[state=active]:bg-[#637047] data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <Lock className="h-5 w-5 mr-2" />
              Mit Passwort
            </TabsTrigger>
            <TabsTrigger 
              value="code" 
              className="text-base py-3 px-6 data-[state=active]:bg-[#637047] data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <Key className="h-5 w-5 mr-2" />
              Mit Code
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="password" className="space-y-0">
            <form onSubmit={handlePasswordSubmit}>
              <CardContent className="space-y-6">
                {/* E-Mail Eingabe */}
                <div className="space-y-3">
                  <Label htmlFor="email-password" className="text-lg font-medium flex items-center gap-3 text-[#2D3321]">
                    <Mail className="h-5 w-5 text-[#637047]" />
                    Ihre E-Mail-Adresse
                  </Label>
                  <Input
                    id="email-password"
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
                      className="h-14 text-lg pr-14 border-[#D3E0BD] focus:border-[#637047] focus:ring-[#637047]"
                      autoComplete="current-password"
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
                    Klicken Sie auf das Auge-Symbol, um Ihr Passwort sichtbar zu machen.
                  </p>
                </div>

                {/* Passwort vergessen Link */}
                <div className="text-center pt-2">
                  <Link 
                    href="/authentification/passwort-vergessen" 
                    className="text-[#637047] hover:text-[#2D3321] text-base underline font-medium"
                  >
                    Passwort vergessen?
                  </Link>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4">
                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg bg-[#637047] hover:bg-[#2D3321] font-medium shadow-md"
                  disabled={isLoading}
                >
                  {isLoading ? 'Wird angemeldet...' : 'Jetzt anmelden'}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>

          <TabsContent value="code" className="space-y-0">
            {codeStep === 'email' ? (
              // Erste Stufe: E-Mail eingeben und Code anfordern
              <form onSubmit={handleRequestCode}>
                <CardContent className="space-y-6">
                  {/* E-Mail Eingabe für Code */}
                  <div className="space-y-3">
                    <Label htmlFor="email-code" className="text-lg font-medium flex items-center gap-3 text-[#2D3321]">
                      <Mail className="h-5 w-5 text-[#637047]" />
                      Ihre E-Mail-Adresse
                    </Label>
                    <Input
                      id="email-code"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="beispiel@email.de"
                      required
                      className="h-14 text-lg border-[#D3E0BD] focus:border-[#637047] focus:ring-[#637047]"
                      autoComplete="email"
                    />
                    <p className="text-base text-[#637047]">
                      Die E-Mail-Adresse, an die wir den Code senden sollen.
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg bg-[#637047] hover:bg-[#2D3321] font-medium shadow-md"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Code wird gesendet...' : 'Code anfordern'}
                  </Button>
                </CardFooter>
              </form>
            ) : (
              // Zweite Stufe: Code eingeben
              <form onSubmit={handleCodeSubmit}>
                <CardContent className="space-y-6">
                  {/* Header-Bereich */}
                  <div className="text-center space-y-3">
                    <h4 className="text-2xl font-bold text-[#2D3321]">
                      Überprüfen Sie Ihren Posteingang
                    </h4>
                    <p className="text-[#637047] text-lg">
                      weiter zu NatureScout
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[#2D3321] font-medium">{email}</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={resetCodeFlow}
                        className="h-6 w-6 p-0 text-[#637047] hover:text-[#2D3321] hover:bg-[#FAFFF3]"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </Button>
                    </div>
                  </div>

                  {/* Code-Eingabe */}
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="flex gap-2">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <input
                            key={index}
                            ref={setInputRef(index)}
                            type="text"
                            maxLength={index === 0 ? firstInputMaxLength : 1}
                            className={`
                              w-12 h-12 text-center text-xl font-bold border-2 rounded-lg
                              focus:outline-none focus:ring-2 focus:ring-[#637047] focus:border-[#637047]
                              ${code[index] 
                                ? 'border-[#637047] bg-[#FAFFF3] text-[#2D3321]' 
                                : 'border-[#D3E0BD] text-[#637047]'
                              }
                            `}
                            value={code[index] || ''}
                            onFocus={() => {
                              if (index === 0) {
                                console.log('🎯 Erstes Feld fokussiert - setze maxLength auf 6')
                                setFirstInputMaxLength(6)
                              }
                            }}
                            onBlur={() => {
                              if (index === 0) {
                                console.log('🎯 Erstes Feld verlassen - setze maxLength auf 1')
                                setFirstInputMaxLength(1)
                              }
                            }}
                            onKeyDown={(e) => {
                              console.log('🎯 KeyDown Event:', e.key, 'Ctrl:', e.ctrlKey, 'Meta:', e.metaKey)
                              
                              // Strg+V nicht blockieren!
                              if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                                console.log('🎯 Strg+V erkannt - nicht blockieren!')
                                return // Nicht preventDefault() für Strg+V
                              }
                              
                              // Zurück zum vorherigen Feld bei Backspace
                              if (e.key === 'Backspace') {
                                if (!code[index] && index > 0) {
                                  // Wenn aktuelles Feld leer ist, gehe zum vorherigen
                                  const prevInput = getInputRef(index - 1)
                                  if (prevInput) {
                                    prevInput.focus()
                                    // Lösche auch den Inhalt des vorherigen Feldes
                                    const newCode = code.split('')
                                    newCode[index - 1] = ''
                                    setCode(newCode.join(''))
                                  }
                                } else if (code[index]) {
                                  // Wenn aktuelles Feld gefüllt ist, lösche nur den Inhalt
                                  const newCode = code.split('')
                                  newCode[index] = ''
                                  setCode(newCode.join(''))
                                }
                              }
                              
                              // Pfeiltasten-Navigation
                              if (e.key === 'ArrowLeft' && index > 0) {
                                const prevInput = getInputRef(index - 1)
                                if (prevInput) prevInput.focus()
                              }
                              
                              if (e.key === 'ArrowRight' && index < 5) {
                                const nextInput = getInputRef(index + 1)
                                if (nextInput) nextInput.focus()
                              }
                              
                              // Nur Zahlen, Backspace, Pfeiltasten und Strg+V erlauben
                              if (!/^\d$/.test(e.key) && 
                                  e.key !== 'Backspace' && 
                                  e.key !== 'ArrowLeft' && 
                                  e.key !== 'ArrowRight' && 
                                  e.key !== 'Tab' &&
                                  !((e.ctrlKey || e.metaKey) && e.key === 'v')) {
                                console.log('🎯 Key blockiert:', e.key)
                                e.preventDefault()
                              }
                            }}
                            onPaste={index === 0 ? (e) => {
                              console.log('🎯 PASTE Event! maxLength ist:', firstInputMaxLength)
                              console.log('🎯 Paste Event Details:', e)
                              e.preventDefault()
                              const pastedData = e.clipboardData.getData('text')
                              console.log('📋 Pasted Data:', pastedData)
                              const cleanCode = pastedData.replace(/\D/g, '').slice(0, 6)
                              console.log('🧹 Clean Code:', cleanCode)
                              if (cleanCode.length > 0) {
                                setCode(cleanCode)
                                setTimeout(() => {
                                  setFirstInputMaxLength(1)
                                  const focusIndex = Math.min(cleanCode.length - 1, 5)
                                  const targetInput = getInputRef(focusIndex)
                                  if (targetInput) targetInput.focus()
                                }, 10)
                              }
                            } : undefined}
                            onChange={(e) => {
                              const inputValue = e.target.value
                              
                              // Nur Zahlen erlauben
                              if (!/^\d*$/.test(inputValue)) {
                                return
                              }
                              
                              const newCode = code.split('')
                              newCode[index] = inputValue
                              setCode(newCode.join(''))
                              
                              // Automatisch zum nächsten Feld springen
                              if (inputValue && index < 5) {
                                setTimeout(() => {
                                  const nextInput = getInputRef(index + 1)
                                  if (nextInput) nextInput.focus()
                                }, 10)
                              }
                            }}
                            onInput={index === 0 ? (e) => {
                              const target = e.target as HTMLInputElement
                              const value = target.value
                              console.log('🎯 onInput:', value, 'maxLength:', firstInputMaxLength)
                              if (value.length > 1) {
                                console.log('🎯 Möglicher Paste erkannt in onInput!')
                                const cleanCode = value.replace(/\D/g, '').slice(0, 6)
                                if (cleanCode.length > 0) {
                                  setCode(cleanCode)
                                  setTimeout(() => {
                                    setFirstInputMaxLength(1)
                                    const focusIndex = Math.min(cleanCode.length - 1, 5)
                                    const targetInput = getInputRef(focusIndex)
                                    if (targetInput) targetInput.focus()
                                  }, 10)
                                }
                              }
                            } : undefined}
                                                         autoComplete="off"
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      {resendCooldown > 0 ? (
                        <p className="text-[#637047] text-sm">
                          Code erneut senden in {resendCooldown} Sekunden
                        </p>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleResendCode}
                          disabled={isLoading}
                          className="text-[#637047] hover:text-[#2D3321] hover:bg-[#FAFFF3] text-sm p-0 h-auto"
                        >
                          Code erneut senden
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg bg-[#637047] hover:bg-[#2D3321] font-medium shadow-md"
                    disabled={isLoading || code.length !== 6}
                  >
                    {isLoading ? 'Wird angemeldet...' : 'Fortsetzen'}
                    <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>

                  <div className="text-center">
                    <Button 
                      type="button" 
                      variant="ghost"
                      onClick={() => setActiveTab('password')}
                      className="text-[#2D3321] hover:text-[#637047] hover:bg-[#FAFFF3]"
                    >
                      Verwenden Sie eine andere Methode
                    </Button>
                  </div>
                </CardFooter>
              </form>
            )}
          </TabsContent>
        </Tabs>

        {/* Registrierung Link */}
        <div className="px-6 pb-6">
          <div className="text-center text-base text-[#637047] border-t border-[#D3E0BD] pt-6">
            <span>Noch kein Konto? </span>
            <Link 
              href="/authentification/registrieren" 
              className="text-[#637047] hover:text-[#2D3321] underline font-medium"
            >
              Hier registrieren
            </Link>
          </div>
        </div>

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
                {activeTab === 'password' ? (
                  // Hilfe für Passwort-Anmeldung
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-[#2D3321] mb-2 flex items-center gap-2">
                        <Lock className="h-4 w-4 text-[#637047]" />
                        Passwort-Anmeldung
                      </h5>
                      <div className="text-sm text-[#637047] space-y-2">
                        <p>Verwenden Sie Ihre E-Mail-Adresse und Ihr Passwort, um sich anzumelden.</p>
                        <p><strong>Tipp:</strong> Klicken Sie auf das Auge-Symbol, um Ihr Passwort sichtbar zu machen.</p>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-[#2D3321] mb-2">Häufige Probleme</h5>
                      <div className="text-sm text-[#637047] space-y-2">
                        <p><strong>Passwort vergessen?</strong> Nutzen Sie den "Passwort vergessen?" Link oder wechseln Sie zur Code-Anmeldung.</p>
                        <p><strong>E-Mail-Adresse falsch?</strong> Verwenden Sie die gleiche E-Mail-Adresse wie bei der Registrierung.</p>
                        <p><strong>Passwort wird nicht akzeptiert?</strong> Prüfen Sie Groß-/Kleinschreibung und Sonderzeichen.</p>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-[#2D3321] mb-2">Alternative Anmeldung</h5>
                      <p className="text-sm text-[#637047]">
                        Falls Sie Probleme mit der Passwort-Anmeldung haben, können Sie auch die <strong>Code-Anmeldung</strong> verwenden. 
                        Diese ist besonders nützlich, wenn Sie Ihr Passwort vergessen haben.
                      </p>
                    </div>
                  </div>
                ) : (
                  // Hilfe für Code-Anmeldung
                  <div className="space-y-4">
                    {codeStep === 'email' ? (
                      // Hilfe für erste Stufe (E-Mail eingeben)
                      <>
                        <div>
                          <h5 className="font-medium text-[#2D3321] mb-2 flex items-center gap-2">
                            <Key className="h-4 w-4 text-[#637047]" />
                            Code-Anmeldung - Schritt 1
                          </h5>
                          <div className="text-sm text-[#637047] space-y-2">
                            <p>Geben Sie Ihre E-Mail-Adresse ein, um einen 6-stelligen Anmelde-Code zu erhalten.</p>
                            <p><strong>So funktioniert es:</strong></p>
                            <ol className="list-decimal list-inside ml-2 space-y-1">
                              <li>E-Mail-Adresse eingeben</li>
                              <li>Auf "Code anfordern" klicken</li>
                              <li>6-stelligen Code per E-Mail erhalten</li>
                              <li>Code eingeben und anmelden</li>
                            </ol>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-[#2D3321] mb-2">Wichtige Hinweise</h5>
                          <div className="text-sm text-[#637047] space-y-2">
                            <p><strong>E-Mail-Adresse:</strong> Verwenden Sie die gleiche Adresse wie bei der Registrierung.</p>
                            <p><strong>Code-Gültigkeit:</strong> Der Code ist 15 Minuten gültig.</p>
                            <p><strong>Spam-Ordner:</strong> Prüfen Sie auch Ihren Spam-Ordner, falls Sie keine E-Mail erhalten.</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      // Hilfe für zweite Stufe (Code eingeben)
                      <>
                        <div>
                          <h5 className="font-medium text-[#2D3321] mb-2 flex items-center gap-2">
                            <Key className="h-4 w-4 text-[#637047]" />
                            Code-Anmeldung - Schritt 2
                          </h5>
                          <div className="text-sm text-[#637047] space-y-2">
                            <p>Geben Sie den 6-stelligen Code ein, den Sie per E-Mail erhalten haben.</p>
                            <p><strong>Code an {email} gesendet</strong></p>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-[#2D3321] mb-2">Häufige Probleme</h5>
                          <div className="text-sm text-[#637047] space-y-2">
                            <p><strong>Code nicht erhalten?</strong> Prüfen Sie Ihren Spam-Ordner oder klicken Sie auf "Code erneut anfordern".</p>
                            <p><strong>Code falsch?</strong> Prüfen Sie die Eingabe - der Code besteht aus genau 6 Ziffern.</p>
                            <p><strong>Code abgelaufen?</strong> Der Code ist nur 15 Minuten gültig. Fordern Sie einen neuen an.</p>
                            <p><strong>Falsche E-Mail?</strong> Klicken Sie auf "Andere E-Mail-Adresse verwenden".</p>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-[#2D3321] mb-2">Tipps</h5>
                          <div className="text-sm text-[#637047] space-y-2">
                            <p><strong>Code kopieren:</strong> Sie können den Code aus der E-Mail kopieren und einfügen.</p>
                            <p><strong>Automatische Weiterleitung:</strong> Nach erfolgreicher Eingabe werden Sie automatisch angemeldet.</p>
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <h5 className="font-medium text-[#2D3321] mb-2">Alternative Anmeldung</h5>
                      <p className="text-sm text-[#637047]">
                        Falls Sie Probleme mit der Code-Anmeldung haben, können Sie auch die <strong>Passwort-Anmeldung</strong> verwenden, 
                        falls Sie sich an Ihr Passwort erinnern.
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-[#D3E0BD]">
                  <h5 className="font-medium text-[#2D3321] mb-2">Weitere Hilfe benötigt?</h5>
                  <p className="text-sm text-[#637047]">
                    Falls Sie weitere Probleme haben, können Sie uns gerne kontaktieren. 
                    Wir helfen Ihnen gerne weiter und stehen Ihnen zur Verfügung.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
} 