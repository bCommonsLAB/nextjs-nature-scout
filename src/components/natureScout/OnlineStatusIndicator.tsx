"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

/**
 * Persistenter Online-/Offline-Indikator (Session 1.5).
 *
 * Echter Erreichbarkeits-Check gegen `/api/health` (nicht nur `navigator.onLine`, das oft
 * fälschlich „online" meldet). Prüft bei Mount, periodisch und bei online/offline-Events.
 */
export function OnlineStatusIndicator() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      // Schneller Negativ-Check ohne Netzwerk
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        if (!cancelled) setOnline(false);
        return;
      }
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('/api/health', { method: 'GET', cache: 'no-store', signal: controller.signal });
        clearTimeout(timeout);
        if (!cancelled) setOnline(res.ok);
      } catch {
        if (!cancelled) setOnline(false);
      }
    };

    check();
    const interval = setInterval(check, 15000);
    const handleOnline = () => check();
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium ${
        online ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
      }`}
      title={online ? 'Online – Eingaben werden gespeichert' : 'Offline – Speichern derzeit nicht möglich'}
    >
      {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {online ? 'Online' : 'Offline'}
    </span>
  );
}
