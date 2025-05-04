import { NextResponse } from 'next/server';
import { Sort as MongoSort } from 'mongodb';
import { connectToDatabase } from '@/lib/services/db';
import { normalizeSchutzstatus } from '@/lib/utils/data-validation';
import { auth } from '@clerk/nextjs/server';

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
  
  try {
    // Hole aktuelle Session mit Clerk, um den aktuellen Benutzer und seine Organisation zu identifizieren
    const { userId } = await auth();
        
    // Nutzerinformationen abrufen, falls angemeldet
    let currentUserEmail: string | null = null;
    let currentUserOrgId: string | null = null;

    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    const usersCollection = db.collection('users');
    
    if (userId) {
      // Benutzerinformationen aus der Datenbank holen
      const currentUserData = await usersCollection.findOne(
        { clerkId: userId },
        { projection: { email: 1, organizationId: 1 } }
      );
      
      if (currentUserData) {
        currentUserEmail = currentUserData.email;
        currentUserOrgId = currentUserData.organizationId;
      }
    }
    
    // Suchfilter erstellen
    const filter: MongoFilter = {
      // Zeige nur Einträge an, die nicht als gelöscht markiert sind
      deleted: { $ne: true }
    };
    
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
      })
      .toArray();
    
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
    const anonymizedEntries = entries.map(entry => {
      // Prüfe, ob der Erfasser des Habitats angezeigt werden darf
      const userEmail = entry.metadata?.email;
      const userData = userEmail ? userVisibilityMap.get(userEmail) : null;
      
      // Wenn keine Benutzerinformationen gefunden wurden, vorsichtshalber anonymisieren
      if (!userData) {
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
    
    return NextResponse.json({
      entries: anonymizedEntries,
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