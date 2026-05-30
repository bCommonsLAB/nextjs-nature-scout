"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Trash2 } from "lucide-react";
import { deleteLocalSession, listLocalSessions } from "@/lib/offline/db";
import { estimateStorage, formatBytes } from "@/lib/offline/storage";
import { LocalSession, LocalSessionStatus } from "@/lib/offline/types";

const STATUS_LABEL: Record<LocalSessionStatus, string> = {
  entwurf_lokal: 'Nur lokal gespeichert',
  sync_ausstehend: 'Wird synchronisiert…',
  synchronisiert: 'Synchronisiert',
  abgeschlossen: 'Abgeschlossen',
  sync_fehler: 'Synchronisierung fehlgeschlagen'
};

/**
 * „Offline-Daten bereinigen" im Nutzerprofil (Session 2.6).
 *
 * Zeigt lokal (IndexedDB) verbliebene Erfassungs-Sessions samt belegtem Speicher und erlaubt
 * gezieltes Löschen (inkl. Bild-Blobs). Hinweis: Das Offline-Zwischenspeichern selbst braucht
 * kein gesondertes Consent (Entscheidung §11) – Consent gilt beim Abschluss/Einreichen.
 */
export function OfflineDataManager() {
  const [sessions, setSessions] = useState<LocalSession[]>([]);
  const [storageText, setStorageText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const all = await listLocalSessions();
      setSessions(all);
      const estimate = await estimateStorage();
      setStorageText(estimate ? `${formatBytes(estimate.usage)} von ${formatBytes(estimate.quota)} belegt` : null);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const remove = async (localId: string) => {
    if (!confirm('Diese lokale Offline-Erfassung endgültig löschen? Noch nicht synchronisierte Daten gehen verloren.')) {
      return;
    }
    try {
      await deleteLocalSession(localId);
      await refresh();
    } catch {
      alert('Lokale Session konnte nicht gelöscht werden.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offline-Daten</CardTitle>
        <CardDescription>
          Auf diesem Gerät zwischengespeicherte Erfassungen (Entwürfe und Bilder).
          {storageText ? ` Speicher: ${storageText}.` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-gray-500">Wird geladen…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-500">Keine lokalen Offline-Daten vorhanden.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.localId} className="flex items-center justify-between gap-2 border rounded p-2">
                <div className="text-sm">
                  <div className="font-medium">
                    {s.metadata?.gemeinde || 'Unbekannter Standort'}
                    {s.metadata?.flurname ? ` · ${s.metadata.flurname}` : ''}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Array.isArray(s.metadata?.bilder) ? s.metadata.bilder.length : 0} Bild(er)
                    {' · '}{STATUS_LABEL[s.status]}
                    {' · '}{new Date(s.updatedAt).toLocaleString('de-DE')}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => remove(s.localId)}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Löschen
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Button size="sm" variant="ghost" onClick={() => void refresh()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Aktualisieren
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
