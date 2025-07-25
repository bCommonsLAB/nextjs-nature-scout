import { NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';

// GET /api/users - Holt alle Benutzer (nur für Admins)
export async function GET(req: Request) {
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
    
    const body = await req.json();
    const { 
      clerkId, 
      email, 
      name, 
      role, 
      organizationId, 
      organizationName, 
      organizationLogo 
    } = body;
    
    if (!clerkId || !email || !name) {
      return NextResponse.json({ error: 'clerkId, email und name sind erforderlich' }, { status: 400 });
    }
    
    // Prüfen, ob Benutzer bereits existiert
    const existingUser = await UserService.findByClerkId(clerkId);
    
    if (existingUser) {
      // Benutzer aktualisieren
      const updatedUser = await UserService.updateUser(clerkId, { 
        email, 
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
        clerkId, 
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