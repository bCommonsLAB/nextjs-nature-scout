import { NextResponse } from 'next/server';
import { Sort as MongoSort, Document } from 'mongodb';
import { connectToDatabase } from '@/lib/services/db';
import { normalizeSchutzstatus } from '@/lib/utils/data-validation';
import { UserService } from '@/lib/services/user-service';
import { requireAuth } from '@/lib/server-auth';

// Vor der GET-Funktion, definiere die Typen
interface MongoFilter {
  deleted?: { $ne: boolean };
  'metadata.email'?: string;
  'metadata.erfassungsperson'?: string;
  'metadata.gemeinde'?: string;
  'metadata.organizationName'?: string;
  'result.habitattyp'?: string | { $regex: string, $options: string };
  'result.schutzstatus'?: string;
  verified?: boolean | { $exists: boolean } | { $ne: boolean };
  $or?: Array<{ [key: string]: { $regex: string, $options: string } }>;
}

interface MongoDocument extends Document {
  _id: string;
  jobId: string;
  status: string;
  startTime: string;
  updatedAt: string;
  verified?: boolean;
  verifiedAt?: string;
  metadata?: {
    erfassungsperson?: string;
    email?: string;
    gemeinde?: string;
    flurname?: string;
    standort?: string;
    latitude?: number;
    longitude?: number;
    bilder?: Array<{url: string}>;
    kommentar?: string;
    organizationId?: string;
    organizationName?: string;
    organizationLogo?: string;
    [key: string]: unknown;
  };
  result?: {
    habitattyp?: string;
    schutzstatus?: string;
    zusammenfassung?: string;
    habitatfamilie?: string;
    [key: string]: unknown;
  };
  verifiedResult?: {
    habitattyp?: string;
    schutzstatus?: string;
    habitatfamilie?: string;
    [key: string]: unknown;
  };
  error?: string;
}

interface PersonAggregationResult {
  _id: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') || '20');
  const page = Number(searchParams.get('page') || '1');
  const searchTerm = searchParams.get('search') || '';
  const selectedPerson = searchParams.get('person') || '';
  const sortBy = searchParams.get('sortBy') || 'startTime';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  
  try {
    // Echte Authentifizierung
    const currentUser = await requireAuth();
    const userId = currentUser.email;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }
    
    // Überprüfen, ob Benutzer erweiterte Rechte hat (Admin oder Experte)
    const isAdmin = await UserService.isAdmin(userId);
    const isExpert = await UserService.isExpert(userId);
    const hasAdvancedPermissions = isAdmin || isExpert;
    
    // Holen des Benutzers, um die E-Mail für die Filterung zu bekommen
          const userRecord = await UserService.findByEmail(userId);
    
    if (!userRecord) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }
    
    const userEmail = userRecord.email;
    
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    // Suchfilter erstellen
    const filter: MongoFilter = {
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
    
    // Füge weitere Filter hinzu
    const gemeinde = searchParams.get('gemeinde');
    if (gemeinde) {
      filter['metadata.gemeinde'] = gemeinde;
    }
    
    const habitat = searchParams.get('habitat');
    if (habitat) {
      filter['result.habitattyp'] = habitat;
    }
    
    const organization = searchParams.get('organization');
    if (organization) {
      filter['metadata.organizationName'] = organization;
    }
    
    const habitatfamilie = searchParams.get('habitatfamilie');
    if (habitatfamilie) {
      // Korrekter Filter für die Habitatfamilie
      if (!filter['$or']) {
        filter['$or'] = [];
      }
      
      // Füge die Habitatfamilie-Bedingungen zum $or-Array hinzu
      filter['$or'].push(
        { 'result.habitatfamilie': { $regex: `^${habitatfamilie}$`, $options: 'i' } }
      );
      filter['$or'].push(
        { 'verifiedResult.habitatfamilie': { $regex: `^${habitatfamilie}$`, $options: 'i' } }
      );
    }
    
    const schutzstatus = searchParams.get('schutzstatus');
    if (schutzstatus) {
      filter['result.schutzstatus'] = schutzstatus;
    }
    
    const pruefstatus = searchParams.get('pruefstatus');
    if (pruefstatus) {
      if (pruefstatus === 'verified') {
        filter['verified'] = true;
      } else if (pruefstatus === 'unverified') {
        // Ungeprüft bedeutet, dass das verified-Feld nicht existiert oder falsch ist
        filter['verified'] = { $ne: true };
      }
    }
    
    if (searchTerm) {
      // Wenn $or bereits existiert, füge die Suchbedingungen hinzu,
      // ansonsten erstelle einen neuen $or-Array
      if (!filter['$or']) {
        filter['$or'] = [];
      }
      
      // Füge die Suchbedingungen zum $or-Array hinzu
      filter['$or'].push({ 'metadata.erfassungsperson': { $regex: searchTerm, $options: 'i' } });
      filter['$or'].push({ 'metadata.gemeinde': { $regex: searchTerm, $options: 'i' } });
      filter['$or'].push({ 'metadata.flurname': { $regex: searchTerm, $options: 'i' } });
      filter['$or'].push({ 'result.habitattyp': { $regex: searchTerm, $options: 'i' } });
    }
    
    // Hole alle eindeutigen Personen für das Dropdown - basierend auf Benutzerrechten
    let allPersonsAggregation;
    if (hasAdvancedPermissions) {
      // Admins und Experten sehen alle Personen
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
      .map((item) => (item as PersonAggregationResult)._id)
      .filter(Boolean)
      .sort();
    
    // Zähle die Gesamtanzahl der Einträge mit diesem Filter
    const total = await collection.countDocuments(filter);
    const skip = (page - 1) * limit;
    
    // Erstelle Sortierung
    const sort: MongoSort = {};
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
        startTime: 1, // Erfassungsdatum hinzufügen
        updatedAt: 1,
        verified: 1, // Verifizierungsstatus
        verifiedAt: 1, // Verifizierungsdatum hinzufügen
        'metadata.erfassungsperson': 1,
        'metadata.email': 1,
        'metadata.gemeinde': 1,
        'metadata.flurname': 1,
        'metadata.bilder': 1, // Alle Bilder abrufen statt nur das erste
        'metadata.latitude': 1, // Koordinaten hinzufügen
        'metadata.longitude': 1,
        'metadata.polygonPoints': 1, // Polygon-Punkte für Export hinzufügen
        'metadata.standort': 1, // Standort hinzufügen
        'metadata.organizationId': 1, // Organisationsdaten hinzufügen
        'metadata.organizationName': 1,
        'metadata.organizationLogo': 1,
        'result.habitattyp': 1,
        'result.schutzstatus': 1,
        'result.habitatfamilie': 1, // Habitatfamilie hinzufügen
        'result.zusammenfassung': 1,
        'verifiedResult.habitattyp': 1,
        'verifiedResult.schutzstatus': 1,
        'verifiedResult.habitatfamilie': 1, // Verifizierte Habitatfamilie hinzufügen
        'metadata.kommentar': 1,
        error: 1
      })
      .toArray();
    
    // Validiere die Einträge, insbesondere den schutzstatus
    const validatedEntries = entries.map((entry) => {
      // Validiere den schutzstatus, falls er existiert
      const typedEntry = entry as MongoDocument;
      if (typedEntry.result?.schutzstatus) {
        typedEntry.result.schutzstatus = normalizeSchutzstatus(typedEntry.result.schutzstatus);
      }
      return typedEntry;
    });
    
    // Debug-Logging für den ersten Eintrag
    if (validatedEntries.length > 0) {
      const entry = validatedEntries[0];
      if (entry) {
        const metadata = entry.metadata || {};
        const bilder = metadata.bilder || [];
        
        console.log('Erster Habitateintrag:', {
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
      entries: validatedEntries,
      allPersons, // Füge die Liste aller Personen zur Antwort hinzu
      userRole: {
        isAdmin,
        isExpert,
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
    console.error('Fehler beim Abrufen der Habitatdaten:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Habitatdaten' },
      { status: 500 }
    );
  }
} 