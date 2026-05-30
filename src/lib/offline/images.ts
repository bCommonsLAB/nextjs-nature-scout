// Lokales Offline-Bild-Handling (Session 2.3).
// Aufnahme → Blob lokal in IndexedDB ablegen (volle Qualität, kein Downscaling), Vorschau via
// URL.createObjectURL. Vor der Ablage proaktive Speicherprüfung; QuotaExceededError abfangen.

import { generateId, getImageBlob, putImageBlob } from './db';
import { checkStorageWarning, isQuotaExceeded } from './storage';
import { StoredImage } from './types';

export interface LocalImageResult {
  image: StoredImage;
  /** Object-URL für die sofortige Vorschau (vom Aufrufer per revokeObjectURL freigeben). */
  previewUrl: string;
  /** Hinweis: lokaler Speicher wird knapp → zum Synchronisieren auffordern. */
  storageWarning: boolean;
}

/**
 * Legt ein aufgenommenes Bild als Blob lokal ab (mit stabiler `clientImageId`) und liefert eine
 * Vorschau-URL zurück. Wirft eine klare Fehlermeldung bei vollem Speicher.
 */
export async function storeImageLocally(params: {
  localSessionId: string;
  imageKey: string;
  blob: Blob;
  clientImageId?: string;
  orientation?: number;
}): Promise<LocalImageResult> {
  const clientImageId = params.clientImageId || generateId();

  const warning = await checkStorageWarning(params.blob.size);

  const image: StoredImage = {
    clientImageId,
    localSessionId: params.localSessionId,
    imageKey: params.imageKey,
    blob: params.blob,
    mimeType: params.blob.type || 'image/jpeg',
    orientation: params.orientation,
    createdAt: Date.now()
  };

  try {
    await putImageBlob(image);
  } catch (error) {
    if (isQuotaExceeded(error)) {
      throw new Error('Lokaler Speicher ist voll. Bitte synchronisieren Sie, um Speicher freizugeben.');
    }
    throw error;
  }

  return {
    image,
    previewUrl: URL.createObjectURL(params.blob),
    storageWarning: warning.low
  };
}

/** Erzeugt eine Vorschau-URL aus einem lokal gespeicherten Bild (oder null, falls nicht vorhanden). */
export async function getLocalImagePreviewUrl(clientImageId: string): Promise<string | null> {
  const stored = await getImageBlob(clientImageId);
  if (!stored) return null;
  return URL.createObjectURL(stored.blob);
}
