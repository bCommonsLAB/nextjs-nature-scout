import { Suspense } from 'react'
import RegisterForm from '@/components/auth/forms/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9F4] to-[#E8F0E0] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#637047]"></div>
          </div>
        }>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  )
} 