"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkOnline } from './capabilities';
import { listLocalSessions } from './db';
import { syncAllPending, SyncResult } from './sync';
import { LocalSession } from './types';

function isPending(status: LocalSession['status']): boolean {
  return status === 'entwurf_lokal' || status === 'sync_ausstehend' || status === 'sync_fehler';
}

/**
 * Trigger-Hook für die Sync-Engine (Session 2.4).
 *
 * Synchronisiert bei App-Start mit Empfang und beim `online`-Event automatisch; `syncNow()`
 * erlaubt manuelles Auslösen. Liefert sichtbaren Zustand (Anzahl ausstehender Syncs, laufender
 * Sync, lokale Sessions, letzte Ergebnisse) für die Offline-Status-UI (Session 2.5).
 */
export function useSync() {
  const [syncing, setSyncing] = useState(false);
  const [sessions, setSessions] = useState<LocalSession[]>([]);
  const [lastResults, setLastResults] = useState<SyncResult[]>([]);
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const all = await listLocalSessions();
      setSessions(all);
    } catch {
      // IndexedDB evtl. nicht verfügbar – Offline-Funktionen still deaktiviert
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const results = await syncAllPending();
      if (results.length > 0) setLastResults(results);
      await refresh();
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();
    // App-Start mit Empfang → automatisch synchronisieren
    void (async () => {
      if (await checkOnline()) void syncNow();
    })();
    const handleOnline = () => { void syncNow(); };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refresh, syncNow]);

  const pendingCount = sessions.filter(s => isPending(s.status)).length;

  return { syncing, pendingCount, sessions, lastResults, syncNow, refresh };
}
