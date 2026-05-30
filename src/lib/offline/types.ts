// Lokales Statusmodell + Persistenzstrategie für die offline-fähige Erfassung (Phase 2).
// Fachliche Quelle: specs/regeln/offline-erfassung-und-sync.md (§3, §5).

import { NatureScoutData } from '@/types/nature-scout';

/** Lokaler Status einer Erfassungs-Session (Client/IndexedDB). */
export type LocalSessionStatus =
  | 'entwurf_lokal'      // offline erfasst, nur lokal vorhanden
  | 'sync_ausstehend'    // bereit zur Übertragung
  | 'synchronisiert'     // serverseitig gespeichert (jobId vorhanden)
  | 'abgeschlossen'      // analysiert/eingereicht (vom Server bestätigt)
  | 'sync_fehler';       // Übertragung fehlgeschlagen (Retry möglich)

/**
 * Persistenzstrategie gemäß Capability-Matrix (Spec §3):
 * | online | lokal | Strategie       |
 * |   ✅   |  ✅   | server-sofort   | Server sofort + lokal spiegeln
 * |   ✅   |  ❌   | nur-server      | nur Server (kein lokaler Bedarf)
 * |   ❌   |  ✅   | nur-lokal       | lokal (IndexedDB), Sync sobald online
 * |   ❌   |  ❌   | blockieren      | hart blockieren (Erfassung nicht zulassen)
 */
export type PersistenceStrategy =
  | 'server-sofort'
  | 'nur-server'
  | 'nur-lokal'
  | 'blockieren';

export interface Capabilities {
  /** Netzverfügbarkeit (navigator.onLine UND echter Erreichbarkeits-Check). */
  online: boolean;
  /** Ist IndexedDB nutzbar (kann durch Privatmodus/Einstellungen blockiert sein)? */
  localPersistenceAvailable: boolean;
  /** Abgeleitete Strategie nach Matrix. */
  strategy: PersistenceStrategy;
}

/** Eine lokal (IndexedDB) gehaltene Erfassungs-Session (Session 2.2). */
export interface LocalSession {
  /** Client-generierte, stabile lokale ID (Primärschlüssel in IndexedDB). */
  localId: string;
  /** Server-`jobId`, sobald die Session synchronisiert wurde. */
  jobId?: string;
  status: LocalSessionStatus;
  /** (Teil-)Erfassungsdaten – wie beim Server-Entwurf, aber lokal. */
  metadata: Partial<NatureScoutData>;
  /** Aktiver Erfassungsschritt (für Resume). */
  aktiverSchritt?: number;
  createdAt: number;
  updatedAt: number;
  /** Letzter Sync-Fehler (für sichtbare Fehlermeldung, nicht verschlucken). */
  lastError?: string;
}

/** Ein lokal gespeichertes Bild (Blob) einer Session (Session 2.2/2.3). */
export interface StoredImage {
  /** Stabile Client-ID (Idempotenz beim Sync). */
  clientImageId: string;
  /** Zugehörige lokale Session. */
  localSessionId: string;
  /** Logischer Slot (z. B. „Panoramabild", „Detailbild_1"). */
  imageKey: string;
  blob: Blob;
  mimeType: string;
  /** EXIF-Orientierung (falls ermittelt). */
  orientation?: number;
  /** Nach Sync: hochgeladene Azure-URLs. */
  uploadedUrl?: string;
  uploadedLowResUrl?: string;
  createdAt: number;
}
