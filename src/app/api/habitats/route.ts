import { NextResponse } from 'next/server';
import { createHabitatType } from '@/lib/services/habitat-service';
import type { HabitatType } from '@/lib/services/habitat-service';

export async function POST(request: Request) {
  try {
    const habitatType = await request.json() as Omit<HabitatType, '_id'>;
    
    // Validiere die Eingabedaten
    if (!habitatType.name || !habitatType.description || !Array.isArray(habitatType.typicalSpecies)) {
      return NextResponse.json(
        { error: 'Ungültige Eingabedaten' },
        { status: 400 }
      );
    }

    const result = await createHabitatType(habitatType);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Fehler beim Erstellen des Habitattyps:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
} 