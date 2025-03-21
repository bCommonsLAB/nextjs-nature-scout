import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { UserService } from '@/lib/services/user-service';

/**
 * GET /api/users/isBiologist - Überprüft, ob der aktuelle Benutzer ein Biologe ist
 */
export async function GET(req: NextRequest) {
  try {
    // Erhalte die Benutzer-ID aus der Clerk-Authentifizierung
    const auth = getAuth(req);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json({ isBiologist: false }, { status: 401 });
    }

    // Überprüfe, ob der Benutzer Biologe ist
    const isBiologist = await UserService.isBiologist(userId);
    
    return NextResponse.json({ isBiologist });
  } catch (error) {
    console.error('Fehler beim Überprüfen des Biologen-Status:', error);
    return NextResponse.json({ isBiologist: false }, { status: 500 });
  }
} 