import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { requireAuth } from '@/lib/server-auth';
import { UserService } from '@/lib/services/user-service';

/**
 * Löscht alle Einträge des aktuell angemeldeten Benutzers basierend auf der E-Mail-Adresse
 */
export async function DELETE() {
  try {
    // Echte Authentifizierung
    const currentUser = await requireAuth();
    const userId = currentUser.email;
    const user = { email: currentUser.email };
    
    
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