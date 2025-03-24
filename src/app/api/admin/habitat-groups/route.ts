import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllHabitatGroups, 
  updateHabitatGroup, 
  createHabitatGroup,
  initializeHabitatGroups
} from '@/lib/services/habitat-groups-service';
import type { HabitatGroup } from '@/lib/services/habitat-groups-service';

// Initialisiere Daten beim ersten Aufruf
let isInitialized = false;

export async function GET() {
  try {
    // Initialisiere Daten beim ersten Aufruf
    if (!isInitialized) {
      await initializeHabitatGroups();
      isInitialized = true;
    }

    const groups = await getAllHabitatGroups();
    return NextResponse.json(groups);
  } catch (error) {
    console.error('Fehler beim Laden der Habitat-Gruppen:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const groups = await request.json();
    const results = [];

    // Aktualisiere oder erstelle jede Habitat-Gruppe einzeln
    for (const group of groups) {
      if (group.id) {
        // Bestehende Gruppe - Update
        const result = await updateHabitatGroup(group.id, {
          name: group.name,
          description: group.description,
          imageUrl: group.imageUrl,
          pos: group.pos
        });
        if (result) results.push(result);
      } else {
        // Neue Gruppe - Create
        const result = await createHabitatGroup({
          name: group.name,
          description: group.description,
          imageUrl: group.imageUrl,
          pos: group.pos
        });
        results.push(result);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Fehler beim Speichern der Habitat-Gruppen:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    );
  }
} 