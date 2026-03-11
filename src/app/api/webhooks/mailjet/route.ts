import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'
import { logInviteError, logInviteInfo } from '@/lib/invitation-logger'

interface MailjetEventPayload {
  event?: string
  time?: number | string
  error?: string
  error_related_to?: string
  CustomID?: string
  custom_id?: string
  customcampaign?: string
}

function extractEvents(payload: unknown): MailjetEventPayload[] {
  if (Array.isArray(payload)) return payload as MailjetEventPayload[]
  if (payload && typeof payload === 'object') {
    const asObject = payload as Record<string, unknown>
    if (Array.isArray(asObject.Events)) return asObject.Events as MailjetEventPayload[]
    return [asObject as MailjetEventPayload]
  }
  return []
}

function extractToken(customId?: string): string | null {
  if (!customId) return null
  // Neuer Standard: reiner Token (64 Zeichen)
  if (/^[a-f0-9]{64}$/i.test(customId)) return customId
  // Rückwärtskompatibel für bereits versendete Events mit altem Präfix
  if (customId.startsWith('invite:')) return customId.slice('invite:'.length)
  return null
}

function parseEventTime(value?: number | string): Date {
  if (!value) return new Date()
  if (typeof value === 'number') return new Date(value * 1000)
  const asNumber = Number(value)
  if (!Number.isNaN(asNumber)) return new Date(asNumber * 1000)
  const asDate = new Date(value)
  if (!Number.isNaN(asDate.getTime())) return asDate
  return new Date()
}

export async function POST(request: Request) {
  try {
    const expectedSecret = process.env.MAILJET_WEBHOOK_SECRET
    if (expectedSecret) {
      const receivedSecret = new URL(request.url).searchParams.get('secret')
      if (!receivedSecret || receivedSecret !== expectedSecret) {
        return NextResponse.json(
          { message: 'Ungültige Webhook-Autorisierung.' },
          { status: 401 }
        )
      }
    }

    const payload = await request.json()
    const events = extractEvents(payload)
    logInviteInfo('mailjet.webhook.received', {
      receivedEvents: events.length
    })
    let processed = 0

    for (const event of events) {
      const customId = event.CustomID || event.custom_id || event.customcampaign
      const token = extractToken(customId)
      if (!token || !event.event) continue

      const eventTime = parseEventTime(event.time)
      const errorMessage = event.error || event.error_related_to
      const updated = await UserService.applyInvitationMailEvent(token, event.event, eventTime, errorMessage)
      if (updated) processed += 1
    }
    logInviteInfo('mailjet.webhook.processed', {
      receivedEvents: events.length,
      processedEvents: processed
    })

    return NextResponse.json({
      success: true,
      processed,
      received: events.length
    })
  } catch (error) {
    logInviteError('mailjet.webhook.failed', {
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json(
      { message: 'Fehler beim Verarbeiten des Webhooks.' },
      { status: 500 }
    )
  }
}
