import { NextResponse } from 'next/server';
import { initializeHabitatTypes } from '@/lib/services/habitat-service';
import { requireAdmin } from '@/lib/server-auth';

export async function GET() {
  try {
    // Nur Administratoren (siehe specs/regeln/rollen-und-rechte.md)
    await requireAdmin();

    await initializeHabitatTypes();
    return NextResponse.json({ message: 'Habitattypen erfolgreich initialisiert' });
  } catch (error) {
    console.error('Fehler bei der Initialisierung der Habitattypen:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Initialisierung der Habitattypen' },
      { status: 500 }
    );
  }
} 