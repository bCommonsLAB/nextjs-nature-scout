import { NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';
import { checkAdminAccess } from '@/lib/server-auth';

// GET /api/users - Holt alle Benutzer (nur für Admins)
export async function GET(req: Request) {
  try {
    // Echte Admin-Authentifizierung
    const { isAdmin, error, user } = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Zugriff verweigert. Nur für Admins.' }, { status: 403 });
    }
    
    const users = await UserService.getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Fehler beim Abrufen der Benutzer:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// POST /api/users - Erstellt einen neuen Benutzer oder aktualisiert einen bestehenden
export async function POST(req: Request) {
  try {
    // Echte Admin-Authentifizierung
    const { isAdmin, error, user } = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Zugriff verweigert. Nur für Admins.' }, { status: 403 });
    }
    
    const body = await req.json();
    const { 
      email, 
      name, 
      role, 
      organizationId, 
      organizationName, 
      organizationLogo 
    } = body;
    
    if (!email || !name) {
      return NextResponse.json({ error: 'email und name sind erforderlich' }, { status: 400 });
    }
    
    // Prüfen, ob Benutzer bereits existiert
    const existingUser = await UserService.findByEmail(email);
    
    if (existingUser) {
      // Benutzer aktualisieren
      const updatedUser = await UserService.updateUser(email, { 
        name, 
        role, 
        organizationId, 
        organizationName, 
        organizationLogo 
      });
      return NextResponse.json(updatedUser);
    } else {
      // Neuen Benutzer erstellen
      const newUser = await UserService.createUser({ 
        email, 
        name, 
        role, 
        organizationId, 
        organizationName, 
        organizationLogo 
      });
      return NextResponse.json(newUser, { status: 201 });
    }
  } catch (error) {
    console.error('Fehler beim Erstellen/Aktualisieren des Benutzers:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
} 