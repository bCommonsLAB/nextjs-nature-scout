import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { getAnalysisJob, updateDraftMetadata } from '@/lib/services/analysis-service';
import { NatureScoutData } from '@/types/nature-scout';

/**
 * Server-kontrollierte Metadaten-Felder (Eigentum/Organisation) – werden bei PATCH ignoriert,
 * damit das Eigentum eines Entwurfs nicht überschrieben werden kann.
 */
const SERVER_CONTROLLED_FIELDS: Array<keyof NatureScoutData> = [
  'email',
  'erfassungsperson',
  'organizationId',
  'organizationName',
  'organizationLogo'
];

/**
 * PATCH /api/habitat/[auftragsId]/draft – Mergt Teil-Metadaten in einen Entwurf (idempotent,
 * je Erfassungsschritt aufrufbar). Body: `{ metadata: Partial<NatureScoutData> }`.
 *
 * `auftragsId` entspricht der `jobId` (vgl. specs/entitaeten/habitat.md). Nur eigene Entwürfe
 * (`status: 'draft'`, E-Mail-Eigentum) sind bearbeitbar.
 * Siehe specs/regeln/offline-erfassung-und-sync.md (§11) und offline-erfassung-umsetzungsplan.md (1.2).
 */
export async function PATCH(
  request: Request,
  { params }: { params: { auftragsId: string } }
) {
  const { auftragsId } = await params;
  const jobId = auftragsId;

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
    const existing = await getAnalysisJob(jobId);
    if (!existing) {
      return NextResponse.json({ error: 'Entwurf nicht gefunden' }, { status: 404 });
    }

    // Nur eigene Entwürfe bearbeitbar (strikt über E-Mail-Eigentum, kein Admin/Experte-Bypass)
    if (existing.metadata?.email !== userEmail) {
      return NextResponse.json(
        { error: 'Zugriff verweigert. Sie können nur eigene Entwürfe bearbeiten.' },
        { status: 403 }
      );
    }

    // Diese Route ist ausschließlich für Entwürfe – analysierte Habitate nicht über /draft ändern
    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Nur Entwürfe können über diese Route aktualisiert werden.' },
        { status: 409 }
      );
    }

    let partial: Partial<NatureScoutData> = {};
    try {
      const body = await request.json();
      if (body && typeof body === 'object' && body.metadata && typeof body.metadata === 'object') {
        partial = body.metadata as Partial<NatureScoutData>;
      } else {
        return NextResponse.json({ error: 'Feld "metadata" fehlt oder ist ungültig' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 });
    }

    // Server-kontrollierte Felder ignorieren (kein Ownership-Hijack)
    const sanitized: Partial<NatureScoutData> = { ...partial };
    for (const field of SERVER_CONTROLLED_FIELDS) {
      delete sanitized[field];
    }

    const updated = await updateDraftMetadata(jobId, sanitized);
    if (!updated) {
      return NextResponse.json({ error: 'Entwurf konnte nicht aktualisiert werden' }, { status: 500 });
    }

    return NextResponse.json({ jobId, status: updated.status, updatedAt: updated.updatedAt });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Entwurfs:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Entwurfs' }, { status: 500 });
  }
}
