import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { UserService } from '@/lib/services/user-service';

/**
 * GET /api/users/hasAdvancedPermissions - Überprüft, ob der aktuelle Benutzer erweiterte Rechte hat
 * (Benutzer ist entweder Experte, Admin oder Superadmin)
 */
export async function GET(req: NextRequest) {
  try {
    // Erhalte die Benutzer-ID aus der Clerk-Authentifizierung
    const auth = getAuth(req);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json({ hasAdvancedPermissions: false }, { status: 401 });
    }

    // Überprüfe, ob der Benutzer erweiterte Rechte hat
    const hasAdvancedPermissions = await UserService.hasAdvancedPermissions(userId);
    
    return NextResponse.json({ hasAdvancedPermissions });
  } catch (error) {
    console.error('Fehler beim Überprüfen der erweiterten Berechtigungen:', error);
    return NextResponse.json({ hasAdvancedPermissions: false }, { status: 500 });
  }
} 