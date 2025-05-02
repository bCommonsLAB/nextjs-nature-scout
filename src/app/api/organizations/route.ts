import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { UserService } from '@/lib/services/user-service';
import { OrganizationService } from '@/lib/services/organization-service';

// GET /api/organizations - Holt alle Organisationen (nur für Admins)
export async function GET(req: NextRequest) {
  try {
    const auth = getAuth(req);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    
    // Prüfe, ob der anfragende Benutzer ein Admin ist
    const isAdmin = await UserService.isAdmin(userId);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Zugriff verweigert. Nur für Admins.' }, { status: 403 });
    }
    
    const organizations = await OrganizationService.getAllOrganizations();
    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Fehler beim Abrufen der Organisationen:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// POST /api/organizations - Erstellt eine neue Organisation (nur für Admins)
export async function POST(req: NextRequest) {
  try {
    const auth = getAuth(req);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    
    // Nur Admins dürfen Organisationen erstellen
    const isAdmin = await UserService.isAdmin(userId);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Zugriff verweigert. Nur für Admins.' }, { status: 403 });
    }
    
    const body = await req.json();
    
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