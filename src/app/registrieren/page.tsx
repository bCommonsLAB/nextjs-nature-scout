import { redirect } from 'next/navigation'

export default function SignUpPage() {
  // Weiterleitung zur neuen Registrierungsseite
  redirect('/auth/register')
} 