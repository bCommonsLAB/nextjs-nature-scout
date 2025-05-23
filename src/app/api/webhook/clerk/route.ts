import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { UserService } from '@/lib/services/user-service';

export async function POST(req: NextRequest) {
  // Webhook Secret aus Umgebungsvariablen
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || process.env.CLERK_WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    console.error('Kein Webhook Secret gefunden in der Umgebung');
    return NextResponse.json(
      { error: 'Webhook Secret fehlt in den Umgebungsvariablen' },
      { status: 500 }
    );
  }
  
  // Header abrufen - in Next.js 15 muss headers() mit await abgerufen werden
  const headersList = await headers();
  const svix_id = headersList.get('svix-id');
  const svix_timestamp = headersList.get('svix-timestamp');
  const svix_signature = headersList.get('svix-signature');
  
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Fehlende SVIX Header:', { svix_id, svix_timestamp, svix_signature });
    return NextResponse.json({ error: 'Fehlende SVIX Header' }, { status: 400 });
  }
  
  // Body verarbeiten
  const payload = await req.json();
  const body = JSON.stringify(payload);
  
  // Webhook verifizieren
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;
  
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
    
    console.log('Webhook erfolgreich verifiziert:', evt.type);
    
    // Event verarbeiten
    return await handleWebhookEvent(evt);
    
  } catch (err) {
    console.error('Webhook Verifizierungsfehler:', err);
    return NextResponse.json(
      { error: 'Webhook Verifizierungsfehler' }, 
      { status: 400 }
    );
  }
}

async function handleWebhookEvent(evt: WebhookEvent) {
  const eventType = evt.type;
  console.log(`Verarbeite Webhook-Event: ${eventType}`, JSON.stringify(evt.data, null, 2));
  
  // Verarbeite session.created Events - Aktualisiere lastAccess
  if (eventType === 'session.created') {
    const { user_id } = evt.data;
    
    if (!user_id) {
      console.error('Keine Benutzer-ID in den Session-Daten gefunden');
      return NextResponse.json({ error: 'Keine Benutzer-ID vorhanden' }, { status: 400 });
    }
    
    try {
      // Aktualisiere das lastAccess-Datum des Benutzers
      const _updatedUser = await UserService.updateLastAccess(user_id);
      
      return NextResponse.json({ success: true, action: 'lastAccessUpdated' });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des lastAccess-Datums:', error);
      
      return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
    }
  }
  
  if (eventType === 'user.created' || eventType === 'user.updated') {
    console.log('Verarbeite Benutzer-Event:', eventType);
    
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    console.log('Benutzer-Daten:', { id, email_addresses, first_name, last_name });
    
    // Extrahiere E-Mail aus dem email_addresses Array
    const email = email_addresses && email_addresses.length > 0 ? 
      email_addresses[0]?.email_address : null;
    
    // Erstelle einen formatierten Namen aus first_name und last_name
    const name = `${first_name || ''} ${last_name || ''}`.trim();
    
    console.log('Extrahierte Daten:', { id, email, name });
    
    if (!id) {
      console.error('Keine Benutzer-ID in den Webhook-Daten gefunden');
      return NextResponse.json({ error: 'Keine Benutzer-ID vorhanden' }, { status: 400 });
    }
    
    if (!email) {
      console.error('Keine E-Mail-Adresse in den Webhook-Daten gefunden');
      return NextResponse.json({ error: 'Keine E-Mail-Adresse vorhanden' }, { status: 400 });
    }
    
    try {
      // Prüfen, ob Benutzer bereits existiert - entweder nach clerkId oder E-Mail suchen
      let existingUser = await UserService.findByClerkId(id);
      
      // Falls kein Benutzer anhand der clerkId gefunden wurde, nach E-Mail suchen
      if (!existingUser) {
        existingUser = await UserService.findByEmail(email);
      }
      
      console.log('Existierender Benutzer gefunden?', !!existingUser);
      
      if (existingUser) {
        console.log('Benutzer wird aktualisiert:', existingUser.email);
        
        // Falls der Benutzer eine temporäre ID hat (aus dem Habitat-Import), mit der tatsächlichen Clerk-ID aktualisieren
        if (existingUser.clerkId.startsWith('temp_')) {
          console.log(`Temporäre Clerk-ID wird aktualisiert: ${existingUser.clerkId} -> ${id}`);
        }
        
        // Benutzer aktualisieren - immer die clerkId aktualisieren, falls es ein importierter Benutzer war
        const _updatedUser = await UserService.updateUser(existingUser.clerkId, { 
          clerkId: id, // Stelle sicher, dass die tatsächliche Clerk-ID verwendet wird
          email, 
          name,
          // Füge ein Profilbild hinzu, wenn vorhanden
          ...(image_url && { image: image_url })
        });
        
        return NextResponse.json({ success: true, action: 'updated' });
      } else {
        console.log('Neuer Benutzer wird erstellt:', id);
        // Neuen Benutzer erstellen
        const newUser = await UserService.createUser({
          clerkId: id,
          email,
          name,
          role: 'user', // Standardmäßig ein normaler Benutzer
        });
        
        console.log('Neuer Benutzer erstellt:', newUser);
        
        return NextResponse.json({ success: true, action: 'created' });
      }
    } catch (error) {
      console.error('Fehler beim Verarbeiten des Webhooks:', error);
      
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
      
      return NextResponse.json({ success: true, action: 'deleted' });
    } catch (error) {
      console.error('Fehler beim Löschen des Benutzers:', error);
      
      return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
    }
  }
  
  return NextResponse.json({ received: true });
}

// Andere HTTP-Methoden auch auf POST umleiten
export const GET = POST;
export const PUT = POST; 