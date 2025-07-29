import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'E-Mail-Adresse ist erforderlich' },
        { status: 400 }
      )
    }

    // Prüfe, ob ein Benutzer mit dieser E-Mail-Adresse existiert
    const existingUser = await UserService.findByEmail(email.toLowerCase())

    return NextResponse.json({
      exists: !!existingUser,
      message: existingUser 
        ? 'E-Mail-Adresse ist bereits registriert' 
        : 'E-Mail-Adresse ist verfügbar'
    })

  } catch (error) {
    console.error('Fehler bei der E-Mail-Prüfung:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
} 