import { redirect } from 'next/navigation'

export default function SignInPage() {
  // Weiterleitung zur neuen Anmeldeseite
  redirect('/auth/login')
} 