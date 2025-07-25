import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/users/isAdmin - TEMPORÄR: Alle Benutzer sind Admins (Demo-Modus)
 */
export async function GET(req: Request) {
  try {
    // TEMPORÄR: Alle Benutzer sind Admins (für Demo-Modus ohne Auth)
    const isAdmin = true;
    
    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error('Fehler beim Überprüfen des Admin-Status:', error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
} 