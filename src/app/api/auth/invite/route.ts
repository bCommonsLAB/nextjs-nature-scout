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

    // Serverseitige Berechtigungsprüfung (nicht nur UI-seitig)
    if (!session.user.email) {
      return NextResponse.json(
        { message: 'E-Mail in Sitzung fehlt.' },
        { status: 403 }
      )
    }
    const inviter = await UserService.findByEmail(session.user.email)
    const inviterCanInvite =
      inviter?.role === 'admin' ||
      inviter?.role === 'superadmin' ||
      inviter?.canInvite === true
    if (!inviterCanInvite) {
      return NextResponse.json(
        { message: 'Keine Berechtigung zum Einladen von Benutzern.' },
        { status: 403 }
      )
    }

    const { name, email, message, organizationId, canInvite: inviteeCanInvite } = await request.json()

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

    const normalizedEmail = email.toLowerCase().trim()
    const effectiveOrganizationId = organizationId || session.user.organizationId

    // Prüfen ob E-Mail bereits existiert
    const existingUser = await UserService.findByEmail(normalizedEmail)
    const isExistingUser = !!existingUser

    // Organisation laden, falls angegeben
    let targetOrganization = null
    if (organizationId) {
      targetOrganization = await OrganizationService.findById(organizationId)
    }

    // Einladungs-Token generieren
    const invitationToken = UserService.generateInvitationToken()

    // Offene Einladung pro operativer Einheit wiederverwenden (E-Mail + Organisation)
    const existingPendingInvitation = await UserService.findPendingInvitationByScope(
      normalizedEmail,
      effectiveOrganizationId
    )
    const invitationExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    let invitation = null
    if (existingPendingInvitation?._id) {
      invitation = await UserService.refreshPendingInvitation(
        existingPendingInvitation._id.toString(),
        {
          name: name.trim(),
          invitedBy: session.user.id,
          invitedByName: session.user.name || 'Ein Benutzer',
          organizationId: effectiveOrganizationId,
          organizationName: targetOrganization?.name || session.user.organizationName,
          canInvite: inviteeCanInvite || false,
          token: invitationToken,
          expiresAt: invitationExpiresAt
        }
      )
    } else {
      invitation = await UserService.createInvitation({
        email: normalizedEmail,
        name: name.trim(),
        invitedBy: session.user.id,
        invitedByName: session.user.name || 'Ein Benutzer',
        organizationId: effectiveOrganizationId,
        organizationName: targetOrganization?.name || session.user.organizationName,
        canInvite: inviteeCanInvite || false,
        token: invitationToken,
        expiresAt: invitationExpiresAt // 30 Tage gültig
      })
    }

    if (!invitation) {
      return NextResponse.json(
        { message: 'Einladung konnte nicht erstellt werden.' },
        { status: 500 }
      )
    }

    // Einladungs-E-Mail senden
    try {
      if (isExistingUser) {
        // Erinnerungs-E-Mail für bereits registrierte Benutzer
        const emailSent = await MailjetService.sendInvitationEmail({
          to: email,
          name: name.trim(),
          subject: 'Erinnerung: Willkommen zurück bei NatureScout',
          inviterName: session.user.name || 'Ein Benutzer',
          organizationName: targetOrganization?.name || session.user.organizationName || 'NatureScout',
          invitationToken,
          loginUrl: `${process.env.NEXTAUTH_URL}/invite/${invitationToken}`,
          personalMessage: message?.trim() || 'Wir freuen uns, Sie wieder bei NatureScout zu sehen!'
        })
        if (!emailSent) throw new Error('Einladungs-E-Mail konnte nicht versendet werden.')
      } else {
        // Neue Einladungs-E-Mail für neue Benutzer
        const emailSent = await MailjetService.sendInvitationEmail({
          to: email,
          name: name.trim(),
          subject: 'Einladung zu NatureScout',
          inviterName: session.user.name || 'Ein Benutzer',
          organizationName: targetOrganization?.name || session.user.organizationName || 'NatureScout',
          invitationToken,
          loginUrl: `${process.env.NEXTAUTH_URL}/invite/${invitationToken}`,
          personalMessage: message?.trim() || ''
        })
        if (!emailSent) throw new Error('Einladungs-E-Mail konnte nicht versendet werden.')
      }
      await UserService.markInvitationEmailSent(invitationToken)
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
          isExistingUser,
          reusedExistingPendingInvitation: !!existingPendingInvitation
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