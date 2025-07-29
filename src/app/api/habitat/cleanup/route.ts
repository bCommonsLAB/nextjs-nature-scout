import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { UserService } from '@/lib/services/user-service';
import { requireAuth } from '@/lib/server-auth';

/**
 * Löscht alle Einträge ohne result-Objekt oder mit leerem result-Objekt
 * Nur für Administratoren verfügbar
 */
export async function DELETE() {
  try {
    // Echte Authentifizierung
    const currentUser = await requireAuth();
    const userId = currentUser.email;
    const isAdmin = await UserService.isAdmin(currentUser.email);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Zugriff verweigert. Nur Administratoren können diese Aktion ausführen.' },
        { status: 403 }
      );
    }
    
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