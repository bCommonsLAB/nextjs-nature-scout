import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { UserService } from '@/lib/services/user-service';
import { requireAuth } from '@/lib/server-auth';
import { schutzstatusToProtectionStatus } from '@/lib/utils/data-validation';

export async function PATCH(
  request: Request,
  { params }: { params: { auftragsId: string } }
) {
  // In Next.js 14 müssen wir auf params mit await zugreifen
  const { auftragsId } = await params;
  const jobId = auftragsId;
  
  try {
    // Echte Authentifizierung
    const currentUser = await requireAuth();
    const userId = currentUser.email;
    const isAdmin = await UserService.isAdmin(currentUser.email);
    const isExpert = await UserService.isExpert(currentUser.email);
    
    if (!isAdmin && !isExpert) {
      return NextResponse.json(
        { error: 'Zugriff verweigert. Nur Experten und Administratoren können den effektiven Habitat bearbeiten.' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { effectiveHabitat, kommentar } = body;
    
    if (!effectiveHabitat) {
      return NextResponse.json(
        { error: 'Effektiver Habitat ist erforderlich' },
        { status: 400 }
      );
    }
    
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    const habitatTypesCollection = db.collection('habitatTypes');
    
    const userName = currentUser.name;
    
    // Aktuellen Eintrag abrufen
    const entry = await collection.findOne({ jobId });
    
    if (!entry) {
      return NextResponse.json(
        { error: 'Eintrag nicht gefunden' },
        { status: 404 }
      );
    }
    
    // Hole die habitatFamilie und schutzstatus vom gewählten Habitattyp
    const habitatType = await habitatTypesCollection.findOne({ name: effectiveHabitat });
    let habitatfamilie = '';
    let schutzstatus = '';
    
    if (habitatType) {
      habitatfamilie = habitatType.habitatFamilie || '';
      schutzstatus = habitatType.schutzstatus || entry.result?.schutzstatus || '';
    }
    
    // Erstelle einen Eintrag für die Versionshistorie
    const historyEntry = {
      date: new Date(),
      user: {
        userId,
        userName,
        email: currentUser?.email,
        role: isAdmin ? 'admin' : 'experte'
      },
      module: 'Habitat-Verifizierung',
      previousResult: {
        habitattyp: entry.verifiedResult?.habitattyp || entry.result?.habitattyp,
        habitatfamilie: entry.verifiedResult?.habitatfamilie || entry.result?.habitatfamilie,
        schutzstatus: entry.verifiedResult?.schutzstatus || entry.result?.schutzstatus,
        kommentar: entry.verifiedResult?.kommentar || entry.result?.kommentar
      },
      changes: {
        habitattyp: effectiveHabitat,
        habitatfamilie: habitatfamilie,
        schutzstatus: schutzstatus,
        kommentar: kommentar
      }
    };
    
    // Aktuelles Datum für die Verifizierung
    const now = new Date();
    
    // Berechne protectionStatus basierend auf schutzstatus
    const protectionStatus = schutzstatusToProtectionStatus(schutzstatus);
    
    // Update durchführen mit Aggregation Pipeline
    const result = await collection.updateOne(
      { jobId },
      [
        {
          $set: {
            // Aktualisiere die verifiedResult-Attribute statt result
            "verifiedResult": {
              habitattyp: effectiveHabitat,
              habitatfamilie: habitatfamilie,
              schutzstatus: schutzstatus,
              kommentar: kommentar
            },
            updatedAt: now,
            // Setze Verifizierungsstatus
            verified: true,
            verifiedAt: now,
            verifiedBy: {
              userId,
              userName,
              role: isAdmin ? 'admin' : 'experte'
            },
            // Setze protectionStatus basierend auf verifiedResult.schutzstatus
            protectionStatus: protectionStatus,
            // Füge den History-Eintrag hinzu
            history: {
              $cond: {
                if: { $isArray: "$history" },
                then: { $concatArrays: ["$history", [historyEntry]] },
                else: [historyEntry]
              }
            }
          }
        }
      ]
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Eintrag nicht gefunden' },
        { status: 404 }
      );
    }
    
    // Formatierte Antwort mit einfachen Datentypen
    return NextResponse.json({ 
      success: true, 
      habitattyp: effectiveHabitat,
      habitatfamilie: habitatfamilie,
      schutzstatus: schutzstatus,
      kommentar: kommentar,
      verified: true,
      verifiedAt: now.toISOString(),
      // Hole den aktualisierten Eintrag mit der History
      history: await collection.findOne({ jobId }, { projection: { history: 1 } }).then(result => result?.history || [])
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des effektiven Habitats:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des effektiven Habitats' },
      { status: 500 }
    );
  }
} 