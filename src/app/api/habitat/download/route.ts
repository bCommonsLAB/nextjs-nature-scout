import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { UserService } from '@/lib/services/user-service';
import { requireAuth } from '@/lib/server-auth';

export async function GET() {
  try {
    // Echte Authentifizierung
    const currentUser = await requireAuth();
    const userId = currentUser.email;
    const isAdmin = await UserService.isAdmin(currentUser.email);
    
    // const { userId } = await auth();
    // if (!userId) {
    //   return NextResponse.json(
    //     { error: 'Nicht autorisiert' },
    //     { status: 401 }
    //   );
    // }
    // const isAdmin = await UserService.isAdmin(userId);
    // if (!isAdmin) {
    //   return NextResponse.json(
    //     { error: 'Zugriff verweigert. Nur Administratoren können Habitat-Daten herunterladen.' },
    //     { status: 403 }
    //   );
    // }
    
    // Verbindung zur Datenbank herstellen
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    // Alle Einträge abrufen (eventuell limitiert, um Überlastung zu vermeiden)
    const entries = await collection.find({}).toArray();
    
    // Datum im Dateinamen verwenden
    const dateString = new Date().toISOString().split('T')[0];
    
    // JSON-Daten zurückgeben mit Dateinamen
    return new NextResponse(JSON.stringify(entries, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="habitat-daten-${dateString}.json"`
      }
    });
  } catch (error) {
    console.error('Fehler beim Herunterladen der Habitat-Daten:', error);
    return NextResponse.json(
      { error: 'Fehler beim Herunterladen der Habitat-Daten' },
      { status: 500 }
    );
  }
} 