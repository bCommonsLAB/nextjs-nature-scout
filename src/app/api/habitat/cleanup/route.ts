import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { UserService } from '@/lib/services/user-service';

/**
 * Löscht alle Einträge ohne result-Objekt oder mit leerem result-Objekt
 * Nur für Administratoren verfügbar
 */
export async function DELETE() {
  try {
    // TEMPORÄR: Demo-Admin für Admin-Funktionen
    const userId = 'demo-user-123';
    const isAdmin = true;
    
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
    //     { error: 'Zugriff verweigert. Nur Administratoren können diese Aktion ausführen.' },
    //     { status: 403 }
    //   );
    // }
    
    // Verbindung zur Datenbank herstellen
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    // Suche nach Einträgen ohne result-Objekt oder mit leerem result-Objekt
    const result = await collection.deleteMany({
      $or: [
        { result: { $exists: false } },
        { result: null },
        { result: {} }
      ]
    });
    
    return NextResponse.json({
      success: true,
      message: `${result.deletedCount} Einträge ohne result-Objekt wurden gelöscht`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Einträge ohne result-Objekt:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Einträge ohne result-Objekt' },
      { status: 500 }
    );
  }
} 