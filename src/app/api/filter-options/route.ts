import { NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';
import { getFilterOptions } from '@/lib/services/habitat-service';
import { connectToDatabase } from '@/lib/services/db';
import { requireAuth } from '@/lib/server-auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filterType = searchParams.get('type'); // 'gemeinden', 'habitate', 'familien', 'schutzstati', 'personen', 'organizations'
  
  try {
    // Echte Authentifizierung
    const currentUser = await requireAuth();
    const userEmail = currentUser.email;
    const isAdmin = await UserService.isAdmin(userEmail);
    const isExpert = await UserService.isExpert(userEmail);
    const hasAdvancedPermissions = isAdmin || isExpert;
    
    // Prüfe, ob das angeforderte Filtertyp gültig ist
    if (!filterType || !['gemeinden', 'habitate', 'familien', 'schutzstati', 'personen', 'organizations'].includes(filterType)) {
      return NextResponse.json(
        { error: 'Ungültiger Filter-Typ' },
        { status: 400 }
      );
    }
    
    // Spezielle Behandlung für Organisationen
    if (filterType === 'organizations') {
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
      
      // Aggregation für Organisationen
      const organizationsAgg = await collection.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$metadata.organizationName' } },
        { $match: { _id: { $ne: null } } },
        { $match: { _id: { $ne: '' } } },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      const results = organizationsAgg
        .map(item => item._id)
        .filter(Boolean) as string[];
      
      return NextResponse.json({
        organizations: results
      });
    }
    
    // Für andere Filtertypen: Verwende die optimierte Funktion mit Cache aus dem habitat-service
    const results = await getFilterOptions(
      filterType as 'gemeinden' | 'habitate' | 'familien' | 'schutzstati' | 'personen',
      userEmail,
      hasAdvancedPermissions
    );
    
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