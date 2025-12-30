import { NextResponse } from 'next/server';
import { Sort as MongoSort, Document } from 'mongodb';
import { connectToDatabase } from '@/lib/services/db';
import { UserService } from '@/lib/services/user-service';
import { requireAuth } from '@/lib/server-auth';

// Definiere die Typen
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
    polygonPoints?: [number, number][];
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
    kommentar?: string;
    zusammenfassung?: string;
    [key: string]: unknown;
  };
  error?: string;
}

// Funktion zum Umwandeln des Schutzstatus in Farbwerte
function mapSchutzstatusToColor(schutzstatus: string | undefined): string {
  if (!schutzstatus) return 'GREEN';
  
  const statusLower = schutzstatus.toLowerCase();
  
  // RED = gesetzlich geschützt
  if (statusLower.includes('gesetzlich')) {
    return 'RED';
  }
  
  // YELLOW = hochwertig (schützenswert, ökologisch hochwertig)
  if (statusLower.includes('hochwertig') || statusLower.includes('schützenswert')) {
    return 'YELLOW';
  }
  
  // GREEN = niederwertig (ökologisch niederwertig, standardvegetation)
  return 'GREEN';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get('sortBy') || 'startTime';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const searchTerm = searchParams.get('search') || '';
  const selectedPerson = searchParams.get('person') || '';
  
  try {
    // Authentifizierung
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
      deleted: { $ne: true },
      // Nur verifizierte Einträge exportieren
      verified: true
    };
    
    // Für normale Benutzer: Nur eigene Einträge anzeigen
    if (!hasAdvancedPermissions) {
      filter['metadata.email'] = userEmail;
    }
    
    // Füge Personenfilter hinzu, wenn ausgewählt und der Benutzer die Berechtigung hat
    if (selectedPerson && hasAdvancedPermissions) {
      filter['metadata.erfassungsperson'] = selectedPerson;
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
    
    const schutzstatus = searchParams.get('schutzstatus');
    if (schutzstatus) {
      filter['result.schutzstatus'] = schutzstatus;
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
    
    // Erstelle Sortierung
    const sort: MongoSort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Lade alle Einträge ohne Paginierung (für Export)
    const entries = await collection
      .find(filter)
      .sort(sort)
      .project({
        jobId: 1,
        updatedAt: 1,
        verified: 1,
        'metadata.gemeinde': 1,
        'metadata.flurname': 1,
        'metadata.latitude': 1,
        'metadata.longitude': 1,
        'metadata.polygonPoints': 1,
        'result.schutzstatus': 1,
        'verifiedResult.schutzstatus': 1
      })
      .toArray();
    
    // Hole die Basis-URL aus dem Request oder Umgebungsvariablen
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    process.env.NEXTAUTH_URL || 
                    (request.headers.get('host') ? `https://${request.headers.get('host')}` : '');
    
    // Transformiere die Daten in eine flache Struktur
    const exportedData = entries.map((entry: MongoDocument) => {
      // Verwende verifiedResult.schutzstatus falls vorhanden, sonst result.schutzstatus als Fallback
      const schutzstatus = entry.verifiedResult?.schutzstatus || entry.result?.schutzstatus;
      
      // URL für das Habitat (momentan leer, später: `${baseUrl}/habitat/${entry.jobId}`)
      const url = ''; // TODO: Später mit Link füllen: `${baseUrl}/habitat/${entry.jobId}`
      
      return {
        Id: entry.jobId,
        gemeinde: entry.metadata?.gemeinde || '',
        flurname: entry.metadata?.flurname || '',
        latitude: entry.metadata?.latitude || null,
        longitude: entry.metadata?.longitude || null,
        polygonPoints: entry.metadata?.polygonPoints || null,
        updatedAt: entry.updatedAt || '',
        schutzstatus: mapSchutzstatusToColor(schutzstatus),
        url: url
      };
    });
    
    // Erstelle die JSON-Struktur mit Header
    const exportStructure = {
      header: {
        source: 'Dachverband für Natur- und Umweltschutz',
        date: new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
      },
      data: exportedData
    };
    
    // Erstelle JSON-String mit schöner Formatierung
    const jsonString = JSON.stringify(exportStructure, null, 2);
    
    // Datum im Dateinamen verwenden
    const dateString = new Date().toISOString().split('T')[0];
    
    // JSON-Daten zurückgeben mit Dateinamen
    return new NextResponse(jsonString, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="habitat-export-${dateString}.json"`
      }
    });
  } catch (error) {
    console.error('Fehler beim Exportieren der Habitat-Daten:', error);
    return NextResponse.json(
      { error: 'Fehler beim Exportieren der Habitat-Daten' },
      { status: 500 }
    );
  }
}

