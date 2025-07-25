'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mail, User, UserPlus, AlertCircle, CheckCircle, Send } from 'lucide-react'

interface EinladungsFormProps {
  onSuccess?: () => void
}

export function EinladungsForm({ onSuccess }: EinladungsFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user' as 'user' | 'experte' | 'admin'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Fehler beim Senden der Einladung')
      }

      setSuccess(`Einladung wurde erfolgreich an ${formData.email} gesendet!`)
      setFormData({ name: '', email: '', role: 'user' })
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <UserPlus className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <CardTitle className="text-xl font-bold text-gray-900">
          Benutzer einladen
        </CardTitle>
        <CardDescription className="text-sm text-gray-600">
          Laden Sie eine neue Person zu NatureScout ein. Sie erhält automatisch ein temporäres Passwort.
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

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Name der Person
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Max Mustermann"
              required
              className="h-10 text-sm"
            />
            <p className="text-xs text-gray-500">
              Der vollständige Name, wie er in der Einladung erscheinen soll.
            </p>
          </div>

          {/* E-Mail */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              E-Mail-Adresse
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="max@beispiel.de"
              required
              className="h-10 text-sm"
            />
            <p className="text-xs text-gray-500">
              An diese Adresse wird die Einladung mit dem temporären Passwort gesendet.
            </p>
          </div>

          {/* Rolle */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Berechtigung</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Rolle auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Benutzer - Kann Habitate ansehen und eigene erstellen</SelectItem>
                <SelectItem value="experte">Experte - Kann zusätzlich Habitate bewerten</SelectItem>
                <SelectItem value="admin">Administrator - Vollzugriff auf alle Funktionen</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Bestimmt, was die Person in NatureScout machen kann.
            </p>
          </div>

          {/* Hinweis */}
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-900 text-sm mb-1">Was passiert nach der Einladung?</h4>
            <ul className="text-xs text-yellow-800 space-y-1">
              <li>• Die Person erhält eine E-Mail mit einem 8-stelligen Passwort</li>
              <li>• Sie kann sich sofort anmelden</li>
              <li>• Beim ersten Login muss sie das Passwort ändern</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter>
          <Button 
            type="submit" 
            className="w-full h-10 text-sm bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Send className="h-4 w-4 mr-2 animate-spin" />
                Einladung wird gesendet...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Einladung senden
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
} 