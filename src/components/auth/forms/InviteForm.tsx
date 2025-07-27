'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Mail, User, CheckCircle, AlertCircle, UserPlus, Send } from 'lucide-react'

export default function InviteForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Prüfen, ob Benutzer angemeldet ist
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          message: message.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Fehler beim Senden der Einladung')
      }

      setSuccess('Einladung erfolgreich gesendet!')
      setEmail('')
      setName('')
      setMessage('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten')
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
            Benutzer einladen
          </CardTitle>
          <CardDescription className="text-lg text-[#637047]">
            Laden Sie neue Benutzer zu NatureScout ein
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

            {success && (
              <Alert className="border-[#D3E0BD] bg-[#FAFFF3]">
                <CheckCircle className="h-5 w-5 text-[#637047]" />
                <AlertDescription className="text-base text-[#2D3321]">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {/* Name des einzuladenden Benutzers */}
            <div className="space-y-3">
              <Label htmlFor="name" className="text-lg font-medium flex items-center gap-3 text-[#2D3321]">
                <User className="h-5 w-5 text-[#637047]" />
                Name der Person
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vor- und Nachname"
                required
                className="h-14 text-lg border-[#D3E0BD] focus:border-[#637047] focus:ring-[#637047]"
              />
              <p className="text-base text-[#637047]">
                Der vollständige Name der Person, die Sie einladen möchten.
              </p>
            </div>

            {/* E-Mail-Adresse */}
            <div className="space-y-3">
              <Label htmlFor="email" className="text-lg font-medium flex items-center gap-3 text-[#2D3321]">
                <Mail className="h-5 w-5 text-[#637047]" />
                E-Mail-Adresse
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="beispiel@email.de"
                required
                className="h-14 text-lg border-[#D3E0BD] focus:border-[#637047] focus:ring-[#637047]"
              />
              <p className="text-base text-[#637047]">
                Die E-Mail-Adresse, an die die Einladung gesendet wird.
              </p>
            </div>

            {/* Persönliche Nachricht (optional) */}
            <div className="space-y-3">
              <Label htmlFor="message" className="text-lg font-medium flex items-center gap-3 text-[#2D3321]">
                <Send className="h-5 w-5 text-[#637047]" />
                Persönliche Nachricht (optional)
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Fügen Sie eine persönliche Nachricht hinzu..."
                rows={3}
                className="text-lg border-[#D3E0BD] focus:border-[#637047] focus:ring-[#637047] resize-none"
              />
              <p className="text-base text-[#637047]">
                Eine optionale persönliche Nachricht, die in der Einladungs-E-Mail enthalten ist.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full h-14 text-lg bg-[#637047] hover:bg-[#2D3321] font-medium shadow-md"
              disabled={isLoading}
            >
              {isLoading ? 'Einladung wird gesendet...' : 'Einladung senden'}
            </Button>
            
            <Link 
              href="/naturescout"
              className="flex items-center justify-center gap-2 text-[#637047] hover:text-[#2D3321] text-base font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zu NatureScout
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
} 