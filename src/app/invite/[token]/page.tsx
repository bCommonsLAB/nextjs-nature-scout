import { Suspense } from 'react'
import InviteAcceptPage from '@/components/invite/InviteAcceptPage'

interface InvitePageProps {
  params: Promise<{
    token: string
  }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-[#FAFFF3] to-[#E9F5DB] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#637047] mx-auto"></div>
            <p className="mt-4 text-[#637047]">Lade Einladung...</p>
          </div>
        </div>
      </div>
    }>
      <InviteAcceptPage token={token} />
    </Suspense>
  )
} 