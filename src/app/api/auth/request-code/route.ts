import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'
import { LoginCodeService } from '@/lib/services/login-code-service'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    // Validierung der Eingabe
    if (!email) {
      return NextResponse.json(
        { error: 'E-Mail-Adresse ist erforderlich' },
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

    // Prüfe, ob der Benutzer existiert
    const user = await UserService.findByEmail(email)

    if (!user) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      )
    }

    // Rate Limiting prüfen
    const canRequestCode = await LoginCodeService.checkRateLimit(email)
    if (!canRequestCode) {
      return NextResponse.json(
        { error: 'Zu viele Code-Anfragen. Bitte warten Sie 5 Minuten.' },
        { status: 429 }
      )
    }

    // Alte Codes aufräumen
    await LoginCodeService.cleanupOldCodes(email)

    // Erstelle einen neuen Login-Code
    const { code, expiresAt } = await LoginCodeService.createLoginCode(email)

    // Sende E-Mail mit dem Code
    const emailSent = await LoginCodeService.sendLoginCodeEmail(email, code, user.name)

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Fehler beim Senden der E-Mail. Bitte versuchen Sie es später erneut.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Code wurde erfolgreich gesendet',
      email: email,
      expiresAt: expiresAt
    })
  } catch (error) {
    console.error('Code-Anforderung Fehler:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' },
      { status: 500 }
    )
  }
} 