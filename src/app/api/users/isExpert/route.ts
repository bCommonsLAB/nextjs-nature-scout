import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { UserService } from '@/lib/services/user-service';

/**
 * GET /api/users/isExpert - Überprüft, ob der aktuelle Benutzer ein Experte ist
 */
export async function GET(req: NextRequest) {
  try {
    // Erhalte die Benutzer-ID aus der Clerk-Authentifizierung
    const auth = getAuth(req);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json({ isExpert: false }, { status: 401 });
    }

    // Überprüfe, ob der Benutzer Experte ist
    const isExpert = await UserService.isExpert(userId);
    
    return NextResponse.json({ isExpert });
  } catch (error) {
    console.error('Fehler beim Überprüfen des Experten-Status:', error);
    return NextResponse.json({ isExpert: false }, { status: 500 });
  }
} 