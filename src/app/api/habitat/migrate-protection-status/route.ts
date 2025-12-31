import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { requireAuth } from '@/lib/server-auth';
import { UserService } from '@/lib/services/user-service';
import { schutzstatusToProtectionStatus } from '@/lib/utils/data-validation';

/**
 * Migration-Route zum Berechnen und Setzen von protectionStatus für alle bestehenden Jobs
 * 
 * Diese Route:
 * 1. Geht durch alle Jobs in der Datenbank
 * 2. Berechnet protectionStatus basierend auf verifiedResult.schutzstatus oder result.schutzstatus
 * 3. Setzt protectionStatus auf der obersten Ebene des Jobs
 * 4. Gibt Statistiken zurück
 */
export async function POST(request: Request) {
  try {
    // Authentifizierung - nur Admins können Migration durchführen
    const currentUser = await requireAuth();
    const userId = currentUser.email;
    
    const isAdmin = await UserService.isAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Nur Administratoren können die Migration durchführen' },
        { status: 403 }
      );
    }
    
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    // WICHTIG: protectionStatus darf nur für verifizierte Habitate gesetzt werden
    // Hole nur verifizierte Jobs, die noch kein protectionStatus haben oder bei denen es aktualisiert werden soll
    const verifiedJobs = await collection.find({
      deleted: { $ne: true },
      verified: true
    }).toArray();
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: Array<{ jobId: string; error: string }> = [];
    
    for (const job of verifiedJobs) {
      try {
        // WICHTIG: protectionStatus wird nur basierend auf verifiedResult.schutzstatus berechnet
        // (nicht auf result.schutzstatus, da nur Experten-Verifizierung zählt)
        const schutzstatus = job.verifiedResult?.schutzstatus;
        
        if (!schutzstatus) {
          // Wenn kein verifiedResult.schutzstatus vorhanden ist, überspringen
          skipped++;
          continue;
        }
        
        const protectionStatus = schutzstatusToProtectionStatus(schutzstatus);
        
        // Prüfe, ob protectionStatus bereits gesetzt ist und gleich dem berechneten Wert
        if (job.protectionStatus === protectionStatus) {
          skipped++;
          continue;
        }
        
        // Update durchführen
        await collection.updateOne(
          { jobId: job.jobId },
          {
            $set: {
              protectionStatus: protectionStatus,
              updatedAt: new Date()
            }
          }
        );
        
        migrated++;
      } catch (error) {
        errors++;
        errorDetails.push({
          jobId: job.jobId || 'unknown',
          error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
        console.error(`Fehler beim Migrieren von Job ${job.jobId}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      statistics: {
        total: verifiedJobs.length,
        migrated,
        skipped,
        errors,
        note: 'protectionStatus wird nur für verifizierte Habitate gesetzt (basierend auf verifiedResult.schutzstatus)'
      },
      errorDetails: errors > 0 ? errorDetails : undefined
    });
    
  } catch (error) {
    console.error('Fehler bei der Migration:', error);
    return NextResponse.json(
      { 
        error: 'Fehler bei der Migration',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}

/**
 * GET-Route zum Abrufen von Migrations-Statistiken ohne Migration durchzuführen
 */
export async function GET(request: Request) {
  try {
    // Authentifizierung - nur Admins können Statistiken abrufen
    const currentUser = await requireAuth();
    const userId = currentUser.email;
    
    const isAdmin = await UserService.isAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Nur Administratoren können die Statistiken abrufen' },
        { status: 403 }
      );
    }
    
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    // Statistiken abrufen
    const totalJobs = await collection.countDocuments({ deleted: { $ne: true } });
    const verifiedJobs = await collection.countDocuments({ 
      deleted: { $ne: true },
      verified: true
    });
    const jobsWithProtectionStatus = await collection.countDocuments({ 
      deleted: { $ne: true },
      protectionStatus: { $exists: true, $ne: null }
    });
    const verifiedJobsWithoutProtectionStatus = verifiedJobs - jobsWithProtectionStatus;
    
    // Verteilung der protectionStatus-Werte
    const redCount = await collection.countDocuments({ 
      deleted: { $ne: true },
      protectionStatus: 'red'
    });
    const yellowCount = await collection.countDocuments({ 
      deleted: { $ne: true },
      protectionStatus: 'yellow'
    });
    const greenCount = await collection.countDocuments({ 
      deleted: { $ne: true },
      protectionStatus: 'green'
    });
    
    return NextResponse.json({
      statistics: {
        total: totalJobs,
        verified: verifiedJobs,
        withProtectionStatus: jobsWithProtectionStatus,
        verifiedWithoutProtectionStatus: verifiedJobsWithoutProtectionStatus,
        distribution: {
          red: redCount,
          yellow: yellowCount,
          green: greenCount
        },
        note: 'protectionStatus wird nur für verifizierte Habitate gesetzt'
      }
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Migrations-Statistiken:', error);
    return NextResponse.json(
      { 
        error: 'Fehler beim Abrufen der Statistiken',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}

