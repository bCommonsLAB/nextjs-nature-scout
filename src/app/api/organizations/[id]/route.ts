import { NextRequest, NextResponse } from 'next/server';
import { OrganizationService } from '@/lib/services/organization-service';

// GET /api/organizations/[id] - Holt eine bestimmte Organisation
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // TEMPORÄR: Demo-Admin für Core-Funktionen
    const userId = 'demo-user-123';
    
    // const auth = getAuth(req);
    // const userId = auth.userId;
    // if (!userId) {
    //   return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    // }
    
    // Hole die ID mit await
    const id = params.id;
    
    // Hol die Organisation nach ID
    const organization = await OrganizationService.findById(id);
    
    if (!organization) {
      return NextResponse.json({ error: 'Organisation nicht gefunden' }, { status: 404 });
    }
    
    return NextResponse.json(organization);
  } catch (error) {
    console.error('Fehler beim Abrufen der Organisation:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// PATCH /api/organizations/[id] - Aktualisiert eine Organisation (nur für Admins)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // TEMPORÄR: Demo-Admin für Core-Funktionen
    const userId = 'demo-user-123';
    const isAdmin = true;
    
    // const auth = getAuth(req);
    // const userId = auth.userId;
    // if (!userId) {
    //   return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    // }
    // const isAdmin = await UserService.isAdmin(userId);
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Zugriff verweigert. Nur für Admins.' }, { status: 403 });
    // }
    
    // Hole die ID mit await
    const id = params.id;
    
    const body = await req.json();
    
    // Prüfe, ob Organisation existiert
    const organization = await OrganizationService.findById(id);
    
    if (!organization) {
      return NextResponse.json({ error: 'Organisation nicht gefunden' }, { status: 404 });
    }
    
    // Organisation aktualisieren
    const updatedOrganization = await OrganizationService.updateOrganization(id, body);
    
    return NextResponse.json(updatedOrganization);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Organisation:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// DELETE /api/organizations/[id] - Löscht eine Organisation (nur für Admins)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // TEMPORÄR: Demo-Admin für Core-Funktionen
    const userId = 'demo-user-123';
    const isAdmin = true;
    
    // const auth = getAuth(req);
    // const userId = auth.userId;
    // if (!userId) {
    //   return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    // }
    // const isAdmin = await UserService.isAdmin(userId);
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Zugriff verweigert. Nur für Admins.' }, { status: 403 });
    // }
    
    // Hole die ID mit await
    const id = params.id;
    
    // Prüfe, ob Organisation existiert
    const organization = await OrganizationService.findById(id);
    
    if (!organization) {
      return NextResponse.json({ error: 'Organisation nicht gefunden' }, { status: 404 });
    }
    
    // Organisation löschen
    const deleted = await OrganizationService.deleteOrganization(id);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Fehler beim Löschen der Organisation' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen der Organisation:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
} 