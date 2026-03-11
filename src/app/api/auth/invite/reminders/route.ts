import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserService } from '@/lib/services/user-service'
import { MailjetService } from '@/lib/services/mailjet-service'

function getInviteUrl(token: string): string {
  return `${process.env.NEXTAUTH_URL}/invite/${token}`
}

async function isAuthorized(request: Request): Promise<boolean> {
  const cronSecret = process.env.INVITE_REMINDER_SECRET
  const providedSecret = request.headers.get('x-invite-reminder-secret')
  if (cronSecret && providedSecret === cronSecret) return true

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return false
  const inviter = await UserService.findByEmail(session.user.email)
  return inviter?.role === 'admin' || inviter?.role === 'superadmin'
}

async function processReminderBatch(reminderType: '24h' | '3d') {
  const invitations = await UserService.getInvitationsDueForReminder(reminderType)
  const result = { processed: 0, sent: 0, failed: 0 }

  for (const invitation of invitations) {
    result.processed += 1
    const inviter = await UserService.findById(invitation.invitedBy)
    if (!inviter?.email) {
      result.failed += 1
      continue
    }

    const inviteUrl = getInviteUrl(invitation.token)
    const [toInviter, toInvitee] = await Promise.all([
      MailjetService.sendInvitationReminderEmail({
        to: inviter.email,
        name: inviter.name || invitation.invitedByName || 'Einladende Person',
        subject: `Erinnerung (${reminderType}): Einladung noch offen`,
        inviterName: invitation.invitedByName,
        inviteeName: invitation.name,
        loginUrl: inviteUrl,
        invitationToken: invitation.token
      }),
      MailjetService.sendInvitationReminderEmail({
        to: invitation.email,
        name: invitation.name,
        subject: `Erinnerung (${reminderType}): Ihre Einladung zu NatureScout`,
        inviterName: invitation.invitedByName,
        inviteeName: invitation.name,
        loginUrl: inviteUrl,
        invitationToken: invitation.token
      })
    ])

    if (toInviter && toInvitee) {
      await UserService.markInvitationReminderSent(invitation.token, reminderType)
      await UserService.markInvitationEmailSent(invitation.token)
      result.sent += 1
    } else {
      result.failed += 1
    }
  }

  return result
}

export async function POST(request: Request) {
  try {
    const authorized = await isAuthorized(request)
    if (!authorized) {
      return NextResponse.json(
        { message: 'Nicht autorisiert.' },
        { status: 401 }
      )
    }

    const reminder24h = await processReminderBatch('24h')
    const reminder3d = await processReminderBatch('3d')

    return NextResponse.json({
      success: true,
      message: 'Einladungs-Erinnerungen verarbeitet.',
      stats: { reminder24h, reminder3d }
    })
  } catch (error) {
    console.error('Fehler beim Verarbeiten der Einladungs-Erinnerungen:', error)
    return NextResponse.json(
      { message: 'Ein interner Fehler ist aufgetreten.' },
      { status: 500 }
    )
  }
}
