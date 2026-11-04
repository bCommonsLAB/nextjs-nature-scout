import { NextResponse } from 'next/server';
import { Sort as MongoSort, Document } from 'mongodb';
import { connectToDatabase } from '@/lib/services/db';
import { UserService } from '@/lib/services/user-service';
import { requireAuth } from '@/lib/server-auth';
import { wgs84ToUtm32N } from '@/lib/utils/geo';

// Definiere die Typen
interface MongoFilter {
  deleted?: { $ne: boolean };
  status?: { $ne: string };
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
  protectionStatus?: 'red' | 'yellow' | 'green';
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

// Funktion zum Umwandeln des protectionStatus in Farbwerte (für Fallback)
function mapProtectionStatusToColor(protectionStatus: 'red' | 'yellow' | 'green' | undefined): string {
  if (!protectionStatus) return 'GREEN';
  
  switch (protectionStatus) {
    case 'red':
      return 'RED';
    case 'yellow':
      return 'YELLOW';
    case 'green':
      return 'GREEN';
    default:
      return 'GREEN';
  }
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
      // Entwürfe (status: 'draft') nie exportieren
      status: { $ne: 'draft' },
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
        'verifiedResult.schutzstatus': 1,
        protectionStatus: 1
      })
      .toArray();
    
    // Hole die Basis-URL aus dem Request oder Umgebungsvariablen
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    process.env.NEXTAUTH_URL || 
                    (request.headers.get('host') ? `https://${request.headers.get('host')}` : '');
    
    // Transformiere die Daten in eine flache Struktur
    const exportedData = entries.map((entry: MongoDocument) => {
      // Verwende protectionStatus direkt, mit Fallback auf schutzstatus für alte Daten
      let protectionStatus: 'red' | 'yellow' | 'green' | undefined = entry.protectionStatus;
      
      // Fallback: Wenn protectionStatus fehlt, berechne aus schutzstatus
      if (!protectionStatus) {
        const schutzstatus = entry.verifiedResult?.schutzstatus || entry.result?.schutzstatus;
        if (schutzstatus) {
          const statusLower = typeof schutzstatus === 'string' ? schutzstatus.toLowerCase() : '';
          if (statusLower.includes('gesetzlich')) {
            protectionStatus = 'red';
          } else if (statusLower.includes('hochwertig') || statusLower.includes('schützenswert')) {
            protectionStatus = 'yellow';
          } else {
            protectionStatus = 'green';
          }
        } else {
          protectionStatus = 'green';
        }
      }
      
      // URL für das Habitat (momentan leer, später: `${baseUrl}/habitat/${entry.jobId}`)
      const url = ''; // TODO: Später mit Link füllen: `${baseUrl}/habitat/${entry.jobId}`
      
      // Reprojektion WGS84 (EPSG:4326) -> EPSG:25832 (ETRS89/UTM 32N) für den Gemeinde-GeoBrowser.
      const latW = entry.metadata?.latitude;
      const lonW = entry.metadata?.longitude;
      let east: number | null = null;
      let north: number | null = null;
      if (typeof latW === 'number' && typeof lonW === 'number') {
        const utm = wgs84ToUtm32N(latW, lonW);
        east = Math.round(utm.easting * 100) / 100;
        north = Math.round(utm.northing * 100) / 100;
      }
      const polygonPointsWgs84 = entry.metadata?.polygonPoints || null;
      const polygon = Array.isArray(polygonPointsWgs84)
        ? polygonPointsWgs84
            .filter((p) => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number')
            .map((p): [number, number] => {
              const utm = wgs84ToUtm32N(p[0], p[1]);
              return [Math.round(utm.easting * 100) / 100, Math.round(utm.northing * 100) / 100];
            })
        : null;

      return {
        Id: entry.jobId,
        gemeinde: entry.metadata?.gemeinde || '',
        flurname: entry.metadata?.flurname || '',
        // EPSG:25832 (ETRS89/UTM 32N) – für den Import in den Gemeinde-GeoBrowser:
        east,
        north,
        polygon,
        // WGS84 (EPSG:4326) – Referenz:
        latitude: entry.metadata?.latitude || null,
        longitude: entry.metadata?.longitude || null,
        polygonPoints: polygonPointsWgs84,
        updatedAt: entry.updatedAt || '',
        protectionStatus: mapProtectionStatusToColor(protectionStatus),
        url: url
      };
    });
    
    // Erstelle die JSON-Struktur mit Header
    const exportStructure = {
      header: {
        source: 'Dachverband für Natur- und Umweltschutz',
        date: new Date().toISOString().split('T')[0], // Format: YYYY-MM-DD
        // Koordinatensystem von east/north/polygon (Standard Südtirol, vom Gemeindenverband angefordert):
        crs: 'EPSG:25832',
        crsName: 'ETRS89 / UTM Zone 32N',
        // latitude/longitude/polygonPoints sind zusätzlich in WGS84 enthalten:
        crsWgs84: 'EPSG:4326'
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

