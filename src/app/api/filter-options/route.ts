import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { auth } from '@clerk/nextjs/server';
import { normalizeSchutzstatus } from '@/lib/utils/data-validation';
import { UserService } from '@/lib/services/user-service';

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
    
    // Benutzerberechtigungen prüfen
    const isAdmin = await UserService.isAdmin(userId);
    const isExpert = await UserService.isExpert(userId);
    const hasAdvancedPermissions = isAdmin || isExpert;
    
    // Benutzer für Email-Filterung holen
    const userRecord = await UserService.findByClerkId(userId);
    if (!userRecord) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }
    
    const userEmail = userRecord.email;
    
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    // Basisfilter: nicht gelöschte Dokumente
    const baseMatch: { 
      deleted?: { $ne: boolean },
      'metadata.email'?: string 
    } = { deleted: { $ne: true } };
    
    // Für normale Benutzer: Nur eigene Einträge
    if (!hasAdvancedPermissions) {
      baseMatch['metadata.email'] = userEmail;
    }
    
    let results: string[] = [];
    
    switch (filterType) {
      case 'gemeinden':
        // Aggregation für eindeutige Gemeinden
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
        // Aggregation für eindeutige Habitat-Typen
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
        // Aggregation für eindeutige Habitat-Familien
        const habitateForFamilies = await collection.aggregate([
          { $match: baseMatch },
          { $group: { _id: '$result.habitatFamilie' } }, // Direkt nach Habitat-Familie suchen
          { $match: { _id: { $ne: null } } },
          { $sort: { _id: 1 } }
        ]).toArray();
        
        results = habitateForFamilies
          .map(item => item._id)
          .filter(Boolean) as string[];
        break;
        
      case 'schutzstati':
        // Aggregation für eindeutige Schutzstatus-Werte
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
        // Für normale Benutzer: Nur eigene Person anzeigen
        if (!hasAdvancedPermissions) {
          // Benutze den Erfasser-Namen des Benutzers
          const personName = await collection.findOne(
            { 'metadata.email': userEmail },
            { projection: { 'metadata.erfassungsperson': 1 } }
          );
          
          if (personName && personName.metadata && personName.metadata.erfassungsperson) {
            results = [personName.metadata.erfassungsperson];
          }
        } else {
          // Für Experten/Admins: Alle Personen anzeigen
          const personenAgg = await collection.aggregate([
            { $match: { deleted: { $ne: true } } },
            { $group: { _id: '$metadata.erfassungsperson' } },
            { $match: { _id: { $ne: null } } },
            { $sort: { _id: 1 } }
          ]).toArray();
          
          results = personenAgg
            .map(item => item._id)
            .filter(Boolean) as string[];
        }
        break;
        
      default:
        // Wenn kein spezifischer Filtertyp angegeben, einen Fehler zurückgeben
        return NextResponse.json(
          { error: 'Ungültiger Filter-Typ' },
          { status: 400 }
        );
    }
    
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