import { NextResponse } from 'next/server';

// Leichter Erreichbarkeits-Endpoint für den Online-/Offline-Check (Session 1.5).
// Kein DB-Zugriff, keine Auth – bewusst minimal und nicht gecacht.
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function HEAD() {
  return new Response(null, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
