import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';
import { requireAuth } from '@/lib/server-auth';

/**
 * GET /api/users/isExpert - Prüft Experten-Rechte des aktuellen Benutzers
 */
export async function GET(req: Request) {
  try {
    const currentUser = await requireAuth();
    const isExpert = await UserService.isExpert(currentUser.email);
    
    return NextResponse.json({ isExpert });
  } catch (error) {
    console.error('Fehler beim Überprüfen des Experten-Status:', error);
    return NextResponse.json({ isExpert: false }, { status: 500 });
  }
} 