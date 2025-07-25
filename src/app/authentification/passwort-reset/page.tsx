import { Suspense } from 'react'
import PasswortResetClient from '@/app/authentification/passwort-reset/PasswortResetClient'

export default function PasswortResetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Lade...</p>
          </div>
        </div>
      </div>
    }>
      <PasswortResetClient />
    </Suspense>
  )
} 