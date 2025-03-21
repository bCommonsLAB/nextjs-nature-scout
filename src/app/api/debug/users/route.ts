import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';

/**
 * WARNUNG: Dieser Endpunkt ist NUR FÜR ENTWICKLUNGSZWECKE.
 * Gibt alle Benutzer zurück, ohne Zugangsbeschränkung zu prüfen.
 * Er sollte NICHT in Produktion verfügbar sein.
 */
export async function GET(req: NextRequest) {
  // Sicherstellen, dass wir nicht in Produktion sind
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Dieser Endpunkt ist nur in Entwicklungsumgebungen verfügbar' },
      { status: 403 }
    );
  }
  
  try {
    const users = await UserService.getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Fehler beim Abrufen der Benutzer:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: (error as Error).message },
      { status: 500 }
    );
  }
} 