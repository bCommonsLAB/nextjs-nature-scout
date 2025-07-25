import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { UserService } from '@/lib/services/user-service';

/**
 * POST /api/habitat/repair
 * Repariert Organisationsdaten in Habitaten basierend auf der E-Mail des Erfassers.
 * Nur für Administratoren.
 */
export async function POST(request: Request) {
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
    //     { error: 'Diese Funktion ist nur für Administratoren verfügbar' },
    //     { status: 403 }
    //   );
    // }
    
    const db = await connectToDatabase();
    const habitats = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    const stats = {
      total: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      noUserFound: 0
    };
    
    // Hole alle Habitate, die nicht als gelöscht markiert sind
    const cursor = habitats.find({ deleted: { $ne: true } });
    
    // Gehe alle Habitate durch
    while (await cursor.hasNext()) {
      stats.total++;
      const habitat = await cursor.next();
      
      // Prüfe, ob das Habitat und die E-Mail des Erfassers existieren
      if (!habitat || !habitat.metadata || !habitat.metadata.email) {
        stats.skipped++;
        continue;
      }
      
      try {
        // Suche den Benutzer anhand der E-Mail
        const user = await UserService.findByEmail(habitat.metadata.email);
        
        if (!user) {
          stats.noUserFound++;
          continue;
        }
        
        // Aktualisiere die Organisationsdaten im Habitat
        await habitats.updateOne(
          { _id: habitat._id },
          { 
            $set: { 
              'metadata.organizationId': user.organizationId || null,
              'metadata.organizationName': user.organizationName || null,
              'metadata.organizationLogo': user.organizationLogo || null
            } 
          }
        );
        
        stats.updated++;
      } catch (error) {
        console.error(`Fehler bei Habitat ${habitat._id}:`, error);
        stats.errors++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Habitat-Reparatur abgeschlossen',
      stats
    });
  } catch (error) {
    console.error('Fehler bei der Habitat-Reparatur:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Habitat-Reparatur', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 