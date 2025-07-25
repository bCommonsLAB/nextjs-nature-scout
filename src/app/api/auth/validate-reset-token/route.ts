import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { message: 'Token ist erforderlich.' },
        { status: 400 }
      )
    }

    // Token mit UserService validieren
    const user = await UserService.validatePasswordResetToken(token)

    if (!user) {
      return NextResponse.json(
        { message: 'Token ist ungültig oder abgelaufen.' },
        { status: 400 }
      )
    }

    // Debug-Log für Entwicklung
    console.log('Token validiert für Benutzer:', user.email)

    return NextResponse.json(
      { message: 'Token ist gültig.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Token-Validierungsfehler:', error)
    return NextResponse.json(
      { message: 'Ein interner Fehler ist aufgetreten.' },
      { status: 500 }
    )
  }
} 