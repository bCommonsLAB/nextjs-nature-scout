import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { normalizeSchutzstatus } from '@/lib/utils/data-validation';

interface FilterOption {
  value: string;
  count: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filterType = searchParams.get('type'); // 'gemeinden', 'habitate', 'familien', 'schutzstati', 'personen', 'verifizierungsstatus'
  const verifizierungsstatus = searchParams.get('verifizierungsstatus') || 'alle';
  
  try {
    // Prüfe, ob das angeforderte Filtertyp gültig ist
    if (!filterType || !['gemeinden', 'habitate', 'familien', 'schutzstati', 'personen', 'verifizierungsstatus'].includes(filterType)) {
      return NextResponse.json(
        { error: 'Ungültiger Filter-Typ' },
        { status: 400 }
      );
    }
    
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    // Basisfilter - abhängig vom Verifizierungsstatus
    const baseFilter: any = { deleted: { $ne: true } };
    
    // Wenn der Filtertyp selbst nicht "verifizierungsstatus" ist, dann berücksichtige den Parameter
    if (filterType !== 'verifizierungsstatus' && verifizierungsstatus !== 'alle') {
      baseFilter.verified = verifizierungsstatus === 'verifiziert';
    }
    
    let results: FilterOption[] = [];
    
    // Je nach Filtertyp, hole die entsprechenden Daten
    switch(filterType) {
      case 'verifizierungsstatus':
        // Für Verifizierungsstatus müssen wir die Anzahl der Dokumente manuell zählen
        const verifiedCount = await collection.countDocuments({
          ...baseFilter,
          verified: true
        });
        
        const unverifiedCount = await collection.countDocuments({
          ...baseFilter,
          verified: { $ne: true }
        });
        
        results = [
          { value: 'verifiziert', count: verifiedCount },
          { value: 'nicht verifiziert', count: unverifiedCount }
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
        const personen = await collection.aggregate([
          { $match: baseFilter },
          { $group: { _id: '$metadata.erfassungsperson', count: { $sum: 1 } } },
          { $match: { _id: { $ne: null } } },
          { $sort: { _id: 1 } }
        ]).toArray();
        
        results = personen
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