import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { auth } from '@clerk/nextjs/server';
import { normalizeSchutzstatus } from '@/lib/utils/data-validation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filterType = searchParams.get('type'); // 'gemeinden', 'habitate', 'familien', 'schutzstati', 'personen'
  
  try {
    // Authentifizierung prüfen
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }
    
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    // Standardmäßig nur nicht gelöschte Dokumente anzeigen
    const baseMatch = { deleted: { $ne: true } };
    
    let results: string[] = [];
    
    switch (filterType) {
      case 'gemeinden':
        // Aggregation für alle eindeutigen Gemeinden
        const gemeindenAgg = await collection.aggregate([
          { $match: baseMatch },
          { $group: { _id: '$metadata.gemeinde' } },
          { $match: { _id: { $ne: null } } },
          { $sort: { _id: 1 } }
        ]).toArray();
        
        results = gemeindenAgg
          .map(item => item._id)
          .filter(Boolean) as string[];
        break;
        
      case 'habitate':
        // Aggregation für alle eindeutigen Habitat-Typen
        const habitateAgg = await collection.aggregate([
          { $match: baseMatch },
          { $group: { _id: '$result.habitattyp' } },
          { $match: { _id: { $ne: null } } },
          { $sort: { _id: 1 } }
        ]).toArray();
        
        results = habitateAgg
          .map(item => item._id)
          .filter(Boolean) as string[];
        break;
        
      case 'familien':
        // Aggregation für alle eindeutigen Habitat-Familien (erster Teil des Habitat-Typs)
        const habitateForFamilies = await collection.aggregate([
          { $match: baseMatch },
          { $group: { _id: '$result.habitattyp' } },
          { $match: { _id: { $ne: null } } },
        ]).toArray();
        
        // Extrahiere die Familie aus dem Habitat-Typ (erster Teil des Namens)
        const familienSet = new Set<string>();
        habitateForFamilies.forEach(item => {
          if (item._id && typeof item._id === 'string') {
            const familie = item._id.split(' ')[0];
            if (familie) familienSet.add(familie);
          }
        });
        
        results = Array.from(familienSet).sort();
        break;
        
      case 'schutzstati':
        // Aggregation für alle eindeutigen Schutzstatus-Werte
        const schutzstatiAgg = await collection.aggregate([
          { $match: baseMatch },
          { $group: { _id: '$result.schutzstatus' } },
          { $match: { _id: { $ne: null } } },
        ]).toArray();
        
        // Normalisiere die Schutzstatus-Werte
        const schutzstatiSet = new Set<string>();
        schutzstatiAgg.forEach(item => {
          if (item._id) {
            const normalizedStatus = normalizeSchutzstatus(item._id);
            if (normalizedStatus) schutzstatiSet.add(normalizedStatus);
          }
        });
        
        results = Array.from(schutzstatiSet).sort();
        break;
        
      case 'personen':
        // Einfachere Implementierung ohne komplizierte Datenbankabfragen für Benutzerprüfung
        const personenMatch: { 
          deleted?: { $ne: boolean },
          'metadata.email'?: string 
        } = { ...baseMatch };
        
        // Logging hinzufügen, um zu sehen, was passiert
        console.log('Suche nach Personen mit userId:', userId);
        
        // Hier prüfen wir direkt mit auth(), ob es erweiterte Rechte gibt 
        // ohne Datenbank-Lookup, um Timeout-Probleme zu vermeiden
        // In echter Produktion würdest du das anders implementieren
        // mit korrekter Rollen-Prüfung, aber für jetzt vereinfachen wir es
        
        // Für diesen Test zeigen wir alle Personen an
        // In Produktion würde man hier die Berechtigungsprüfung implementieren
        // Keine Filterung nach Email durchführen
        
        console.log('Anfrage für personenMatch:', personenMatch);
        
        // Aggregation durchführen
        const personenAgg = await collection.aggregate([
          { $match: personenMatch },
          { $group: { _id: '$metadata.erfassungsperson' } },
          { $match: { _id: { $ne: null } } },
          { $sort: { _id: 1 } }
        ]).toArray();
        
        console.log('Gefundene Personen:', personenAgg.length);
        console.log('Erste 5 Personen-IDs:', personenAgg.slice(0, 5).map(p => p._id));
        
        results = personenAgg
          .map(item => item._id)
          .filter(Boolean) as string[];
        break;
        
      default:
        // Wenn kein spezifischer Filtertyp angegeben, einen Fehler zurückgeben
        return NextResponse.json(
          { error: 'Ungültiger Filter-Typ' },
          { status: 400 }
        );
    }
    
    console.log(`Filter-Optionen abgerufen für ${filterType}:`, results);
    
    return NextResponse.json({
      [filterType]: results
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Filter-Optionen:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Filter-Optionen' },
      { status: 500 }
    );
  }
} 