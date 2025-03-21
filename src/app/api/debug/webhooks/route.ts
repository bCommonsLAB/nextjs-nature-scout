import { NextRequest, NextResponse } from 'next/server';

// Speichere die letzten empfangenen Webhook-Events (max 10)
const MAX_EVENTS = 10;
const webhookEvents: any[] = [];

/**
 * Fügt ein neues Webhook-Event zur Debug-Liste hinzu
 */
export function addWebhookEvent(event: any) {
  webhookEvents.unshift({
    timestamp: new Date().toISOString(),
    event
  });
  
  // Halte die Liste auf MAX_EVENTS Einträge begrenzt
  if (webhookEvents.length > MAX_EVENTS) {
    webhookEvents.pop();
  }
}

/**
 * GET /api/debug/webhooks - Zeigt die letzten empfangenen Webhook-Events
 */
export async function GET(req: NextRequest) {
  return NextResponse.json(webhookEvents);
} 