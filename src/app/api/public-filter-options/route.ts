import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { normalizeSchutzstatus } from '@/lib/utils/data-validation';
import { requireAuth } from '@/lib/server-auth';

interface FilterOption {
  value: string;
  count: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filterType = searchParams.get('type'); // 'gemeinden', 'habitate', 'familien', 'schutzstati', 'personen', 'verifizierungsstatus', 'organizations'
  
  try {
    // Prüfe, ob das angeforderte Filtertyp gültig ist
    if (!filterType || !['gemeinden', 'habitate', 'familien', 'schutzstati', 'personen', 'organizations'].includes(filterType)) {
      return NextResponse.json(
        { error: 'Ungültiger Filter-Typ' },
        { status: 400 }
      );
    }
    
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    // Basisfilter - bei öffentlicher Route immer nur verifizierte Habitate
    const baseFilter: any = { 
      deleted: { $ne: true },
      verified: true 
    };
    
    let results: FilterOption[] = [];
    
    // Je nach Filtertyp, hole die entsprechenden Daten
    switch(filterType) {
      case 'verifizierungsstatus':
        // Bei öffentlicher Route gibt es nur verifizierte Habitate
        results = [
          { value: 'verifiziert', count: await collection.countDocuments(baseFilter) },
          { value: 'nicht verifiziert', count: 0 }
        ];
        break;
        
      case 'gemeinden':
        const gemeindenAgg = await collection.aggregate([
          { $match: baseFilter },
          { $group: { _id: '$metadata.gemeinde', count: { $sum: 1 } } },
          { $match: { _id: { $ne: null } } },
          { $sort: { _id: 1 } }
        ]).toArray();
        
        results = gemeindenAgg
          .filter(item => item._id)
          .map(item => ({ value: item._id, count: item.count }));
        break;
        
      case 'habitate':
        const habitattypenAgg = await collection.aggregate([
          { $match: baseFilter },
          { $group: { _id: '$result.habitattyp', count: { $sum: 1 } } },
          { $match: { _id: { $ne: null } } },
          { $sort: { _id: 1 } }
        ]).toArray();
        
        results = habitattypenAgg
          .filter(item => item._id)
          .map(item => ({ value: item._id, count: item.count }));
        break;
        
      case 'familien':
        const habitatfamilienAgg = await collection.aggregate([
          { $match: baseFilter },
          { $group: { _id: '$result.habitatfamilie', count: { $sum: 1 } } },
          { $match: { _id: { $ne: null } } },
          { $sort: { _id: 1 } }
        ]).toArray();
        
        results = habitatfamilienAgg
          .filter(item => item._id)
          .map(item => ({ value: item._id, count: item.count }));
        break;
        
      case 'schutzstati':
        const schutzstatusList = await collection.aggregate([
          { $match: baseFilter },
          { $group: { _id: '$result.schutzstatus', count: { $sum: 1 } } },
          { $match: { _id: { $ne: null } } },
          { $sort: { _id: 1 } }
        ]).toArray();
        
        results = schutzstatusList
          .filter(item => item._id)
          .map(item => ({
            value: normalizeSchutzstatus(item._id),
            count: item.count
          }));
        break;
        
      case 'personen':
        // Echte Authentifizierung
        const currentUser = await requireAuth();
        const userId = currentUser.email;
        
        // Nutzerinformationen abrufen, falls angemeldet
        let currentUserEmail: string | null = null;
        let currentUserOrgId: string | null = null;
        
        if (userId) {
          // Benutzerinformationen aus der Datenbank holen
          const usersCollection = db.collection('users');
          const currentUserData = await usersCollection.findOne(
            { email: userId },
            { projection: { email: 1, organizationId: 1 } }
          );
          
          if (currentUserData) {
            currentUserEmail = currentUserData.email;
            currentUserOrgId = currentUserData.organizationId;
          }
        }

        // 1. Erst alle Erfassungspersonen mit Anzahl finden
        const personen = await collection.aggregate([
          { $match: baseFilter },
          { $group: { 
            _id: '$metadata.erfassungsperson',
            count: { $sum: 1 },
            emails: { $addToSet: '$metadata.email' } // Sammle alle E-Mails für jede Erfassungsperson
          }},
          { $match: { _id: { $ne: null } } },
          { $sort: { _id: 1 } }
        ]).toArray();

        // 2. Einmalig alle User-Daten laden, deren E-Mails in den Ergebnissen vorkommen
        // Flache Liste aller E-Mails aus den Erfassungspersonen extrahieren
        const allEmails = personen.flatMap(p => p.emails?.filter(Boolean) || []);
        const uniqueEmails = Array.from(new Set<string>(allEmails));

        // Lade User-Daten für alle E-Mails
        const usersCollection = db.collection('users');
        const usersData = await usersCollection.find(
          { email: { $in: uniqueEmails } },
          { projection: { email: 1, habitat_name_visibility: 1, organizationId: 1 } }
        ).toArray();

        // E-Mail-zu-User-Map erstellen für schnellen Lookup
        const userMap = new Map<string, {
          habitat_name_visibility: string;
          organizationId: string | null;
        }>();
        
        usersData.forEach(user => {
          userMap.set(user.email, {
            habitat_name_visibility: user.habitat_name_visibility || 'private',
            organizationId: user.organizationId
          });
        });

        // 3. Filtere Personen basierend auf den Sichtbarkeitseinstellungen
        const filteredPersonen = personen.filter(person => {
          // Mindestens eine E-Mail der Person muss die Bedingungen erfüllen
          return person.emails?.some((email: string) => {
            if (!email) return false;
            
            const userData = userMap.get(email);
            if (!userData) return false;
            
            // Sichtbarkeitsregeln prüfen:
            // 1. Öffentliche Sichtbarkeit ODER
            // 2. Gleiche Organisation wie der aktuelle Benutzer
            return (
              userData.habitat_name_visibility === 'public' || 
              (currentUserOrgId && userData.organizationId && userData.organizationId.toString() === currentUserOrgId.toString())
            );
          }) || false;
        });

        results = filteredPersonen
          .map(item => ({ value: item._id, count: item.count }));
        break;
        
      case 'organizations':
        const organizationsAgg = await collection.aggregate([
          { $match: baseFilter },
          { $match: { 'metadata.organizationName': { $exists: true, $ne: null } } },
          { $match: { 'metadata.organizationName': { $ne: '' } } },
          { $group: { _id: '$metadata.organizationName', count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]).toArray();
        
        results = organizationsAgg
          .filter(item => item._id)
          .map(item => ({ value: item._id, count: item.count }));
        break;
    }
    
    // Rückgabe der Ergebnisse
    return NextResponse.json({
      [filterType]: results
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der öffentlichen Filter-Optionen:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Filter-Optionen' },
      { status: 500 }
    );
  }
} 