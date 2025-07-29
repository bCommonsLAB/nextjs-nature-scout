import { NextRequest, NextResponse } from 'next/server';
import { OrganizationService } from '@/lib/services/organization-service';
import { UserService } from '@/lib/services/user-service';
import { requireAuth } from '@/lib/server-auth';

// GET /api/organizations/[id] - Holt eine bestimmte Organisation
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Echte Authentifizierung
    const currentUser = await requireAuth();
    const userId = currentUser.email;
    
    // Hole die ID mit await
    const { id } = await params;
    
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
    // Echte Authentifizierung
    const currentUser = await requireAuth();
    const userId = currentUser.email;
    const isAdmin = await UserService.isAdmin(currentUser.email);
    
    // Hole die ID mit await
    const { id } = await params;
    
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
    // Echte Authentifizierung
    const currentUser = await requireAuth();
    const userId = currentUser.email;
    const isAdmin = await UserService.isAdmin(currentUser.email);
    
    // Hole die ID mit await
    const { id } = await params;
    
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