import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'
import { MailjetService } from '@/lib/services/mailjet-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    // Prüfen ob User eingeloggt und Admin ist
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Anmeldung erforderlich.' },
        { status: 401 }
      )
    }

    // Admin-Berechtigung prüfen (vereinfacht für jetzt)
    if (session.user.role !== 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json(
        { message: 'Keine Berechtigung zum Einladen von Benutzern.' },
        { status: 403 }
      )
    }

    const { name, email, role } = await request.json()

    // Validierung
    if (!name || !email || !role) {
      return NextResponse.json(
        { message: 'Name, E-Mail und Rolle sind erforderlich.' },
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

    // Temporäres Passwort generieren
    const temporaryPassword = UserService.generateSecurePassword()

    // Benutzer erstellen mit temporärem Passwort
    const newUser = await UserService.createUserWithPassword({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: temporaryPassword,
      role: role as 'user' | 'experte' | 'admin'
    })

    // Einladungs-E-Mail senden
    try {
      await MailjetService.sendInvitationEmail({
        to: newUser.email,
        name: newUser.name,
        subject: 'Einladung zu NatureScout',
        inviterName: session.user.name || 'Ein Administrator',
        organizationName: session.user.organizationName,
        temporaryPassword,
        loginUrl: `${process.env.NEXTAUTH_URL}/authentification/anmelden`
      })
    } catch (emailError) {
      console.error('Fehler beim Senden der Einladungs-E-Mail:', emailError)
      return NextResponse.json(
        { message: 'Benutzer wurde erstellt, aber E-Mail konnte nicht gesendet werden.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        message: 'Einladung erfolgreich gesendet!',
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Einladungsfehler:', error)
    return NextResponse.json(
      { message: 'Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' },
      { status: 500 }
    )
  }
} 