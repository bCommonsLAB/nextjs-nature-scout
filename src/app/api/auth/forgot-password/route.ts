import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'
import { MailjetService } from '@/lib/services/mailjet-service'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    // Validierung
    if (!email) {
      return NextResponse.json(
        { message: 'E-Mail-Adresse ist erforderlich.' },
        { status: 400 }
      )
    }

    // E-Mail-Format prüfen
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' },
        { status: 400 }
      )
    }

    // Reset-Token erstellen
    const result = await UserService.setPasswordResetToken(email.toLowerCase().trim())
    
    if (!result) {
      // Aus Sicherheitsgründen keine Informationen preisgeben, ob E-Mail existiert
      return NextResponse.json(
        { message: 'Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail gesendet.' },
        { status: 200 }
      )
    }

    const { token, user } = result

    // Reset-E-Mail senden
    try {
      await MailjetService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        subject: 'Passwort zurücksetzen',
        resetUrl: `${process.env.NEXTAUTH_URL}/authentification/passwort-reset?token=${token}`
      })
    } catch (emailError) {
      console.error('Fehler beim Senden der Passwort-Reset-E-Mail:', emailError)
      return NextResponse.json(
        { message: 'Fehler beim Senden der E-Mail. Bitte versuchen Sie es später erneut.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Eine E-Mail mit Anweisungen zum Zurücksetzen wurde gesendet.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Passwort-Reset-Fehler:', error)
    return NextResponse.json(
      { message: 'Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' },
      { status: 500 }
    )
  }
} 