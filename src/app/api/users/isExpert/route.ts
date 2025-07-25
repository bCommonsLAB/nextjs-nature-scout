import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/users/isExpert - TEMPORÄR: Alle Benutzer sind Experten (Demo-Modus)
 */
export async function GET(req: Request) {
  try {
    // TEMPORÄR: Alle Benutzer sind Experten (für Demo-Modus ohne Auth)
    const isExpert = true;
    
    return NextResponse.json({ isExpert });
  } catch (error) {
    console.error('Fehler beim Überprüfen des Experten-Status:', error);
    return NextResponse.json({ isExpert: false }, { status: 500 });
  }
} 