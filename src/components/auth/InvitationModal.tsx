'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Mail, User, AlertCircle, UserPlus, CheckCircle2, X } from 'lucide-react'
import { toast } from 'sonner'

interface InvitationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvitationModal({ open, onOpenChange }: InvitationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('') // Fehler löschen bei Änderung
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Bitte geben Sie den Namen der einzuladenden Person ein.')
      return false
    }
    if (!formData.email.trim()) {
      setError('Bitte geben Sie die E-Mail-Adresse der einzuladenden Person ein.')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Bitte geben Sie eine gültige E-Mail-Adresse ein.')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Einladung fehlgeschlagen')
      }

      // Erfolgreich eingeladen
      setSuccess(true)
      setFormData({ name: '', email: '' })
      toast.success('Einladung erfolgreich gesendet!')
      
      // Modal nach kurzer Verzögerung schließen
      setTimeout(() => {
        onOpenChange(false)
        setSuccess(false)
      }, 2000)

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten.')
      toast.error('Fehler beim Senden der Einladung')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ name: '', email: '' })
      setError('')
      setSuccess(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Andere einladen
          </DialogTitle>
          <DialogDescription>
            Laden Sie eine andere Person zu NatureScout ein. Sie erhalten eine E-Mail mit einem Link zur Registrierung.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Einladung gesendet!</h3>
            <p className="text-sm text-gray-600 text-center">
              Die Einladung wurde erfolgreich an {formData.email} gesendet.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="invite-name" className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Name der einzuladenden Person
                </Label>
                <Input
                  id="invite-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Max Mustermann"
                  required
                  className="h-10"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500">
                  Der Name, wie er in NatureScout angezeigt werden soll.
                </p>
              </div>

              {/* E-Mail */}
              <div className="space-y-2">
                <Label htmlFor="invite-email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-Mail-Adresse
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="max@beispiel.de"
                  required
                  className="h-10"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500">
                  Die E-Mail-Adresse, an die die Einladung gesendet wird.
                </p>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Einladung senden
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
} 