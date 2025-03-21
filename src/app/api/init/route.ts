import { NextResponse } from 'next/server';
import { initializeHabitatTypes } from '@/lib/services/habitat-service';

export async function GET() {
  try {
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