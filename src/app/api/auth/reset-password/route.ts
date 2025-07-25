import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { message: 'Token und neues Passwort sind erforderlich.' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Das Passwort muss mindestens 8 Zeichen lang sein.' },
        { status: 400 }
      )
    }

    // Passwort mit Token zurücksetzen
    const updatedUser = await UserService.resetPasswordWithToken(token, password)

    if (!updatedUser) {
      return NextResponse.json(
        { message: 'Token ist ungültig oder abgelaufen.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Passwort wurde erfolgreich zurückgesetzt.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Passwort-Reset-Fehler:', error)
    return NextResponse.json(
      { message: 'Ein interner Fehler ist aufgetreten.' },
      { status: 500 }
    )
  }
} 