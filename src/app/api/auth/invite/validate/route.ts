import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'
import { logInviteError, logInviteInfo, safeEmail } from '@/lib/invitation-logger'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    logInviteInfo('invite.validate.request', {
      tokenTail: token ? token.slice(-8) : null
    })

    if (!token) {
      return NextResponse.json(
        { message: 'Token ist erforderlich.' },
        { status: 400 }
      )
    }

    // Einladung in der Datenbank finden
    const invitation = await UserService.findInvitationByToken(token)

    if (!invitation) {
      logInviteInfo('invite.validate.notFound', {
        tokenTail: token.slice(-8)
      })
      return NextResponse.json(
        { message: 'Ungültiger Einladungslink.' },
        { status: 404 }
      )
    }

    // findInvitationByToken prüft bereits: nicht verwendet, nicht widerrufen, nicht abgelaufen

    // Prüfen ob Einladung abgelaufen ist
    if (new Date() > invitation.expiresAt) {
      logInviteInfo('invite.validate.expired', {
        inviteeEmail: safeEmail(invitation.email),
        tokenTail: token.slice(-8)
      })
      return NextResponse.json(
        { message: 'Diese Einladung ist abgelaufen.' },
        { status: 400 }
      )
    }

    // Benutzer erstellen, falls noch nicht vorhanden
    let user = await UserService.findByEmail(invitation.email)
    
    if (!user) {
      // Neuen Benutzer ohne Passwort erstellen
      user = await UserService.createUser({
        email: invitation.email,
        name: invitation.name,
        role: 'user',
        organizationId: invitation.organizationId,
        organizationName: invitation.organizationName,
        canInvite: invitation.canInvite || false,
        consent_data_processing: false, // Wird später beim ersten Login gesetzt
        consent_image_ccby: false, // Wird später beim ersten Login gesetzt
        habitat_name_visibility: 'public'
      })
    }

    // Einladung bewusst NICHT hier als "accepted" markieren.
    // "accepted" wird erst nach erfolgreichem Abschluss (Passwort gesetzt/Registrierung) gesetzt.

    return NextResponse.json({
      success: true,
      invitation: {
        name: invitation.name,
        email: invitation.email,
        inviterName: invitation.invitedByName,
        organizationName: invitation.organizationName
      },
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        hasPassword: !!user.password
      }
    })
  } catch (error) {
    logInviteError('invite.validate.failed', {
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json(
      { message: 'Ein interner Fehler ist aufgetreten.' },
      { status: 500 }
    )
  }
} 