import { PersistenceStrategy } from './types';

/**
 * Echter Erreichbarkeits-Check (Session 2.1): `navigator.onLine` ist unzuverlässig, daher
 * zusätzlich ein leichter Request gegen `/api/health`.
 */
export async function checkOnline(timeoutMs = 4000): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch('/api/health', { method: 'GET', cache: 'no-store', signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Prüft, ob IndexedDB nutzbar ist (kann durch Privatmodus/Browser-Einstellungen blockiert sein).
 * Öffnet kurz eine Test-DB.
 */
export async function checkLocalPersistence(): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false;
  try {
    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const done = (value: boolean) => { if (!settled) { settled = true; resolve(value); } };
      const request = indexedDB.open('naturescout-capability-test', 1);
      request.onsuccess = () => {
        try { request.result.close(); } catch { /* ignore */ }
        done(true);
      };
      request.onerror = () => done(false);
      request.onblocked = () => done(false);
      // Sicherheitsnetz: nach 3s als nicht verfügbar werten
      setTimeout(() => done(false), 3000);
    });
  } catch {
    return false;
  }
}

/** Wählt die Persistenzstrategie nach der Capability-Matrix (Spec §3). */
export function chooseStrategy(online: boolean, localPersistenceAvailable: boolean): PersistenceStrategy {
  if (online && localPersistenceAvailable) return 'server-sofort';
  if (online && !localPersistenceAvailable) return 'nur-server';
  if (!online && localPersistenceAvailable) return 'nur-lokal';
  return 'blockieren';
}
