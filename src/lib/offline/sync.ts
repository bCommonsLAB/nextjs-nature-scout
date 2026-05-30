// Sync-Engine für offline erfasste Sessions (Session 2.4).
//
// Pro Session: ausstehende Bild-Blobs → Azure (/api/upload, idempotent über clientImageId/imageKey),
// lokale Blob-Referenzen durch URLs ersetzen, Server-Entwurf anlegen/aktualisieren, lokal als
// `synchronisiert` markieren. Retry mit Backoff; Konflikt = Last-Write-Wins je `jobId`.
// PlantNet läuft erst hier (online), nicht während der Offline-Aufnahme. Spec §7.

import { Bild, NatureScoutData } from '@/types/nature-scout';
import { checkOnline } from './capabilities';
import { getImagesForSession, getLocalSession, listLocalSessions, putImageBlob, updateLocalSession } from './db';
import { StoredImage } from './types';

/** Pflanzenbild-Slots (PlantNet-Bestimmung) – vgl. Orchestrator-Schritte. */
const PLANT_IMAGE_PREFIX = 'Detailbild_';

export interface SyncResult {
  localId: string;
  jobId?: string;
  ok: boolean;
  error?: string;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelayMs = 1000): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, baseDelayMs * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

async function uploadStoredImage(
  image: StoredImage,
  jobId: string
): Promise<{ url: string; lowResUrl?: string; filename: string }> {
  const form = new FormData();
  const ext = (image.mimeType && image.mimeType.includes('png')) ? 'png' : 'jpg';
  const file = new File([image.blob], `${image.clientImageId}.${ext}`, { type: image.mimeType || 'image/jpeg' });
  form.append('image', file);
  // Idempotentes serverseitiges Verknüpfen (Session 1.3): clientImageId verhindert Doppel-Referenzen
  form.append('jobId', jobId);
  form.append('imageKey', image.imageKey);
  form.append('clientImageId', image.clientImageId);

  const res = await fetch('/api/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Bild-Upload fehlgeschlagen (${res.status})`);
  const data = await res.json();
  return { url: data.url, lowResUrl: data.lowResUrl, filename: data.filename || '' };
}

/** PlantNet-Bestimmung beim Sync (nur online, nur für Pflanzenbilder ohne Ergebnis). Best-Effort. */
async function analyzePlantIfNeeded(bild: Bild): Promise<Bild> {
  if (!bild.imageKey.startsWith(PLANT_IMAGE_PREFIX)) return bild;
  if (bild.plantnetResult || !bild.url) return bild;
  try {
    const res = await fetch('/api/analyze/plants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrls: [bild.url] })
    });
    if (!res.ok) return bild;
    const data = await res.json();
    const best = data?.results?.[0];
    if (best) {
      return {
        ...bild,
        analyse: best.species?.scientificNameWithoutAuthor || bild.analyse,
        plantnetResult: best
      };
    }
  } catch {
    // Best-Effort – Sync nicht wegen PlantNet abbrechen
  }
  return bild;
}

function stripImages(metadata: Partial<NatureScoutData>): Partial<NatureScoutData> {
  const clone: Partial<NatureScoutData> = { ...metadata };
  delete clone.bilder;
  return clone;
}

/** Synchronisiert genau eine lokale Session zum Server. */
export async function syncSession(localId: string): Promise<SyncResult> {
  const session = await getLocalSession(localId);
  if (!session) return { localId, ok: false, error: 'Session nicht gefunden' };
  if (session.status === 'synchronisiert' || session.status === 'abgeschlossen') {
    return { localId, jobId: session.jobId, ok: true };
  }

  try {
    await updateLocalSession(localId, { status: 'sync_ausstehend', lastError: undefined });

    // 1. Server-Entwurf sicherstellen
    let jobId = session.jobId;
    if (!jobId) {
      const res = await withRetry(() => fetch('/api/habitat/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: stripImages(session.metadata) })
      }));
      if (!res.ok) throw new Error(`Entwurf anlegen fehlgeschlagen (${res.status})`);
      const data = await res.json();
      jobId = data.jobId as string;
      await updateLocalSession(localId, { jobId });
    }
    if (!jobId) throw new Error('Keine jobId nach Anlegen des Entwurfs');

    // 2. Ausstehende Bilder hochladen und lokale Referenzen durch URLs ersetzen
    const images = await getImagesForSession(localId);
    const bilder: Bild[] = Array.isArray(session.metadata.bilder) ? [...session.metadata.bilder] : [];

    for (const img of images) {
      let url = img.uploadedUrl;
      let lowResUrl = img.uploadedLowResUrl;
      let filename = '';
      if (!url) {
        const uploaded = await withRetry(() => uploadStoredImage(img, jobId as string));
        url = uploaded.url;
        lowResUrl = uploaded.lowResUrl;
        filename = uploaded.filename;
        await putImageBlob({ ...img, uploadedUrl: url, uploadedLowResUrl: lowResUrl });
      }

      const idx = bilder.findIndex(
        b => (b.clientImageId && b.clientImageId === img.clientImageId) || b.imageKey === img.imageKey
      );
      const existing = idx >= 0 ? bilder[idx] : undefined;
      let bild: Bild = existing
        ? { ...existing }
        : { imageKey: img.imageKey, filename: '', url: '', analyse: null };
      bild = {
        ...bild,
        url: url || bild.url,
        lowResUrl: lowResUrl ?? bild.lowResUrl,
        filename: filename || bild.filename || '',
        clientImageId: img.clientImageId
      };
      bild = await analyzePlantIfNeeded(bild);
      if (idx >= 0) {
        bilder[idx] = bild;
      } else {
        bilder.push(bild);
      }
    }

    // 3. Metadaten am Server-Entwurf aktualisieren (Last-Write-Wins je jobId)
    const metadata: Partial<NatureScoutData> = { ...session.metadata, bilder };
    const patchRes = await withRetry(() => fetch(`/api/habitat/${jobId}/draft`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata })
    }));
    if (!patchRes.ok) throw new Error(`Aktualisieren des Entwurfs fehlgeschlagen (${patchRes.status})`);

    await updateLocalSession(localId, { status: 'synchronisiert', metadata, lastError: undefined });
    return { localId, jobId, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Sync-Fehler';
    await updateLocalSession(localId, { status: 'sync_fehler', lastError: message });
    return { localId, ok: false, error: message };
  }
}

/** Synchronisiert alle übertragbaren Sessions (nur wenn online). */
export async function syncAllPending(): Promise<SyncResult[]> {
  if (!(await checkOnline())) return [];
  const sessions = await listLocalSessions();
  const pending = sessions.filter(
    s => s.status === 'entwurf_lokal' || s.status === 'sync_ausstehend' || s.status === 'sync_fehler'
  );
  const results: SyncResult[] = [];
  for (const session of pending) {
    results.push(await syncSession(session.localId));
  }
  return results;
}
