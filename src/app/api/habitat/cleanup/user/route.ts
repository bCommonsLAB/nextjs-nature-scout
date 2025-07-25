import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { UserService } from '@/lib/services/user-service';

/**
 * Löscht alle Einträge des aktuell angemeldeten Benutzers basierend auf der E-Mail-Adresse
 */
export async function DELETE() {
  try {
    // TEMPORÄR: Demo-User für Cleanup-Funktionen
    const userId = 'demo-user-123';
    const user = { email: 'demo@example.com' };
    
    // const { userId } = await auth();
    // if (!userId) {
    //   return NextResponse.json(
    //     { error: 'Nicht autorisiert' },
    //     { status: 401 }
    //   );
    // }
    // const user = await UserService.findByClerkId(userId);
    // if (!user) {
    //   return NextResponse.json(
    //     { error: 'Benutzer nicht gefunden' },
    //     { status: 404 }
    //   );
    // }
    
    // Verbindung zur Datenbank herstellen
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    // Lösche alle Einträge des Benutzers basierend auf seiner E-Mail-Adresse
    console.log('Lösche alle Einträge des Benutzers:', user.email);
    const result = await collection.deleteMany({
      'metadata.email': user.email
    });
    
    return NextResponse.json({
      success: true,
      message: `${result.deletedCount} Einträge des Benutzers ${user.email} wurden gelöscht`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Benutzereinträge:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Benutzereinträge' },
      { status: 500 }
    );
  }
} 