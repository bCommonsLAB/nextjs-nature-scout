import { NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/server-auth'
import { UserService } from '@/lib/services/user-service'
import { MailjetService } from '@/lib/services/mailjet-service'
import { logInviteError, logInviteInfo, safeEmail } from '@/lib/invitation-logger'

export async function GET() {
  try {
    const { isAdmin, error } = await checkAdminAccess()
    if (!isAdmin) {
      return NextResponse.json(
        { message: error || 'Zugriff verweigert. Nur für Admins.' },
        { status: 403 }
      )
    }

    const invitations = await UserService.getAllInvitations()
    logInviteInfo('adminInvitations.list.loaded', {
      count: invitations.length
    })
    const normalized = invitations.map((invitation) => ({
      ...invitation,
      _id: invitation._id?.toString() || ''
    }))
    return NextResponse.json(normalized)
  } catch (error) {
    logInviteError('adminInvitations.list.failed', {
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json(
      { message: 'Ein interner Fehler ist aufgetreten.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { isAdmin, error } = await checkAdminAccess()
    if (!isAdmin) {
      return NextResponse.json(
        { message: error || 'Zugriff verweigert. Nur für Admins.' },
        { status: 403 }
      )
    }

    const { action, invitationId } = await request.json()
    logInviteInfo('adminInvitations.action.requested', {
      action,
      invitationId
    })
    if (!action || !invitationId) {
      return NextResponse.json(
        { message: 'action und invitationId sind erforderlich.' },
        { status: 400 }
      )
    }

    const invitation = await UserService.findInvitationById(invitationId)
    if (!invitation) {
      return NextResponse.json(
        { message: 'Einladung nicht gefunden.' },
        { status: 404 }
      )
    }

    if (action === 'revoke') {
      const revoked = await UserService.revokeInvitation(invitationId)
      if (!revoked) {
        return NextResponse.json(
          { message: 'Einladung konnte nicht widerrufen werden.' },
          { status: 400 }
        )
      }
      logInviteInfo('adminInvitations.action.revoked', {
        invitationId,
        inviteeEmail: safeEmail(invitation.email)
      })
      return NextResponse.json({ success: true, message: 'Einladung widerrufen.' })
    }

    if (action === 'archive') {
      const archivedCount = await UserService.archiveInvitationScope(
        invitation.email,
        invitation.organizationId
      )
      if (archivedCount <= 0) {
        return NextResponse.json(
          { message: 'Einladung konnte nicht archiviert werden.' },
          { status: 400 }
        )
      }
      logInviteInfo('adminInvitations.action.archived', {
        invitationId,
        inviteeEmail: safeEmail(invitation.email),
        archivedCount
      })
      return NextResponse.json({
        success: true,
        message: `Einladung archiviert (${archivedCount} Datensatz/Datensaetze).`
      })
    }

    if (action === 'remind') {
      if (invitation.used || invitation.acceptedAt || invitation.revokedAt) {
        return NextResponse.json(
          { message: 'Für diesen Status kann keine Erinnerung versendet werden.' },
          { status: 400 }
        )
      }
      if (new Date() > invitation.expiresAt) {
        return NextResponse.json(
          { message: 'Einladung ist nicht mehr gültig.' },
          { status: 400 }
        )
      }

      const inviter = await UserService.findById(invitation.invitedBy)
      if (!inviter?.email) {
        return NextResponse.json(
          { message: 'Einladende Person konnte nicht ermittelt werden.' },
          { status: 400 }
        )
      }

      const loginUrl = `${process.env.NEXTAUTH_URL}/invite/${invitation.token}`
      const [toInviter, toInvitee] = await Promise.all([
        MailjetService.sendInvitationReminderEmail({
          to: inviter.email,
          name: inviter.name || invitation.invitedByName || 'Einladende Person',
          subject: 'Manuelle Erinnerung: Einladung noch offen',
          inviterName: invitation.invitedByName,
          inviteeName: invitation.name,
          loginUrl,
          invitationToken: invitation.token
        }),
        MailjetService.sendInvitationReminderEmail({
          to: invitation.email,
          name: invitation.name,
          subject: 'Erinnerung: Ihre Einladung zu NatureScout',
          inviterName: invitation.invitedByName,
          inviteeName: invitation.name,
          loginUrl,
          invitationToken: invitation.token
        })
      ])

      if (!toInviter || !toInvitee) {
        return NextResponse.json(
          { message: 'Erinnerung konnte nicht vollständig versendet werden.' },
          { status: 500 }
        )
      }

      await UserService.markInvitationEmailSent(invitation.token)
      logInviteInfo('adminInvitations.action.reminderSent', {
        invitationId,
        inviteeEmail: safeEmail(invitation.email),
        tokenTail: invitation.token.slice(-8)
      })
      return NextResponse.json({ success: true, message: 'Erinnerung versendet.' })
    }

    return NextResponse.json(
      { message: 'Unbekannte Aktion.' },
      { status: 400 }
    )
  } catch (error) {
    logInviteError('adminInvitations.action.failed', {
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json(
      { message: 'Ein interner Fehler ist aufgetreten.' },
      { status: 500 }
    )
  }
}
