import { NextRequest, NextResponse } from 'next/server';
import { OrganizationService } from '@/lib/services/organization-service';
import { UserService } from '@/lib/services/user-service';
import { requireAuth } from '@/lib/server-auth';

// GET /api/organizations - Holt alle Organisationen (für alle authentifizierten Benutzer)
export async function GET(request: Request) {
  try {
    // Echte Authentifizierung
    const currentUser = await requireAuth();
    const userId = currentUser.email;
    const isAdmin = await UserService.isAdmin(currentUser.email);
    
    // Alle authentifizierten Benutzer können Organisationen sehen, ohne Admin-Überprüfung
    const organizations = await OrganizationService.getAllOrganizations();
    
    // Für nicht-Admins könnten wir die Daten einschränken, falls nötig
    if (!isAdmin) {
      // Hier könnten wir sensible Felder entfernen, wenn nötig
      // Für jetzt geben wir die kompletten Daten zurück
    }
    
    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Fehler beim Abrufen der Organisationen:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// POST /api/organizations - Erstellt eine neue Organisation (nur für Admins)
export async function POST(request: Request) {
  try {
    // Echte Authentifizierung
    const currentUser = await requireAuth();
    const userId = currentUser.email;
    const isAdmin = await UserService.isAdmin(currentUser.email);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Zugriff verweigert. Nur für Admins.' }, { status: 403 });
    }
    
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });
    }
    
    // Neue Organisation erstellen
    const newOrganization = await OrganizationService.createOrganization(body);
    return NextResponse.json(newOrganization, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen der Organisation:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
} 