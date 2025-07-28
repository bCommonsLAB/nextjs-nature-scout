import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { message: 'Token ist erforderlich.' },
        { status: 400 }
      )
    }

    // Einladung in der Datenbank finden
    const invitation = await UserService.findInvitationByToken(token)

    if (!invitation) {
      return NextResponse.json(
        { message: 'Ungültiger Einladungslink.' },
        { status: 404 }
      )
    }

    // WICHTIG: "used" Status wird ignoriert - Link bleibt immer gültig
    // Der "used" Status dient nur für Tracking-Zwecke, nicht für Zugriffskontrolle

    // Prüfen ob Einladung abgelaufen ist
    if (new Date() > invitation.expiresAt) {
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
        consent_data_processing: false, // Wird später beim ersten Login gesetzt
        consent_image_ccby: false, // Wird später beim ersten Login gesetzt
        habitat_name_visibility: 'public'
      })
    }

    // Einladung als verwendet markieren (nur beim ersten Mal)
    if (!invitation.used) {
      await UserService.markInvitationAsUsed(token)
    }

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
    console.error('Einladungs-Validierungsfehler:', error)
    return NextResponse.json(
      { message: 'Ein interner Fehler ist aufgetreten.' },
      { status: 500 }
    )
  }
} 