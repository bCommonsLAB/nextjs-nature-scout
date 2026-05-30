"use client";

import { useEffect } from "react";

/**
 * Registriert den Service Worker (Session 3.2) – nur in Produktion (in Dev stört SW-Caching
 * das Hot-Reloading). Damit startet die App auch ohne Empfang („cold-offline") und ist
 * installierbar. Fehler bei der Registrierung sind nicht kritisch.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registrierung fehlgeschlagen – App funktioniert weiterhin ohne SW
      });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }
    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
