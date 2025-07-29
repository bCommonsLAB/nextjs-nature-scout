import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // Validierung
    if (!email || !password) {
      return NextResponse.json(
        { message: 'E-Mail und Passwort sind erforderlich.' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Das Passwort muss mindestens 8 Zeichen lang sein.' },
        { status: 400 }
      )
    }

    // Benutzer finden
    const user = await UserService.findByEmail(email.toLowerCase().trim())
    
    if (!user) {
      return NextResponse.json(
        { message: 'Benutzer nicht gefunden.' },
        { status: 404 }
      )
    }

    console.log(`🔍 Passwort-Set für Benutzer: ${email}, hat bereits Passwort: ${!!user.password}`)

    // Prüfen, ob Benutzer bereits ein Passwort hat (nur als Sicherheitsmaßnahme)
    if (user.password) {
      console.warn(`Passwort-Set-Versuch für Benutzer mit bereits vorhandenem Passwort: ${email}`)
      return NextResponse.json(
        { message: 'Benutzer hat bereits ein Passwort.' },
        { status: 400 }
      )
    }

    // Passwort hashen
    const hashedPassword = await bcrypt.hash(password, 12)

    // Passwort in der Datenbank speichern
    const updatedUser = await UserService.updateUser(email.toLowerCase().trim(), { password: hashedPassword })

    if (!updatedUser) {
      return NextResponse.json(
        { message: 'Fehler beim Speichern des Passworts.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Passwort erfolgreich erstellt.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Passwort-Set-Fehler:', error)
    return NextResponse.json(
      { message: 'Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' },
      { status: 500 }
    )
  }
} 