import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'
import { LoginCodeService } from '@/lib/services/login-code-service'

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()

    // Validierung der Eingaben
    if (!email || !code) {
      return NextResponse.json(
        { error: 'E-Mail und Code sind erforderlich' },
        { status: 400 }
      )
    }

    // E-Mail-Format prüfen
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Bitte geben Sie eine gültige E-Mail-Adresse ein' },
        { status: 400 }
      )
    }

    // Code-Format prüfen (6-stellige Zahl)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Der Code muss aus 6 Ziffern bestehen' },
        { status: 400 }
      )
    }

    // Prüfe, ob der Code gültig ist
    const isValidCode = await LoginCodeService.validateCode(email, code)

    if (!isValidCode) {
      return NextResponse.json(
        { error: 'Der Code ist nicht korrekt oder abgelaufen' },
        { status: 401 }
      )
    }

    // Finde den Benutzer
    const user = await UserService.findByEmail(email)

    if (!user) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      )
    }

    // Markiere den Code als verwendet
    await LoginCodeService.markCodeAsUsed(email, code)

    // Aktualisiere den letzten Zugriff
    await UserService.updateLastAccess(email)

    return NextResponse.json({
      message: 'Anmeldung erfolgreich',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Code-Login Fehler:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' },
      { status: 500 }
    )
  }
} 