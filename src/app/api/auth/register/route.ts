import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'
import { MailjetService } from '@/lib/services/mailjet-service'

export async function POST(request: Request) {
  try {
    const { name, email, password, inviteToken } = await request.json()

    // Validierung
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, E-Mail und Passwort sind erforderlich.' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Das Passwort muss mindestens 8 Zeichen lang sein.' },
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

    // Prüfen ob E-Mail bereits existiert
    const existingUser = await UserService.findByEmail(email)
    if (existingUser) {
      return NextResponse.json(
        { message: 'Diese E-Mail-Adresse ist bereits registriert.' },
        { status: 409 }
      )
    }

    // Wenn Einladungs-Token vorhanden, validieren
    let invitation = null
    if (inviteToken) {
      invitation = await UserService.findInvitationByToken(inviteToken)
      if (!invitation) {
        return NextResponse.json(
          { message: 'Ungültiger oder abgelaufener Einladungslink.' },
          { status: 400 }
        )
      }
      
      // Prüfen ob E-Mail mit Einladung übereinstimmt
      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json(
          { message: 'Die E-Mail-Adresse stimmt nicht mit der Einladung überein.' },
          { status: 400 }
        )
      }
    }

    // Benutzer erstellen
    const newUser = await UserService.createUserWithPassword({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'user',
      // Wenn Einladung vorhanden, Organisationsdaten übernehmen
      organizationId: invitation?.organizationId,
      organizationName: invitation?.organizationName
    })

    // Wenn Einladung vorhanden, als verwendet markieren
    if (invitation) {
      await UserService.markInvitationAsUsed(inviteToken)
    }

    // Willkommens-E-Mail senden
    try {
      await MailjetService.sendWelcomeEmail({
        to: newUser.email,
        name: newUser.name,
        subject: 'Willkommen bei NatureScout',
        loginUrl: `${process.env.NEXTAUTH_URL}/authentification/anmelden`
      })
    } catch (emailError) {
      console.error('Fehler beim Senden der Willkommens-E-Mail:', emailError)
      // Registrierung trotzdem erfolgreich, auch wenn E-Mail fehlschlägt
    }

    return NextResponse.json(
      { 
        message: invitation 
          ? 'Registrierung erfolgreich! Sie können sich jetzt anmelden.' 
          : 'Registrierung erfolgreich! Sie können sich jetzt anmelden.',
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registrierungsfehler:', error)
    return NextResponse.json(
      { message: 'Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' },
      { status: 500 }
    )
  }
} 