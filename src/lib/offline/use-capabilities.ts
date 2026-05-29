"use client";

import { useCallback, useEffect, useState } from 'react';
import { checkLocalPersistence, checkOnline, chooseStrategy } from './capabilities';
import { Capabilities } from './types';

/**
 * React-Hook für die Laufzeit-Capabilities (Session 2.1).
 *
 * Erkennt `online` (echter Erreichbarkeits-Check) und `localPersistenceAvailable` (IndexedDB),
 * leitet die Strategie nach der Matrix ab und aktualisiert bei Mount, periodisch und bei
 * online/offline-Events. `refresh()` erlaubt manuelles Neuprüfen.
 */
export function useCapabilities(): Capabilities & { refresh: () => Promise<void> } {
  const [online, setOnline] = useState(true);
  const [localPersistenceAvailable, setLocalPersistenceAvailable] = useState(true);

  const refresh = useCallback(async () => {
    const [isOnline, hasLocal] = await Promise.all([checkOnline(), checkLocalPersistence()]);
    setOnline(isOnline);
    setLocalPersistenceAvailable(hasLocal);
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => { void refresh(); }, 15000);
    const handleOnline = () => { void refresh(); };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refresh]);

  return {
    online,
    localPersistenceAvailable,
    strategy: chooseStrategy(online, localPersistenceAvailable),
    refresh
  };
}
