import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    // Authentifizierung prüfen
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }
    
    const db = await connectToDatabase();
    const collection = db.collection('habitatTypes');
    
    // Abfrage aller Habitattypen aus der Kollektion
    const habitatTypes = await collection.find({}).toArray();
    
    // Sortiere die Habitattypen alphabetisch nach Namen
    const sortedHabitatTypes = habitatTypes.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    
    return NextResponse.json(sortedHabitatTypes);
  } catch (error) {
    console.error('Fehler beim Abrufen der Habitattypen:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Habitattypen' },
      { status: 500 }
    );
  }
} 