# Umsetzungsplan: Ausfallsichere & offline-fähige Habitat-Erfassung

> **Arbeitsdokument für die schrittweise Implementierung.** Jede Zeile mit `[ ]` ist eine
> abgeschlossene, einzeln verifizierbare **Arbeits-Session**. Alle Sessions laufen auf dem
> Branch **`feature/offline-erfassung`**. Reihenfolge möglichst einhalten (spätere Sessions
> bauen auf früheren auf). Nach jeder Session: Checkbox abhaken, kurz im Logbuch (§ unten)
> vermerken, committen.

- **Spec (fachliche Wahrheit):** `specs/regeln/offline-erfassung-und-sync.md`
- **Betroffene Entität:** `specs/entitaeten/habitat.md` (`AnalysisJob`)
- **Branch:** `feature/offline-erfassung`

## Arbeitsweise je Session

1. **Spec lesen** (`offline-erfassung-und-sync.md`) – maßgeblich; bei Abweichung Spec zuerst anpassen.
2. **Genau eine Session** aus der Liste umsetzen (kleiner, abgeschlossener Schritt).
3. **Verifizieren** (Definition of Done, s. u.).
4. **Checkbox + Logbuch** in diesem Dokument aktualisieren.
5. **Committen** mit klarer Message (`feat(offline): …`, `docs(spec): …`).
6. Nicht mehrere Sessions in einem Rutsch – kleine, prüfbare Schritte.

### Definition of Done (für jede Session)

- `npm run lint` grün.
- `npm run build` grün.
- TypeScript-Fehleranzahl (`tsc --noEmit`) **≤ Baseline** (Baseline beim Start von Session 1.1 festhalten).
- Wo möglich manuell verifiziert (DevTools, echtes Smartphone bei Offline-Themen).
- Spec & dieses Dokument konsistent gehalten.

---

## Phase 1 – Datenrettung (online-first)

> Ziel: Behebt den Hauptschmerz für alle mit zumindest zeitweisem Empfang.
> Server-Entwurf früh anlegen, Bilder sofort verknüpfen, ehrliche Bestätigung, Resume.

- [x] **1.0 – Baseline & Setup.** `tsc --noEmit`-Fehleranzahl als Baseline notieren (Logbuch).
  Lint/Build-Ausgangszustand festhalten. Keine Code-Änderung außer ggf. diesem Dokument.

- [x] **1.1 – Status `draft` einführen (Typen + Listen-Filter).**
  - `AnalysisJob.status` um `'draft'` erweitern (`src/types/nature-scout.ts`).
  - `specs/entitaeten/habitat.md` nachziehen (Status-Wert + Invariante: `draft` nie öffentlich,
    nie in normalen Listen).
  - Alle öffentlichen/Listen-Queries `status: 'draft'` ausschließen lassen
    (zusätzlich zu `verified`/`deleted`). Fundstellen: Service-/API-Queries in
    `src/lib/services/*` und `src/app/api/*` (Habitat-Listen, öffentliche Karte).
  - DB-Index `{ 'metadata.email': 1, status: 1 }` für „Meine Entwürfe".

- [x] **1.2 – API: Entwurf anlegen & aktualisieren.**
  - `POST /api/habitat/draft` → legt `AnalysisJob` mit `status: 'draft'` an, liefert `jobId`.
  - `PATCH /api/habitat/[jobId]/draft` → upsert von Teil-Metadaten (idempotent, je Schritt aufrufbar).
  - `GET /api/habitat/mine?status=draft` → eigene Entwürfe (für Resume / „Meine Habitate → Entwürfe").
  - Berechtigungen strikt über `src/lib/server-auth.ts`; nur eigene Entwürfe bearbeitbar.
  - Wiederverwenden, wo möglich: `analysis-service.ts` (`createAnalysisJob`).

- [x] **1.3 – Bilder serverseitig an Entwurf verknüpfen (verwaiste Bilder beheben).**
  - `/api/upload` optional `jobId` akzeptieren; bei vorhandenem Entwurf die Bild-Referenz
    direkt am `AnalysisJob` persistieren (statt nur in Azure abzulegen).
  - Idempotenz über `clientImageId` vorbereiten (Doppel-Uploads vermeiden).
  - Sicherstellen: vor Analyse-Schritt hochgeladene Bilder sind nicht mehr „verwaist".

- [x] **1.4 – Auto-Save im Orchestrator (online).**
  - In `src/components/natureScout/NatureScout.tsx` Entwurf **früh** anlegen
    (`POST /api/habitat/draft`, sobald Erfassung beginnt) und je Schritt
    `PATCH …/draft` aufrufen (online).
  - Context (`src/context/nature-scout-context.tsx`) hält `jobId`/Sync-Status.
  - Noch **ohne** lokalen Speicher (das ist Phase 2) – reines Online-Auto-Save.

- [x] **1.5 – Ehrliche Bestätigung + Fehler/Retry + Online-Indikator.**
  - Unbedingtes „… wurde gespeichert" entfernen (`src/components/natureScout/Summary.tsx:297`).
  - Statusabhängige Meldung; „Erfolgreich gespeichert" **nur** nach Server-2xx.
  - `saveError` sichtbar machen + **Retry-Button** (keine verschluckten `catch`).
  - Persistenter Online/Offline-Indikator (echter Erreichbarkeits-Check, nicht nur `navigator.onLine`).

- [x] **1.6 – Resume über Server-Entwürfe.**
  - App-/Seitenstart lädt offene Entwürfe (`GET /api/habitat/mine?status=draft`).
  - Banner „Erfassung fortsetzen" je offenem Entwurf; Eintrag unter „Meine Habitate → Entwürfe".
  - Rehydrierung über den **bestehenden** Pfad (`NatureScout.tsx:530`, Laden via `editJobId`);
    Sprung in den passenden Schritt.

---

## Phase 2 – Offline-Fähigkeit (warm-offline)

> Ziel: Erfassung ohne Empfang im Feld, mehrere Sessions, späterer Sync.
> Lokaler Speicher als Fallback gemäß Capability-Matrix (Spec §3).

- [x] **2.1 – Capability-Erkennung + Strategie-Matrix.**
  - `online` = `navigator.onLine` **und** Erreichbarkeits-Check gegen leichten Endpoint.
  - `localPersistenceAvailable` = IndexedDB nutzbar?
  - Strategie-Auswahl nach Spec §3 (Server sofort / nur Server / lokal / **hart blockieren**).
  - **Hart blockieren**, wenn kein Netz **und** kein lokaler Speicher (Spec §3, eindringliche Warnung,
    Erfassung nicht zulassen).

- [x] **2.2 – IndexedDB-Layer (Sessions + Bild-Blobs).**
  - Eine „Session" je Erfassung (Metadaten) + Bild-Blobs in IndexedDB.
  - Kleiner Zeiger (aktive Session-ID, Sync-Status) in `localStorage`.
  - Lokales Statusmodell: `entwurf_lokal | sync_ausstehend | synchronisiert | abgeschlossen | sync_fehler`.

- [x] **2.3 – Offline-Bild-Handling + Speicherprüfung.** _(Primitiven; Einbindung in den Aufnahme-Flow mit 2.5)_
  - Aufnahme → Blob lokal ablegen (`clientImageId`, EXIF-Orientierung), Vorschau via
    `URL.createObjectURL`. **Kein** Downscaling (Bildqualität hat Vorrang, Entscheidung).
  - `navigator.storage.estimate()` proaktiv prüfen; bei wenig freiem Speicher **warnen**
    + zum Synchronisieren auffordern. `QuotaExceededError` als Sicherheitsnetz abfangen.

- [x] **2.4 – Sync-Engine.**
  - Auslöser: `online`-Event, App-Start mit Empfang, manuell („Jetzt synchronisieren").
  - Pro Session: Blobs → Azure, lokale Referenzen durch URLs ersetzen, Server-Entwurf
    anlegen/aktualisieren, lokal `synchronisiert` markieren.
  - **Retry mit Backoff**; Idempotenz über `clientImageId`; Konflikt = Last-Write-Wins je `jobId`.
  - PlantNet/KI laufen erst beim Sync/online.

- [ ] **2.5 – Offline-Status-UI + mehrere Sessions.**
  - Anzahl ausstehender Syncs sichtbar; pro Session sichtbarer Sync-Status; Fehler anzeigen, nicht verschlucken.
  - Mehrere parallele Offline-Sessions verwalten; Resume auch aus IndexedDB.

- [ ] **2.6 – Aufräumen + „Offline-Daten bereinigen" im Profil.**
  - Lokale Kopie (inkl. Blobs) **erst nach bestätigtem Abschluss** löschen (Server-2xx auf finalen
    Schritt) – nicht schon nach reinem Bild-Sync (Entscheidung).
  - Im **Nutzerprofil** Option „Offline-Daten bereinigen": verbliebene Sessions/Blobs anzeigen +
    gezielt löschen.
  - Hinweis: Offline-Zwischenspeichern braucht **kein** gesondertes Consent (Entscheidung);
    Consent gilt beim Abschluss/Einreichen.

---

## Phase 3 – PWA (cold-offline)

> Ziel: App startet ohne jeden Empfang (nicht nur „warm" nach einmaligem Online-Laden); installierbar.

- [ ] **3.1 – Web-App-Manifest + Icons.** Installierbar; Name/Theme/Icons; mobile-first.
- [ ] **3.2 – Service Worker (App-Shell-Cache + Update-Strategie).**
  - App-Shell cachen; saubere Update-Strategie (keine veraltete App ausliefern).
- [ ] **3.3 – iOS-Härtung + Tests.**
  - iOS-Safari: PWA-Storage-Eviction nach Inaktivität, Kamera/Datei-APIs.
  - Test auf echtem Smartphone (Flugmodus, Tab-Eviction, mehrere Sessions).

---

## Offene Entscheidungen (vor den jeweiligen Sessions klären)

- **iOS-Besonderheiten** (Phase 2/3): PWA-Storage-Eviction; Kamera/Datei-APIs in Safari.
- **Mehrgeräte-Resume** (Phase 2): Server-Entwürfe erlauben Geräte-Wechsel; lokale Sessions sind
  gerätegebunden – Verhalten vor Session 2.5 bestätigen.

---

## Logbuch (je Session ausfüllen)

| Session | Datum | Commit | Notizen / Abweichungen |
|---|---|---|---|
| 1.0 | 2026-05-29 | _(dieser Commit)_ | **Baseline (projekteigenes TS 5.6.3):** `tsc --noEmit` = **98 Fehler** (70 in `src/__tests__/` – Jest ohne Runner; 28 im Produktionscode). `npm run lint` = Exit 1 wegen **1 vorbestehendem Error** in `src/app/not-found.tsx` (`@next/next/no-html-link-for-pages`), sonst nur Warnungen. `npm run build` = Exit 0; `next.config` setzt `eslint.ignoreDuringBuilds` **und** `typescript.ignoreBuildErrors` = `true`, daher ist `build` die maßgebliche Grün-Prüfung. Hinweis: „Collecting page data" wirft ohne Secrets (Env-Validierung beim Modul-Load); in der Sandbox mit Platzhalter-Env grün gebaut. `node_modules` war ungetrackt → via `npm ci` installiert. |
| 1.1 | 2026-05-29 | _(dieser Commit)_ | **Status `'draft'` eingeführt.** `AnalysisJob.status` um `'draft'` erweitert (`src/types/nature-scout.ts`). `draft` aus allen öffentlichen/Listen-Queries ausgeschlossen (`status: { $ne: 'draft' }`): `habitat/route.ts` (Liste + 2 Personen-Aggregationen), `habitat/public/route.ts` (Karte/Liste + Filter-Options), `habitat/export/route.ts`, `filter-options/route.ts`, `public-filter-options/route.ts`, `habitat-service.ts` (`getFilterOptions` + Personen-Agg). DB-Index `{ 'metadata.email': 1, status: 1 }` ergänzt. Spec `habitat.md` nachgezogen (Status-Wert, Invariante „Entwürfe", Lebenszyklus, Index, Offene Punkte). **Bewusst NICHT ausgeschlossen** (Entwürfe müssen enthalten bleiben): `admin/storage-cleanup` (Bild-Referenzprüfung – sonst gälten Entwurfs-Bilder als verwaist) und `habitat/download` (vollständiger Admin-Backup-Dump). **Abweichung/Risiko:** `habitat/cleanup` (DELETE) löscht hart Einträge ohne `result` → würde künftige Entwürfe treffen; vor Session 1.2 absichern (in `habitat.md` „Offene Punkte" vermerkt). **Verifikation:** `tsc --noEmit` = 98 (= Baseline, keine neuen Fehler); `lint` unverändert (nur der vorbestehende `not-found.tsx`-Error); `build` Exit 0. |
| 1.2 | 2026-05-29 | _(dieser Commit)_ | **Entwurf-API umgesetzt.** Neu: `POST /api/habitat/draft` (legt `status: 'draft'` an, liefert `jobId`, Status 201; Eigentum/Organisation serverseitig aus dem angemeldeten Benutzer), `PATCH /api/habitat/[auftragsId]/draft` (mergt Teil-Metadaten, idempotent; nur eigener Entwurf, nur `status: 'draft'`), `GET /api/habitat/mine?status=draft` (eigene Habitate, optionaler Status-Filter, nutzt Index aus 1.1). Service: `createDraftJob` + `updateDraftMetadata` in `analysis-service.ts`; `createAnalysisJob`-Status-Param auf `AnalysisJob['status']` geweitet. **Sicherheit:** server-kontrollierte Felder (`email`, `erfassungsperson`, `organization*`) werden in POST/PATCH aus Client-Daten entfernt (kein Ownership-Hijack); Auth-Fehler → 401 (statt 500). **Abweichung:** Plan nennt `[jobId]/draft`; wegen Next.js-Routing (gleicher Segmentname) unter bestehendem `[auftragsId]/draft` umgesetzt (`auftragsId` == `jobId`). Dedizierte Draft-Service-Funktionen statt Aufweichung von `createAnalysisJob` (Teil-Metadaten). **Zusatz:** `habitat/cleanup` (DELETE) abgesichert (`status: { $ne: 'draft' }`), das in 1.1 markierte Risiko behoben. **Verifikation:** `tsc --noEmit` = 98 Quellcode-Fehler (= Baseline; `.next/types`-Artefakte ausgenommen), `lint` unverändert (nur vorbestehender `not-found.tsx`-Error), `build` Exit 0 (neue Routen im Manifest). |
| 1.3 | 2026-05-29 | _(dieser Commit)_ | **Bilder serverseitig an Entwurf verknüpfen.** `/api/upload` akzeptiert optional `jobId`/`imageKey`/`clientImageId`; bei vorhandenem eigenem Entwurf (`status: 'draft'`) wird die Bild-Referenz direkt am `AnalysisJob` persistiert (Best-Effort, idempotent über `imageKey`) → keine verwaisten Bilder mehr. Service: `addImageToDraft` (`analysis-service.ts`); `Bild.clientImageId` ergänzt (`types/nature-scout.ts`). Client reicht `jobId` durch (`SingleImageUpload` liest Context → `GetImage` sendet die Felder). Auth/Eigentum geprüft; Fehler brechen den Upload nicht ab (Bild liegt in Azure + wird zusätzlich vom Auto-Save referenziert). Verifikation: tsc 98, lint Baseline, build Exit 0. |
| 1.4 | 2026-05-29 | _(dieser Commit)_ | **Auto-Save im Orchestrator (online).** `NatureScout.tsx`: legt früh (Schritt ≥ 1, sofern kein Edit/Entwurf aktiv) via `POST /api/habitat/draft` einen Entwurf an und hält die `jobId` im Context; debounced `PATCH …/draft` je Metadaten-Änderung (Schritte 1–7). Ab Analyse (Schritt 8) übernimmt der bestehende Pfad: `HabitatAnalysis` nutzt die Context-`jobId` als `existingJobId` → Entwurf wird zu `pending` (kein Doppeldokument). Sichtbarer Auto-Save-Status unter der Fortschrittsleiste. Fortsetzen eines Entwurfs (editJobId, `status==='draft'`) übernimmt den aktiven Entwurf fürs Auto-Save. Online-first: Fehler sind nicht fatal (Offline-Fallback = Phase 2). Verifikation: tsc 98, lint Baseline (1 bereinigte exhaustive-deps-Warnung), build Exit 0. |
| 1.5 | 2026-05-29 | _(dieser Commit)_ | **Ehrliche Bestätigung + Retry + Online-Indikator.** Unbedingtes „… wurde gespeichert" in `Summary.tsx` ersetzt durch statusabhängige Meldung: „Wird gespeichert…" → Erfolg **nur** nach Server-2xx (`hasSaved`); bei Fehler sichtbare Meldung + **Retry-Button** (`saveSummary` als `useCallback`, kein verschluckter `catch`). Neuer Online-/Offline-Indikator (`OnlineStatusIndicator`) mit echtem Erreichbarkeits-Check gegen neuen Endpoint `/api/health` (nicht nur `navigator.onLine`); im Orchestrator persistent angezeigt inkl. Auto-Save-Status + Retry. Verifikation: tsc 98, lint Baseline (entfernt sogar Warnungen, da `isSaving`/`saveError` jetzt genutzt), build Exit 0. |
| 1.6 | 2026-05-29 | _(dieser Commit)_ | **Resume über Server-Entwürfe.** „Meine Habitate" (`app/habitat/page.tsx`) lädt eigene Entwürfe (`GET /api/habitat/mine?status=draft`) und zeigt einen Bereich „Erfassung fortsetzen" (Standort, Bildanzahl, letzte Änderung) mit **Fortsetzen** (→ `/naturescout?editJobId=<jobId>`, bestehender Rehydrierungs-Pfad) und **Verwerfen** (Soft-Delete). Rehydrierung übernimmt den Entwurf fürs weitere Auto-Save (Schritt 1.4). Verifikation: tsc 98, lint Baseline (`Trash2` jetzt genutzt), build Exit 0. |
| 2.1 | 2026-05-29 | _(dieser Commit)_ | **Capability-Erkennung + Strategie-Matrix.** Neues Modul `src/lib/offline/`: `capabilities.ts` (`checkOnline` via `/api/health`, `checkLocalPersistence` via IndexedDB-Testöffnung, `chooseStrategy` nach Matrix §3), `types.ts` (`LocalSessionStatus`, `PersistenceStrategy`, `Capabilities`), Hook `use-capabilities.ts`. `OnlineStatusIndicator` nutzt jetzt das gemeinsame `checkOnline` (DRY). Strategie `blockieren` (kein Netz **und** kein lokaler Speicher) → eindringliche, blockierende Warnung im Orchestrator (`NatureScout`), Erfassung nicht zugelassen (nur „Erneut prüfen"/„Zur Startseite"). Verifikation: tsc 98, lint Baseline, build Exit 0. |
| 2.2 | 2026-05-29 | _(dieser Commit)_ | **IndexedDB-Layer (Sessions + Bild-Blobs).** `src/lib/offline/db.ts` (raw IndexedDB, promisifiziert, ohne externe Abhängigkeit): Stores `sessions` (Metadaten + lokaler Status) und `images` (Blobs, Index `localSessionId`); CRUD (`createLocalSession`/`get`/`list`/`update`/`delete`, `putImageBlob`/`getImagesForSession`/`deleteImage`), Statushelfer, `countPendingSyncSessions`. Kleiner Zeiger (aktive Session-ID) in `localStorage`. Lokales Statusmodell (`entwurf_lokal`, `sync_ausstehend`, `synchronisiert`, `abgeschlossen`, `sync_fehler`); Typen `LocalSession`/`StoredImage` in `types.ts`. Verifikation: tsc 98, lint Baseline, build Exit 0. |
| 2.3 | 2026-05-29 | _(dieser Commit)_ | **Offline-Bild-Handling + Speicherprüfung (Primitiven).** `src/lib/offline/storage.ts`: `estimateStorage` (`navigator.storage.estimate`), `checkStorageWarning` (Schwellwerte 100 MB / 90 %), `isQuotaExceeded`, `formatBytes`. `src/lib/offline/images.ts`: `storeImageLocally` (Blob in voller Qualität ablegen, stabile `clientImageId`, Quota-Handling → klare Fehlermeldung), `getLocalImagePreviewUrl` (Vorschau via `URL.createObjectURL`). **Kein** Downscaling (Bildqualität-Entscheidung §4). Die Einbindung in den Aufnahme-Flow (GetImage offline) erfolgt mit der Orchestrator-Integration in 2.5. Verifikation: tsc 98, lint Baseline, build Exit 0. |
| 2.4 | 2026-05-29 | _(dieser Commit)_ | **Sync-Engine.** `src/lib/offline/sync.ts`: `syncSession`/`syncAllPending` – pro Session Server-Entwurf sicherstellen (`POST /api/habitat/draft`), ausstehende Blobs hochladen (`/api/upload` mit `jobId`/`imageKey`/`clientImageId`, idempotent), lokale Referenzen durch Azure-URLs ersetzen, Metadaten `PATCH …/draft` (Last-Write-Wins je `jobId`), lokal `synchronisiert` markieren; **Retry mit Backoff** (1/2/4 s); PlantNet erst hier (online, Best-Effort) für Pflanzenbilder. Trigger-Hook `use-sync.ts`: Auto-Sync bei App-Start mit Empfang + `online`-Event, `syncNow()` für manuell, sichtbarer Zustand (Anzahl ausstehend, laufend, Sessions, letzte Ergebnisse) für die UI in 2.5. Verifikation: tsc 98, lint Baseline, build Exit 0. |
