import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';
import { requireAuth } from '@/lib/server-auth';

/**
 * GET /api/users/isAdmin - Prüft Admin-Rechte des aktuellen Benutzers
 */
export async function GET(req: Request) {
  try {
    const currentUser = await requireAuth();
    const isAdmin = await UserService.isAdmin(currentUser.email);
    
    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error('Fehler beim Überprüfen des Admin-Status:', error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
} 