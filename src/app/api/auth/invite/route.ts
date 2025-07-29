import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'
import { MailjetService } from '@/lib/services/mailjet-service'
import { OrganizationService } from '@/lib/services/organization-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    // Prüfen ob User eingeloggt ist
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Anmeldung erforderlich.' },
        { status: 401 }
      )
    }

    const { name, email, message, organizationId, canInvite } = await request.json()

    // Validierung
    if (!name || !email) {
      return NextResponse.json(
        { message: 'Name und E-Mail sind erforderlich.' },
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
    const isExistingUser = !!existingUser

    // Organisation laden, falls angegeben
    let targetOrganization = null
    if (organizationId) {
      targetOrganization = await OrganizationService.findById(organizationId)
    }

    // Einladungs-Token generieren
    const invitationToken = UserService.generateInvitationToken()

    // Einladung in der Datenbank speichern
    const invitation = await UserService.createInvitation({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      invitedBy: session.user.id,
      invitedByName: session.user.name || 'Ein Benutzer',
      organizationId: organizationId || session.user.organizationId,
      organizationName: targetOrganization?.name || session.user.organizationName,
      canInvite: canInvite || false,
      token: invitationToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 Tage gültig
    })

    // Einladungs-E-Mail senden
    try {
      if (isExistingUser) {
        // Erinnerungs-E-Mail für bereits registrierte Benutzer
        await MailjetService.sendInvitationEmail({
          to: email,
          name: name.trim(),
          subject: 'Erinnerung: Willkommen zurück bei NatureScout',
          inviterName: session.user.name || 'Ein Benutzer',
          organizationName: targetOrganization?.name || session.user.organizationName || 'NatureScout',
          invitationToken,
          loginUrl: `${process.env.NEXTAUTH_URL}/invite/${invitationToken}`,
          personalMessage: message?.trim() || 'Wir freuen uns, Sie wieder bei NatureScout zu sehen!'
        })
      } else {
        // Neue Einladungs-E-Mail für neue Benutzer
        await MailjetService.sendInvitationEmail({
          to: email,
          name: name.trim(),
          subject: 'Einladung zu NatureScout',
          inviterName: session.user.name || 'Ein Benutzer',
          organizationName: targetOrganization?.name || session.user.organizationName || 'NatureScout',
          invitationToken,
          loginUrl: `${process.env.NEXTAUTH_URL}/invite/${invitationToken}`,
          personalMessage: message?.trim() || ''
        })
      }
    } catch (emailError) {
      console.error('Fehler beim Senden der Einladungs-E-Mail:', emailError)
      return NextResponse.json(
        { message: 'Einladung wurde erstellt, aber E-Mail konnte nicht gesendet werden.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        message: isExistingUser 
          ? 'Erinnerungs-E-Mail erfolgreich gesendet!' 
          : 'Einladung erfolgreich gesendet!',
        invitation: {
          id: invitation._id,
          email: invitation.email,
          name: invitation.name,
          expiresAt: invitation.expiresAt,
          isExistingUser
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