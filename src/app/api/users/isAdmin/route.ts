import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { UserService } from '@/lib/services/user-service';

/**
 * GET /api/users/isAdmin - Überprüft, ob der aktuelle Benutzer Admin-Rechte hat
 */
export async function GET(req: NextRequest) {
  try {
    // Erhalte die Benutzer-ID aus der Clerk-Authentifizierung
    const auth = getAuth(req);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    // Überprüfe, ob der Benutzer Admin-Rechte hat
    const isAdmin = await UserService.isAdmin(userId);
    
    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error('Fehler beim Überprüfen des Admin-Status:', error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
} 