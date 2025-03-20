import { IncomingHttpHeaders } from 'http';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { Webhook, WebhookRequiredHeaders } from 'svix';
import { UserService } from '@/lib/services/user-service';
import { addWebhookEvent } from '../../debug/webhooks/route';

// Clerk Webhook Secret aus Umgebungsvariablen
const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const payload = await req.json();
  
  // In Next.js 15 ist headers() eine asynchrone Funktion
  const headersList = await headers();
  const svixId = headersList.get('svix-id') || '';
  const svixTimestamp = headersList.get('svix-timestamp') || '';
  const svixSignature = headersList.get('svix-signature') || '';
  
  // Füge Event zur Debug-Liste hinzu
  addWebhookEvent({
    type: 'webhook_received',
    payload,
    headers: {
      svixId,
      svixTimestamp,
      hasSignature: !!svixSignature
    }
  });
  
  console.log("Webhook empfangen:", { 
    svixId, 
    svixTimestamp, 
    hasSignature: !!svixSignature, 
    eventType: payload.type 
  });
  
  // Bei fehlendem Webhook-Secret nur für Entwicklungszwecke trotzdem fortfahren
  if (!webhookSecret) {
    console.warn("CLERK_WEBHOOK_SECRET fehlt in der .env-Datei. Überspringe Verifikation.");
    return handleWebhookEvent(payload);
  }
  
  // Validiere Webhook
  const wh = new Webhook(webhookSecret);
  let evt: Event;
  
  try {
    evt = wh.verify(
      JSON.stringify(payload),
      {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature
      } as IncomingHttpHeaders & WebhookRequiredHeaders
    ) as Event;
    
    // Füge verifiziertes Event zur Debug-Liste hinzu
    addWebhookEvent({
      type: 'webhook_verified',
      event: evt
    });
  } catch (err) {
    console.error('Fehler bei der Webhook-Verifizierung:', err);
    
    // Fehler zur Debug-Liste hinzufügen
    addWebhookEvent({
      type: 'webhook_verification_error',
      error: (err as Error).message
    });
    
    return NextResponse.json({ error: 'Ungültiger Webhook' }, { status: 400 });
  }
  
  return handleWebhookEvent(evt);
}

async function handleWebhookEvent(evt: Event) {
  const eventType = evt.type;
  console.log(`Verarbeite Webhook-Event: ${eventType}`);
  
  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses && email_addresses[0]?.email_address;
    const name = `${first_name || ''} ${last_name || ''}`.trim();
    
    if (!id || !email) {
      // Fehler zur Debug-Liste hinzufügen
      addWebhookEvent({
        type: 'incomplete_user_data',
        data: evt.data
      });
      return NextResponse.json({ error: 'Unvollständige Benutzerdaten' }, { status: 400 });
    }
    
    try {
      // Prüfen, ob Benutzer bereits existiert
      const existingUser = await UserService.findByClerkId(id);
      
      if (existingUser) {
        // Benutzer aktualisieren
        const updatedUser = await UserService.updateUser(id, { email, name });
        
        // Erfolg zur Debug-Liste hinzufügen
        addWebhookEvent({
          type: 'user_updated',
          userId: id,
          email,
          name,
          result: updatedUser
        });
        
        return NextResponse.json({ success: true, action: 'updated' });
      } else {
        // Neuen Benutzer erstellen
        const newUser = await UserService.createUser({
          clerkId: id,
          email,
          name,
          role: 'user', // Standardmäßig ein normaler Benutzer
        });
        
        // Erfolg zur Debug-Liste hinzufügen
        addWebhookEvent({
          type: 'user_created',
          userId: id,
          email,
          name,
          result: newUser
        });
        
        return NextResponse.json({ success: true, action: 'created' });
      }
    } catch (error) {
      console.error('Fehler beim Verarbeiten des Webhooks:', error);
      
      // Fehler zur Debug-Liste hinzufügen
      addWebhookEvent({
        type: 'user_processing_error',
        userId: id,
        email,
        name,
        error: (error as Error).message
      });
      
      return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
    }
  }
  
  if (eventType === 'user.deleted') {
    const { id } = evt.data;
    
    if (!id) {
      return NextResponse.json({ error: 'Keine Benutzer-ID angegeben' }, { status: 400 });
    }
    
    try {
      await UserService.deleteUser(id);
      
      // Erfolg zur Debug-Liste hinzufügen
      addWebhookEvent({
        type: 'user_deleted',
        userId: id
      });
      
      return NextResponse.json({ success: true, action: 'deleted' });
    } catch (error) {
      console.error('Fehler beim Löschen des Benutzers:', error);
      
      // Fehler zur Debug-Liste hinzufügen
      addWebhookEvent({
        type: 'user_deletion_error',
        userId: id,
        error: (error as Error).message
      });
      
      return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
    }
  }
  
  // Unbekanntes Event zur Debug-Liste hinzufügen
  addWebhookEvent({
    type: 'unknown_event_type',
    eventType
  });
  
  return NextResponse.json({ received: true });
}

// Andere HTTP-Methoden auch auf POST umleiten
export const GET = POST;
export const PUT = POST;

interface EmailAddress {
  email_address: string;
}

interface Event {
  data: {
    id: string;
    email_addresses?: EmailAddress[];
    first_name?: string;
    last_name?: string;
  };
  type: string;
} 