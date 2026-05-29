// Proaktive Speicherprüfung für die lokale (Offline-)Bildablage (Session 2.3).
// Entscheidung (Spec §4): KEIN Downscaling – Bildqualität hat Vorrang. Stattdessen freien
// Speicher proaktiv prüfen und frühzeitig warnen; QuotaExceededError zusätzlich abfangen.

export interface StorageEstimate {
  usage: number;
  quota: number;
  available: number;
  usageRatio: number;
}

// Schwellwerte für die Warnung
const LOW_STORAGE_ABSOLUTE_BYTES = 100 * 1024 * 1024; // < 100 MB frei
const LOW_STORAGE_RATIO = 0.9;                          // > 90 % belegt

export interface StorageWarning {
  low: boolean;
  reason?: 'ratio' | 'absolute';
  estimate: StorageEstimate | null;
}

/** Liest `navigator.storage.estimate()` aus (falls verfügbar). */
export async function estimateStorage(): Promise<StorageEstimate | null> {
  if (typeof navigator === 'undefined' || !navigator.storage || typeof navigator.storage.estimate !== 'function') {
    return null;
  }
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    const available = Math.max(0, quota - usage);
    const usageRatio = quota > 0 ? usage / quota : 0;
    return { usage, quota, available, usageRatio };
  } catch {
    return null;
  }
}

/**
 * Prüft proaktiv, ob für die anstehende Ablage (geschätzt `neededBytes`) genug Platz ist.
 * Liefert `low: true`, wenn zu wenig frei (absolut oder relativ).
 */
export async function checkStorageWarning(neededBytes = 0): Promise<StorageWarning> {
  const estimate = await estimateStorage();
  if (!estimate) return { low: false, estimate: null };
  if (estimate.usageRatio >= LOW_STORAGE_RATIO) {
    return { low: true, reason: 'ratio', estimate };
  }
  if (estimate.available - neededBytes < LOW_STORAGE_ABSOLUTE_BYTES) {
    return { low: true, reason: 'absolute', estimate };
  }
  return { low: false, estimate };
}

/** Erkennt einen Kontingent-Fehler (Sicherheitsnetz). */
export function isQuotaExceeded(error: unknown): boolean {
  return (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.code === 22)
  );
}

/** Formatiert Bytes menschenlesbar (für Warnhinweise/Bereinigungs-UI). */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}
