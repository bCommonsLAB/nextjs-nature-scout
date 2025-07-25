import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { UserService } from '@/lib/services/user-service';

// GET /api/users/[email] - Holt einen bestimmten Benutzer
export async function GET(
  req: Request,
  { params }: { params: { email: string } }
) {
  try {
    // Echte Authentifizierung
    const currentUser = await requireAuth();
    
    // Hole die E-Mail (URL-dekodiert)
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);
    
    // Benutzer kann nur seine eigenen Daten sehen (außer Admins)
    if (currentUser.email !== email) {
      const isAdmin = await UserService.isAdmin(currentUser.email);
      if (!isAdmin) {
        return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
      }
    }
    
    const user = await UserService.findByEmail(email);
    
    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Fehler beim Abrufen des Benutzers:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// PATCH /api/users/[email] - Aktualisiert einen bestimmten Benutzer
export async function PATCH(
  req: Request,
  { params }: { params: { email: string } }
) {
  try {
    // Echte Authentifizierung
    const currentUser = await requireAuth();
    const userEmail = currentUser.email;
    
    // Hole die E-Mail (URL-dekodiert)
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);
    
    // Echte Admin-Prüfung
    const isAdmin = await UserService.isAdmin(currentUser.email);
    const isSelf = currentUser.email === email;
    
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }
    
    const body = await req.json();
    const { 
      name, 
      newEmail, 
      role, 
      organizationId, 
      organizationName,
      organizationLogo,
      consent_data_processing, 
      consent_image_ccby, 
      habitat_name_visibility 
    } = body;
    
    // Prüfen, ob dem aktuellen Benutzer die Admin-Rolle entzogen werden soll
    if (isAdmin && role && isSelf && role !== 'admin' && role !== 'superadmin') {
      // Prüfen, ob dieser Benutzer der letzte Admin ist
      const allUsers = await UserService.getAllUsers();
      const adminUsers = allUsers.filter(user => 
        (user.role === 'admin' || user.role === 'superadmin') && user.email !== email
      );
      
      // Wenn dies der letzte Admin ist, verweigere die Änderung
      if (adminUsers.length === 0) {
        return NextResponse.json({ 
          error: 'Diese Änderung kann nicht durchgeführt werden. Es muss mindestens ein Administrator im System verbleiben.',
          isLastAdmin: true 
        }, { status: 403 });
      }
    }
    
    // Normale Benutzer dürfen ihre Rolle nicht ändern, aber ihre Consent-Einstellungen
    const updateData = {
      ...(name !== undefined ? { name } : {}), 
      ...(newEmail !== undefined ? { email: newEmail } : {}),
      ...(isAdmin && role ? { role } : {}),
      ...(organizationId !== undefined ? { organizationId } : {}),
      ...(organizationName !== undefined ? { organizationName } : {}),
      ...(organizationLogo !== undefined ? { organizationLogo } : {}),
      // Consent-Felder können vom Benutzer selbst aktualisiert werden
      ...(consent_data_processing !== undefined ? { consent_data_processing } : {}),
      ...(consent_image_ccby !== undefined ? { consent_image_ccby } : {}),
      ...(habitat_name_visibility !== undefined ? { habitat_name_visibility } : {})
    };
    
    const updatedUser = await UserService.updateUser(email, updateData);
    
    if (!updatedUser) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Benutzers:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// DELETE /api/users/[email] - Löscht einen bestimmten Benutzer
export async function DELETE(
  req: Request,
  { params }: { params: { email: string } }
) {
  try {
    // Echte Authentifizierung
    const currentUser = await requireAuth();
    
    // Hole die E-Mail (URL-dekodiert)
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);
    
    // Echte Admin-Prüfung
    const isAdmin = await UserService.isAdmin(currentUser.email);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Zugriff verweigert. Nur für Admins.' }, { status: 403 });
    }
    
    // Prüfen, ob der zu löschende Benutzer ein Admin ist
    const userToDelete = await UserService.findByEmail(email);
    if (userToDelete && (userToDelete.role === 'admin' || userToDelete.role === 'superadmin')) {
      // Prüfen, ob dies der letzte Admin ist
      const allUsers = await UserService.getAllUsers();
      const adminUsers = allUsers.filter(user => 
        (user.role === 'admin' || user.role === 'superadmin') && user.email !== email
      );
      
      // Wenn dies der letzte Admin ist, verweigere das Löschen
      if (adminUsers.length === 0) {
        return NextResponse.json({ 
          error: 'Der letzte Administrator kann nicht gelöscht werden. Es muss mindestens ein Administrator im System verbleiben.',
          isLastAdmin: true 
        }, { status: 403 });
      }
    }
    
    const success = await UserService.deleteUser(email);
    
    if (!success) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen des Benutzers:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
} 