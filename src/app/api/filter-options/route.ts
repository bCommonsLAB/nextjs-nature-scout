import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { UserService } from '@/lib/services/user-service';
import { getFilterOptions } from '@/lib/services/habitat-service';
import { connectToDatabase } from '@/lib/services/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filterType = searchParams.get('type'); // 'gemeinden', 'habitate', 'familien', 'schutzstati', 'personen', 'organizations'
  
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