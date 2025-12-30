import { NextResponse } from 'next/server';
import { Sort as MongoSort } from 'mongodb';
import { connectToDatabase } from '@/lib/services/db';
import { normalizeSchutzstatus } from '@/lib/utils/data-validation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Definiere die Typen
interface MongoFilter {
  deleted?: { $ne: boolean };
  verified?: boolean | { $ne: boolean };
  $or?: Array<{ [key: string]: { $regex: string, $options: string } }>;
  [key: string]: any; // Index-Signatur für dynamische Eigenschaften
}

// GET-Route für öffentliche Habitate
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') || '12');
  const page = Number(searchParams.get('page') || '1');
  const searchTerm = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'updatedAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const verifizierungsstatus = searchParams.get('verifizierungsstatus') || 'alle';
  const includeFilterOptions = searchParams.get('includeFilterOptions') === 'true';
  
  // Neue Parameter für Geo-Queries
  const bounds = searchParams.get('bounds');
  const markersOnly = searchParams.get('markersOnly') === 'true';
  const zoom = searchParams.get('zoom') ? Number(searchParams.get('zoom')) : null;
  
  try {
    // Optionale Authentifizierung - keine Fehler, falls nicht eingeloggt
    let currentUserEmail: string | null = null;
    let currentUserOrgId: string | null = null;

    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    const usersCollection = db.collection('users');
    
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        currentUserEmail = session.user.email;
        
        // Benutzerinformationen aus der Datenbank holen
        const currentUserData = await usersCollection.findOne(
          { email: currentUserEmail },
          { projection: { email: 1, organizationId: 1 } }
        );
        
        if (currentUserData) {
          currentUserOrgId = currentUserData.organizationId;
        }
      }
    } catch (authError) {
      // Authentifizierung fehlgeschlagen - Route funktioniert trotzdem
      console.log('Optionale Authentifizierung fehlgeschlagen - Route funktioniert anonym');
    }
    
    // Suchfilter erstellen
    const filter: MongoFilter = {
      // Zeige nur Einträge an, die nicht als gelöscht markiert sind
      deleted: { $ne: true }
    };
    
    // Geo-Query: Bounds-Filterung hinzufügen, falls vorhanden
    if (bounds) {
      const boundsArray = bounds.split(',');
      if (boundsArray.length === 4) {
        const minLat = Number(boundsArray[0]);
        const minLng = Number(boundsArray[1]);
        const maxLat = Number(boundsArray[2]);
        const maxLng = Number(boundsArray[3]);
        // Validiere, dass alle Werte gültige Zahlen sind
        if (!isNaN(minLat) && !isNaN(minLng) && !isNaN(maxLat) && !isNaN(maxLng)) {
          filter['metadata.latitude'] = { $gte: minLat, $lte: maxLat };
          filter['metadata.longitude'] = { $gte: minLng, $lte: maxLng };
        }
      }
    }
    
    // Filter für Verifizierungsstatus hinzufügen, abhängig vom Parameter
    if (verifizierungsstatus === 'verifiziert') {
      filter.verified = true;
    } else if (verifizierungsstatus === 'unbestaetigt') {
      filter.verified = { $ne: true };
    }
    // Bei 'alle' wird kein Verifizierungsfilter hinzugefügt

    // Füge weitere Filter hinzu
    const gemeinde = searchParams.get('gemeinde');
    if (gemeinde) {
      // Prüfen, ob es mehrere Werte sind (durch Komma getrennt)
      const gemeindeValues = gemeinde.split(',');
      if (gemeindeValues.length > 1) {
        if (!filter['$or']) filter['$or'] = [];
        // ODER-Verknüpfung für mehrere Gemeinden
        const gemeindeConditions = gemeindeValues.map(g => ({ 
          'metadata.gemeinde': { $regex: `^${g}$`, $options: 'i' }
        }));
        filter['$or'].push(...gemeindeConditions);
      } else {
        filter['metadata.gemeinde'] = gemeinde;
      }
    }
    
    const habitat = searchParams.get('habitat');
    if (habitat) {
      // Prüfen, ob es mehrere Werte sind (durch Komma getrennt)
      const habitatValues = habitat.split(',');
      if (habitatValues.length > 1) {
        if (!filter['$or']) filter['$or'] = [];
        // ODER-Verknüpfung für mehrere Habitate
        const habitatConditions = habitatValues.map(h => ({ 
          'result.habitattyp': { $regex: `^${h}$`, $options: 'i' }
        }));
        filter['$or'].push(...habitatConditions);
      } else {
        filter['result.habitattyp'] = habitat;
      }
    }
    
    const habitatfamilie = searchParams.get('habitatfamilie');
    if (habitatfamilie) {
      // Prüfen, ob es mehrere Werte sind (durch Komma getrennt)
      const habitatfamilieValues = habitatfamilie.split(',');
      
      if (habitatfamilieValues.length > 1) {
        if (!filter['$or']) filter['$or'] = [];
        
        // ODER-Verknüpfung für mehrere Habitatfamilien
        for (const fam of habitatfamilieValues) {
          filter['$or'].push({ 'result.habitatfamilie': { $regex: `^${fam}$`, $options: 'i' } });
          filter['$or'].push({ 'verifiedResult.habitatfamilie': { $regex: `^${fam}$`, $options: 'i' } });
        }
      } else {
        if (!filter['$or']) {
          filter['$or'] = [];
        }
        
        filter['$or'].push(
          { 'result.habitatfamilie': { $regex: `^${habitatfamilie}$`, $options: 'i' } }
        );
        filter['$or'].push(
          { 'verifiedResult.habitatfamilie': { $regex: `^${habitatfamilie}$`, $options: 'i' } }
        );
      }
    }
    
    const schutzstatus = searchParams.get('schutzstatus');
    if (schutzstatus) {
      // Prüfen, ob es mehrere Werte sind (durch Komma getrennt)
      const schutzstatusValues = schutzstatus.split(',');
      if (schutzstatusValues.length > 1) {
        if (!filter['$or']) filter['$or'] = [];
        // ODER-Verknüpfung für mehrere Schutzstatus
        const schutzstatusConditions = schutzstatusValues.map(s => ({ 
          'result.schutzstatus': { $regex: `^${s}$`, $options: 'i' }
        }));
        filter['$or'].push(...schutzstatusConditions);
      } else {
        filter['result.schutzstatus'] = schutzstatus;
      }
    }
    
    const person = searchParams.get('person');
    if (person) {
      // Prüfen, ob es mehrere Werte sind (durch Komma getrennt)
      const personValues = person.split(',');
      if (personValues.length > 1) {
        if (!filter['$or']) filter['$or'] = [];
        // ODER-Verknüpfung für mehrere Personen
        const personConditions = personValues.map(p => ({ 
          'metadata.erfassungsperson': { $regex: `^${p}$`, $options: 'i' }
        }));
        filter['$or'].push(...personConditions);
      } else {
        filter['metadata.erfassungsperson'] = person;
      }
    }
    
    const organization = searchParams.get('organization');
    if (organization) {
      // Prüfen, ob es mehrere Werte sind (durch Komma getrennt)
      const organizationValues = organization.split(',');
      if (organizationValues.length > 1) {
        if (!filter['$or']) filter['$or'] = [];
        // ODER-Verknüpfung für mehrere Organisationen
        const organizationConditions = organizationValues.map(o => ({ 
          'metadata.organizationName': { $regex: `^${o}$`, $options: 'i' }
        }));
        filter['$or'].push(...organizationConditions);
      } else {
        filter['metadata.organizationName'] = organization;
      }
    }
    
    if (searchTerm) {
      if (!filter['$or']) {
        filter['$or'] = [];
      }
      
      filter['$or'].push({ 'metadata.erfassungsperson': { $regex: searchTerm, $options: 'i' } });
      filter['$or'].push({ 'metadata.gemeinde': { $regex: searchTerm, $options: 'i' } });
      filter['$or'].push({ 'metadata.flurname': { $regex: searchTerm, $options: 'i' } });
      filter['$or'].push({ 'result.habitattyp': { $regex: searchTerm, $options: 'i' } });
    }
    
    // Filteroptionen abrufen, wenn gewünscht
    let filterOptions = null;
    if (includeFilterOptions) {
      // Basisfilter je nach gewähltem Verifizierungsstatus
      const baseFilter: MongoFilter = { deleted: { $ne: true } };
      
      // Filter für Verifizierungsstatus hinzufügen
      if (verifizierungsstatus === 'verifiziert') {
        baseFilter.verified = true;
      } else if (verifizierungsstatus === 'unbestaetigt') {
        baseFilter.verified = { $ne: true };
      }
      // Bei 'alle' wird kein Verifizierungsfilter hinzugefügt
      
      // Gemeinden abrufen
      const gemeindenAgg = await collection.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$metadata.gemeinde' } },
        { $match: { _id: { $ne: null } } },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      // Habitattypen abrufen
      const habitattypenAgg = await collection.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$result.habitattyp' } },
        { $match: { _id: { $ne: null } } },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      // Habitatfamilien abrufen
      const habitatfamilienAgg = await collection.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$result.habitatfamilie' } },
        { $match: { _id: { $ne: null } } },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      // Schutzstatus abrufen
      const schutzstatusList = await collection.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$result.schutzstatus' } },
        { $match: { _id: { $ne: null } } },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      // Alle Erfasser abrufen
      const personen = await collection.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$metadata.erfassungsperson' } },
        { $match: { _id: { $ne: null } } },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      // Alle Organisationen abrufen
      const organisationen = await collection.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$metadata.organizationName' } },
        { $match: { _id: { $ne: null } } },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      filterOptions = {
        gemeinden: gemeindenAgg.map(item => item._id).filter(Boolean),
        habitattypen: habitattypenAgg.map(item => item._id).filter(Boolean),
        habitatfamilien: habitatfamilienAgg.map(item => item._id).filter(Boolean),
        schutzstatusList: schutzstatusList.map(item => item._id).filter(Boolean).map(status => 
          normalizeSchutzstatus(status)
        ),
        personen: personen.map(item => item._id).filter(Boolean),
        organizations: organisationen.map(item => item._id).filter(Boolean)
      };
    }
    
    // Zähle die Gesamtanzahl der Einträge mit diesem Filter
    const total = await collection.countDocuments(filter);
    const skip = (page - 1) * limit;
    
  // Erstelle Sortierung
  // Wenn bounds vorhanden sind, immer nach updatedAt absteigend sortieren (neueste zuerst)
  const sort: MongoSort = {};
  if (bounds) {
    sort.updatedAt = -1; // Immer neueste zuerst für Geo-Queries
  } else {
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  }
  
  // Limit für Geo-Queries: Maximal 100 Ergebnisse
  const effectiveLimit = bounds ? Math.min(limit, 100) : limit;
  
  // Prüfe, ob minimale Ansicht für Kartenansicht gewünscht ist
  const view = searchParams.get('view');
  const isMapView = view === 'map';
  
  // Projektion basierend auf Ansichtstyp
  const projection: any = isMapView ? {
    // Minimale Ansicht für Karten: Koordinaten, Schutzstatus und minimale Info-Daten für Anzeige
    jobId: 1,
    verified: 1,
    'metadata.latitude': 1,
    'metadata.longitude': 1,
    // Bei markersOnly=true keine polygonPoints laden (Performance-Optimierung)
    ...(markersOnly ? {} : { 'metadata.polygonPoints': 1 }),
    'metadata.gemeinde': 1,
    'metadata.flurname': 1,
    'metadata.elevation': 1,
    'result.habitattyp': 1,
    'result.schutzstatus': 1,
    'verifiedResult.habitattyp': 1,
    'verifiedResult.schutzstatus': 1
  } : {
    // Vollständige Ansicht für Listenansicht
    jobId: 1,
    status: 1,
    updatedAt: 1,
    verified: 1,
    'metadata.erfassungsperson': 1,
    'metadata.email': 1,  // Email des Erfassers hinzufügen, um später zu prüfen
    'metadata.gemeinde': 1,
    'metadata.flurname': 1,
    'metadata.bilder': 1,
    'metadata.latitude': 1,
    'metadata.longitude': 1,
    'metadata.standort': 1,
    'metadata.polygonPoints': 1,
    'metadata.organizationId': 1,
    'metadata.organizationName': 1,
    'metadata.organizationLogo': 1,
    'result.habitattyp': 1,
    'result.schutzstatus': 1,
    'result.habitatfamilie': 1,
    'result.zusammenfassung': 1,
    'verifiedResult.habitattyp': 1,
    'verifiedResult.schutzstatus': 1,
    'verifiedResult.habitatfamilie': 1,
    'metadata.kommentar': 1
  };
  
  // Daten abrufen und für Frontend projizieren
  const entries = await collection
    .find(filter)
    .sort(sort)
    .skip(bounds ? 0 : skip) // Bei Geo-Queries kein Skip (immer Top 100)
    .limit(effectiveLimit)
    .project(projection)
    .toArray();
    
    // Für Map-View: Minimale Verarbeitung (nur Schutzstatus normalisieren)
    // Für normale View: Vollständige Anonymisierung
    let processedEntries;
    
    if (isMapView) {
      // Minimale Verarbeitung für Kartenansicht - Koordinaten, Schutzstatus und minimale Info-Daten
      processedEntries = entries.map(entry => {
        // Schutzstatus normalisieren (verifiziert hat Priorität)
        const schutzstatus = entry.verifiedResult?.schutzstatus || entry.result?.schutzstatus;
        return {
          jobId: entry.jobId,
          verified: entry.verified,
          metadata: {
            latitude: entry.metadata?.latitude,
            longitude: entry.metadata?.longitude,
            polygonPoints: entry.metadata?.polygonPoints,
            gemeinde: entry.metadata?.gemeinde,
            flurname: entry.metadata?.flurname,
            elevation: entry.metadata?.elevation
          },
          result: {
            habitattyp: entry.result?.habitattyp,
            schutzstatus: schutzstatus ? normalizeSchutzstatus(schutzstatus) : undefined
          },
          verifiedResult: entry.verifiedResult?.habitattyp || entry.verifiedResult?.schutzstatus ? {
            habitattyp: entry.verifiedResult?.habitattyp,
            schutzstatus: entry.verifiedResult?.schutzstatus ? normalizeSchutzstatus(entry.verifiedResult.schutzstatus) : undefined
          } : undefined
        };
      });
    } else {
      // Vollständige Verarbeitung für Listenansicht
      // Sammle alle einzigartigen E-Mails aus den Einträgen
      const emailsToCheck = Array.from(new Set<string>(
        entries
          .map(entry => entry.metadata?.email)
          .filter(Boolean)
      ));
      
      // Lade Benutzerinformationen für alle E-Mails in einem einzigen Aufruf
      const usersData = await usersCollection.find(
        { email: { $in: emailsToCheck } },
        { projection: { email: 1, habitat_name_visibility: 1, organizationId: 1 } }
      ).toArray();
      
      // Erstelle eine Map für schnellen Zugriff auf Benutzerinformationen
      const userVisibilityMap = new Map<string, {
        habitat_name_visibility: string;
        organizationId: string | null;
      }>();
      
      usersData.forEach(user => {
        userVisibilityMap.set(user.email, {
          habitat_name_visibility: user.habitat_name_visibility || 'private',
          organizationId: user.organizationId
        });
      });
      
      // Anonymisiere Einträge basierend auf den Sichtbarkeitseinstellungen
      // Im anonymen Fall: Gar keine Erfasser anzeigen
      // Nur für eingeloggte Nutzer: Zeige Personen basierend auf Sichtbarkeitseinstellungen
      processedEntries = entries.map(entry => {
        // Prüfe, ob der Erfasser des Habitats angezeigt werden darf
        const userEmail = entry.metadata?.email;
        const userData = userEmail ? userVisibilityMap.get(userEmail) : null;
        
        // Im anonymen Fall (kein currentUserOrgId): Gar keine Erfasser anzeigen
        if (!currentUserOrgId) {
          entry.metadata.erfassungsperson = '';
        }
        // Für eingeloggte Nutzer: Prüfe Sichtbarkeitseinstellungen
        else if (!userData) {
          // Wenn keine Benutzerinformationen gefunden wurden, vorsichtshalber anonymisieren
          entry.metadata.erfassungsperson = '';
        } 
        // Anonymisieren, wenn keine öffentliche Sichtbarkeit UND nicht in derselben Organisation
        else if (
          userData.habitat_name_visibility !== 'public' &&
          !(currentUserOrgId && userData.organizationId && 
            userData.organizationId.toString() === currentUserOrgId.toString())
        ) {
          entry.metadata.erfassungsperson = '';
        }
        
        // E-Mail-Adresse entfernen, da sie nur für die Prüfung benötigt wurde
        delete entry.metadata.email;
        
        // Schutzstatus normalisieren
        if (entry.result?.schutzstatus) {
          entry.result.schutzstatus = normalizeSchutzstatus(entry.result.schutzstatus);
        }
        
        return entry;
      });
    }
    
    return NextResponse.json({
      entries: processedEntries,
      filterOptions,
      pagination: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der öffentlichen Habitatdaten:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Habitatdaten' },
      { status: 500 }
    );
  }
} 