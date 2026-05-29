// IndexedDB-Layer für offline-fähige Erfassung (Session 2.2).
// Speichert je Erfassung eine „Session" (Metadaten) + zugehörige Bild-Blobs.
// Ein kleiner Zeiger (aktive Session-ID) liegt zusätzlich in localStorage für schnellen Start.
//
// Bewusst ohne externe Abhängigkeit (raw IndexedDB, promisifiziert). Alle Funktionen sind
// nur clientseitig nutzbar und werfen, wenn IndexedDB nicht verfügbar ist (vorher per
// checkLocalPersistence() / Capability-Matrix absichern). Fachliche Quelle: §4/§6 der Spec.

import { LocalSession, LocalSessionStatus, StoredImage } from './types';

const DB_NAME = 'naturescout-offline';
const DB_VERSION = 1;
const STORE_SESSIONS = 'sessions';
const STORE_IMAGES = 'images';
const ACTIVE_SESSION_KEY = 'naturescout-active-offline-session';

function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined';
}

/** Stabile ID erzeugen (mit Fallback, falls crypto.randomUUID fehlt). */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function openDB(): Promise<IDBDatabase> {
  if (!hasIndexedDB()) {
    return Promise.reject(new Error('IndexedDB ist nicht verfügbar'));
  }
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: 'localId' });
      }
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        const imageStore = db.createObjectStore(STORE_IMAGES, { keyPath: 'clientImageId' });
        imageStore.createIndex('localSessionId', 'localSessionId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function createLocalSession(
  initial: Partial<Omit<LocalSession, 'localId' | 'createdAt' | 'updatedAt'>> = {}
): Promise<LocalSession> {
  const db = await openDB();
  const now = Date.now();
  const session: LocalSession = {
    localId: generateId(),
    status: 'entwurf_lokal',
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...initial
  };
  const tx = db.transaction(STORE_SESSIONS, 'readwrite');
  tx.objectStore(STORE_SESSIONS).put(session);
  await txDone(tx);
  db.close();
  return session;
}

export async function getLocalSession(localId: string): Promise<LocalSession | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_SESSIONS, 'readonly');
  const result = await promisifyRequest(tx.objectStore(STORE_SESSIONS).get(localId));
  db.close();
  return (result as LocalSession) || null;
}

export async function listLocalSessions(): Promise<LocalSession[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_SESSIONS, 'readonly');
  const result = await promisifyRequest(tx.objectStore(STORE_SESSIONS).getAll());
  db.close();
  const sessions = (result as LocalSession[]) || [];
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateLocalSession(
  localId: string,
  patch: Partial<Omit<LocalSession, 'localId' | 'createdAt'>>
): Promise<LocalSession | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_SESSIONS, 'readwrite');
  const store = tx.objectStore(STORE_SESSIONS);
  const existing = (await promisifyRequest(store.get(localId))) as LocalSession | undefined;
  if (!existing) {
    db.close();
    return null;
  }
  const updated: LocalSession = { ...existing, ...patch, localId, updatedAt: Date.now() };
  store.put(updated);
  await txDone(tx);
  db.close();
  return updated;
}

export async function setLocalSessionStatus(
  localId: string,
  status: LocalSessionStatus,
  lastError?: string
): Promise<LocalSession | null> {
  return updateLocalSession(localId, { status, lastError });
}

export async function deleteLocalSession(localId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORE_SESSIONS, STORE_IMAGES], 'readwrite');
  tx.objectStore(STORE_SESSIONS).delete(localId);
  // Zugehörige Bilder mitlöschen
  const index = tx.objectStore(STORE_IMAGES).index('localSessionId');
  const keysReq = index.getAllKeys(IDBKeyRange.only(localId));
  keysReq.onsuccess = () => {
    const imageStore = tx.objectStore(STORE_IMAGES);
    for (const key of keysReq.result) {
      imageStore.delete(key as IDBValidKey);
    }
  };
  await txDone(tx);
  db.close();
  if (getActiveLocalSessionId() === localId) {
    setActiveLocalSessionId(null);
  }
}

// ---------------------------------------------------------------------------
// Bilder (Blobs)
// ---------------------------------------------------------------------------

export async function putImageBlob(image: StoredImage): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_IMAGES, 'readwrite');
  tx.objectStore(STORE_IMAGES).put(image);
  await txDone(tx);
  db.close();
}

export async function getImageBlob(clientImageId: string): Promise<StoredImage | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_IMAGES, 'readonly');
  const result = await promisifyRequest(tx.objectStore(STORE_IMAGES).get(clientImageId));
  db.close();
  return (result as StoredImage) || null;
}

export async function getImagesForSession(localSessionId: string): Promise<StoredImage[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_IMAGES, 'readonly');
  const index = tx.objectStore(STORE_IMAGES).index('localSessionId');
  const result = await promisifyRequest(index.getAll(IDBKeyRange.only(localSessionId)));
  db.close();
  const images = (result as StoredImage[]) || [];
  return images.sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteImage(clientImageId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_IMAGES, 'readwrite');
  tx.objectStore(STORE_IMAGES).delete(clientImageId);
  await txDone(tx);
  db.close();
}

// ---------------------------------------------------------------------------
// Aktiver-Session-Zeiger (localStorage, schneller Start)
// ---------------------------------------------------------------------------

export function getActiveLocalSessionId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

export function setActiveLocalSessionId(localId: string | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (localId) {
      localStorage.setItem(ACTIVE_SESSION_KEY, localId);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  } catch {
    // localStorage evtl. blockiert – nicht kritisch
  }
}

/**
 * Löscht die lokale Session, die zu einer Server-`jobId` gehört (Aufräumen nach bestätigtem
 * Abschluss, Session 2.6). No-op, wenn keine passende Session existiert.
 */
export async function deleteLocalSessionByJobId(jobId: string): Promise<void> {
  if (!jobId) return;
  const sessions = await listLocalSessions();
  const match = sessions.find(s => s.jobId === jobId);
  if (match) {
    await deleteLocalSession(match.localId);
  }
}

/** Anzahl Sessions mit ausstehendem Sync (für die Offline-Status-UI, Session 2.5). */
export async function countPendingSyncSessions(): Promise<number> {
  const sessions = await listLocalSessions();
  return sessions.filter(s => s.status === 'entwurf_lokal' || s.status === 'sync_ausstehend' || s.status === 'sync_fehler').length;
}
