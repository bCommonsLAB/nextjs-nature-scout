import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { getAuth } from '@clerk/nextjs/server';
import { UserService } from '@/lib/services/user-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') || '20');
  const page = Number(searchParams.get('page') || '1');
  const searchTerm = searchParams.get('search') || '';
  const selectedPerson = searchParams.get('person') || '';
  const sortBy = searchParams.get('sortBy') || 'updatedAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  
  try {
    // Hole den aktuellen Benutzer und prüfe seine Berechtigungen
    const auth = getAuth(request);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }
    
    // Überprüfen, ob Benutzer erweiterte Rechte hat (Admin oder Biologe)
    const isAdmin = await UserService.isAdmin(userId);
    const isBiologist = await UserService.isBiologist(userId);
    const hasAdvancedPermissions = isAdmin || isBiologist;
    
    // Holen des Benutzers, um die E-Mail für die Filterung zu bekommen
    const currentUser = await UserService.findByClerkId(userId);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }
    
    const userEmail = currentUser.email;
    
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    // Suchfilter erstellen
    const filter: any = {
      // Zeige nur Einträge an, die nicht als gelöscht markiert sind
      deleted: { $ne: true }
    };
    
    // Für normale Benutzer: Nur eigene Einträge anzeigen
    if (!hasAdvancedPermissions) {
      filter['metadata.email'] = userEmail;
    }
    
    // Füge Personenfilter hinzu, wenn ausgewählt und der Benutzer die Berechtigung hat
    if (selectedPerson && hasAdvancedPermissions) {
      filter['metadata.erfassungsperson'] = selectedPerson;
    } else if (selectedPerson && !hasAdvancedPermissions && selectedPerson !== userEmail) {
      // Wenn ein normaler Benutzer versucht, nach einer anderen Person zu filtern
      // ignorieren wir das und zeigen trotzdem nur seine eigenen Einträge
      console.warn(`Benutzer ${userEmail} versuchte, nach Einträgen von ${selectedPerson} zu filtern`);
    }
    
    if (searchTerm) {
      filter['$or'] = [
        { 'metadata.erfassungsperson': { $regex: searchTerm, $options: 'i' } },
        { 'metadata.gemeinde': { $regex: searchTerm, $options: 'i' } },
        { 'metadata.flurname': { $regex: searchTerm, $options: 'i' } },
        { 'result.habitattyp': { $regex: searchTerm, $options: 'i' } }
      ];
    }
    
    // Hole alle eindeutigen Personen für das Dropdown - basierend auf Benutzerrechten
    let allPersonsAggregation;
    if (hasAdvancedPermissions) {
      // Admins und Biologen sehen alle Personen
      allPersonsAggregation = await collection.aggregate([
        { $match: { deleted: { $ne: true } } },
        { $group: { _id: '$metadata.erfassungsperson' } },
        { $match: { _id: { $ne: null } } },
        { $sort: { _id: 1 } }
      ]).toArray();
    } else {
      // Normale Benutzer sehen nur sich selbst
      allPersonsAggregation = await collection.aggregate([
        { 
          $match: { 
            deleted: { $ne: true }, 
            'metadata.email': userEmail 
          } 
        },
        { $group: { _id: '$metadata.erfassungsperson' } },
        { $match: { _id: { $ne: null } } },
        { $sort: { _id: 1 } }
      ]).toArray();
    }
    
    const allPersons = allPersonsAggregation
      .map(item => item._id)
      .filter(Boolean)
      .sort();
    
    // Zähle die Gesamtanzahl der Einträge mit diesem Filter
    const total = await collection.countDocuments(filter);
    const skip = (page - 1) * limit;
    
    // Erstelle Sortierung
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Daten abrufen und für Frontend projizieren
    const entries = await collection
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .project({
        jobId: 1,
        status: 1,
        updatedAt: 1,
        verified: 1, // Verifizierungsstatus
        'metadata.erfassungsperson': 1,
        'metadata.email': 1,
        'metadata.gemeinde': 1,
        'metadata.flurname': 1,
        'metadata.bilder': 1, // Alle Bilder abrufen statt nur das erste
        'metadata.latitude': 1, // Koordinaten hinzufügen
        'metadata.longitude': 1,
        'metadata.standort': 1, // Standort hinzufügen
        'result.habitattyp': 1,
        'result.schutzstatus': 1,
        'result.zusammenfassung': 1,
        'metadata.kommentar': 1,
        error: 1
      })
      .toArray();
    
    // Debug-Logging für den ersten Eintrag
    if (entries.length > 0) {
      const entry = entries[0];
      if (entry) {
        const metadata = entry.metadata || {};
        const bilder = metadata.bilder || [];
        
        console.log('Erster Archiveintrag:', {
          jobId: entry.jobId,
          bildInfo: bilder.length > 0 ? {
            anzahl: bilder.length,
            erstesBild: bilder[0]
          } : 'Keine Bilder',
          standort: {
            gemeinde: metadata.gemeinde || 'N/A',
            flurname: metadata.flurname || 'N/A',
            standort: metadata.standort || 'N/A',
            koordinaten: `${metadata.latitude || 'N/A'}, ${metadata.longitude || 'N/A'}`
          }
        });
      }
    }
    
    return NextResponse.json({
      entries,
      allPersons, // Füge die Liste aller Personen zur Antwort hinzu
      userRole: {
        isAdmin,
        isBiologist,
        hasAdvancedPermissions
      },
      pagination: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Archivdaten:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Archivdaten' },
      { status: 500 }
    );
  }
} 