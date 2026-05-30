import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/server-auth';
import { UserService } from '@/lib/services/user-service';
import { createDraftJob } from '@/lib/services/analysis-service';
import { NatureScoutData } from '@/types/nature-scout';

/**
 * Server-kontrollierte Metadaten-Felder (Eigentum/Organisation). Sie werden serverseitig
 * aus dem angemeldeten Benutzer gesetzt und dürfen nicht vom Client überschrieben werden
 * (kein Ownership-Hijack).
 */
const SERVER_CONTROLLED_FIELDS: Array<keyof NatureScoutData> = [
  'email',
  'erfassungsperson',
  'organizationId',
  'organizationName',
  'organizationLogo'
];

/**
 * POST /api/habitat/draft – Legt einen neuen Entwurf (`status: 'draft'`) an und liefert die `jobId`.
 *
 * Optionaler Body: `{ metadata?: Partial<NatureScoutData> }` (initiale Teil-Metadaten).
 * Eigentum (E-Mail) und Organisationsdaten werden serverseitig gesetzt.
 * Siehe specs/regeln/offline-erfassung-und-sync.md (§11) und offline-erfassung-umsetzungsplan.md (1.2).
 */
export async function POST(request: Request) {
  let currentUser;
  try {
    currentUser = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const userEmail = currentUser.email;
  if (!userEmail) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    // Benutzerdaten für Eigentum/Organisation laden
    const userRecord = await UserService.findByEmail(userEmail);
    if (!userRecord) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    // Optionale initiale (Teil-)Metadaten aus dem Request – fehlender/ungültiger Body ist zulässig
    let clientMetadata: Partial<NatureScoutData> = {};
    try {
      const body = await request.json();
      if (body && typeof body === 'object' && body.metadata && typeof body.metadata === 'object') {
        clientMetadata = body.metadata as Partial<NatureScoutData>;
      }
    } catch {
      // Kein Body → leerer Entwurf ist zulässig
    }

    // Server-kontrollierte Felder aus Client-Daten entfernen
    const sanitized: Partial<NatureScoutData> = { ...clientMetadata };
    for (const field of SERVER_CONTROLLED_FIELDS) {
      delete sanitized[field];
    }

    const metadata: Partial<NatureScoutData> = {
      ...sanitized,
      email: userRecord.email,
      erfassungsperson: userRecord.name,
      organizationId: userRecord.organizationId ?? '',
      organizationName: userRecord.organizationName ?? '',
      organizationLogo: userRecord.organizationLogo ?? ''
    };

    const jobId = new ObjectId().toString();
    await createDraftJob(jobId, metadata);

    return NextResponse.json({ jobId, status: 'draft' }, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Anlegen des Entwurfs:', error);
    return NextResponse.json({ error: 'Fehler beim Anlegen des Entwurfs' }, { status: 500 });
  }
}
