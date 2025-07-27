import { Suspense } from 'react'
import { redirect } from 'next/navigation'

export default function RegisterPage() {
  // Öffentliche Registrierung ist deaktiviert
  // Nur Einladungen sind erlaubt
  redirect('/auth/login?message=registration_disabled')
} 