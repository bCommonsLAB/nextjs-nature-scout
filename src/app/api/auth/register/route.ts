import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'
import { MailjetService } from '@/lib/services/mailjet-service'
import { logInviteError, logInviteInfo, safeEmail } from '@/lib/invitation-logger'

export async function POST(request: Request) {
  try {
    const { name, email, password, inviteToken } = await request.json()
    logInviteInfo('register.request.received', {
      email: safeEmail(email),
      hasInviteToken: !!inviteToken,
      inviteTokenTail: inviteToken ? String(inviteToken).slice(-8) : null
    })

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
    if (invitation && inviteToken) {
      await UserService.markInvitationAsUsed(inviteToken)
      logInviteInfo('register.invitation.accepted', {
        invitationId: invitation._id?.toString() || null,
        inviteeEmail: safeEmail(invitation.email),
        inviteTokenTail: inviteToken.slice(-8)
      })
    }

    // Willkommens-E-Mail senden
    try {
      await MailjetService.sendWelcomeEmail({
        to: newUser.email,
        name: newUser.name,
        subject: 'Willkommen bei NatureScout',
        loginUrl: `${process.env.NEXTAUTH_URL}/auth/login`
      })
    } catch (emailError) {
      console.error('Fehler beim Senden der Willkommens-E-Mail:', emailError)
      // Registrierung trotzdem erfolgreich, auch wenn E-Mail fehlschlägt
    }

    // Einladende Person über erfolgreiche Annahme informieren
    if (invitation?.invitedBy) {
      try {
        const inviter = await UserService.findById(invitation.invitedBy)
        if (inviter?.email) {
          await MailjetService.sendInvitationAcceptedNotification({
            to: inviter.email,
            name: inviter.name || invitation.invitedByName || 'Einladende Person',
            subject: 'Einladung erfolgreich angenommen',
            inviteeName: invitation.name
          })
        }
      } catch (acceptedMailError) {
        logInviteError('register.acceptedNotification.failed', {
          invitationId: invitation._id?.toString() || null,
          inviteeEmail: safeEmail(invitation.email),
          error: acceptedMailError instanceof Error ? acceptedMailError.message : String(acceptedMailError)
        })
      }
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
    logInviteError('register.request.failed', {
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json(
      { message: 'Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' },
      { status: 500 }
    )
  }
} 