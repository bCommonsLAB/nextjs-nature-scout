import { NextRequest, NextResponse } from 'next/server';
import { getAllHabitatTypes, updateHabitatType, createHabitatType } from '@/lib/services/habitat-service';
import type { HabitatType } from '@/lib/services/habitat-service';

export async function GET() {
  try {
    const types = await getAllHabitatTypes();
    return NextResponse.json(types);
  } catch (error) {
    console.error('Fehler beim Laden der Habitat-Typen:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const types = await request.json();
    const results = [];

    // Aktualisiere oder erstelle jeden Habitat-Typ einzeln
    for (const type of types) {
      if (type.id) {
        // Bestehender Typ - Update
        const result = await updateHabitatType(type.id, {
          name: type.name,
          description: type.description,
          typicalSpecies: type.typicalSpecies
        });
        if (result) results.push(result);
      } else {
        // Neuer Typ - Create
        const result = await createHabitatType({
          name: type.name,
          description: type.description,
          typicalSpecies: type.typicalSpecies
        });
        results.push(result);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Fehler beim Speichern der Habitat-Typen:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    );
  }
} 