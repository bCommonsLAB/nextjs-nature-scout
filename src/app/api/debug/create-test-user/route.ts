import { NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';

/**
 * WARNUNG: Dieser Endpunkt ist NUR FÜR ENTWICKLUNGSZWECKE.
 * Er erstellt einen Testbenutzer in der Datenbank ohne Authentifizierung.
 * Er sollte NICHT in Produktion verfügbar sein.
 */
export async function GET() {
  // Sicherstellen, dass wir nicht in Produktion sind
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Dieser Endpunkt ist nur in Entwicklungsumgebungen verfügbar' },
      { status: 403 }
    );
  }
  
  try {
    // Zufällige ID generieren, um Duplikate zu vermeiden
    const randomId = `test_${Math.random().toString(36).substring(2, 10)}`;
    
    // Erstelle einen Testbenutzer
    const user = await UserService.createUser({
      clerkId: randomId,
      email: `test-${randomId}@example.com`,
      name: `Test User ${randomId}`,
      role: 'user'
    });
    
    // Prüfe alle Benutzer nach der Erstellung
    const allUsers = await UserService.getAllUsers();
    
    return NextResponse.json({
      message: 'Testbenutzer erfolgreich erstellt',
      createdUser: user,
      allUsers
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Testbenutzers:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: (error as Error).message },
      { status: 500 }
    );
  }
} 