# Regel/Feature-Spec: Ausfallsichere & offline-fähige Habitat-Erfassung

> **Status: ENTWURF / PLAN** (noch nicht implementiert). Dieses Dokument spezifiziert, wie die
> Habitat-Erfassung gegen Datenverlust abgesichert und offline-fähig gemacht wird. Es ist die
> Grundlage für eine phasierte Umsetzung (siehe Abschnitt „Umsetzungsplan").

- **Betrifft Entitäten:** `AnalysisJob` (`specs/entitaeten/habitat.md`)
- **Betrifft Regeln:** `specs/regeln/analyse-pipeline.md`, `specs/regeln/datenschutz-und-consent.md`
- **Maßgebliche Quelldateien (Ist-Zustand):**
  - `src/components/natureScout/NatureScout.tsx` (Orchestrator, In-Memory-State; Rehydrierung via `editJobId` ab Z. 530)
  - `src/context/nature-scout-context.tsx` (Context, ebenfalls flüchtig)
  - `src/components/natureScout/GetImage.tsx`, `SingleImageUpload.tsx` (Bild-Erfassung/Upload)
  - `src/components/natureScout/HabitatAnalysis.tsx` (löst Anlage des DB-Datensatzes aus)
  - `src/components/natureScout/Summary.tsx` (Abschluss-Schritt, unbedingte „gespeichert"-Meldung)
  - `src/app/api/upload/route.ts` (Azure-Upload, schreibt nichts in DB)
  - `src/app/api/analyze/start/route.ts`, `src/lib/services/analysis-service.ts` (`createAnalysisJob`)

## 1. Problem & Ursache (Ist-Zustand)

Anwender:innen erfassen ein Habitat (5 Phasen, 10 Schritte) im Feld, laden Fotos hoch, und am
Ende ist **nichts gespeichert** – Fotos müssen vor Ort neu aufgenommen werden.

**Wahrscheinlichste Ursache: fehlender/instabiler Internetempfang im Gelände**, kombiniert mit
einer rein flüchtigen Zustandshaltung:

1. **Kein persistenter Zwischenstand.** Der gesamte Erfassungs-State liegt nur in flüchtigem
   React-State (`NatureScout.tsx:285`) bzw. Context (`nature-scout-context.tsx:33`). Kein
   `localStorage`, keine inkrementelle DB-Speicherung. Reload/Tab-Eviction/App-Wechsel → alles weg.
2. **DB-Datensatz entsteht erst spät.** Erst beim Analyse-Schritt (8) wird via
   `createAnalysisJob()` ein Dokument geschrieben (`analysis-service.ts`). Schritte 0–7 sind
   nirgends persistiert.
3. **Mehrere Schritte erfordern zwingend Netz:** Bild-Upload zu Azure (`/api/upload`),
   PlantNet-Bestimmung, KI-Analyse, finaler Speicher. Ohne Empfang scheitern diese – teils still.
4. **Bilder verwaisen.** `/api/upload` legt Bilder in Azure ab, schreibt aber **nichts** in die DB
   (`upload/route.ts:126`); die Verknüpfung lebt nur im Speicher → ohne Empfang/vor Schritt 8 sind
   die Fotos in Azure ohne DB-Bezug verloren.
5. **Falsche Erfolgsmeldung.** Die Summary zeigt **unbedingt** „… wurde gespeichert"
   (`Summary.tsx:297`); Speicherfehler werden in `saveError` abgelegt, aber nie angezeigt
   (`Summary.tsx:73–77`). Keine Retries.

## 2. Ziele

- **Kein Datenverlust** – jeder Schritt und jedes Bild wird so früh wie möglich gesichert.
- **Offline-Erfassung** im Gelände, ggf. **mehrere Sessions**, Abschluss/Übertragung später bei Internet.
- **Fehler führen nicht zum Abbruch**, sondern sind nachträglich reparierbar/fortsetzbar.
- **Ehrliche Rückmeldung**: Erfolg erst nach bestätigter Speicherung; offline klar erkennbar.

## 3. Persistenzstrategie: „Beides kombiniert" (verfügbarkeitsabhängig)

Server ist die Quelle der Wahrheit; **lokaler Speicher ist Fallback** für Offline-Phasen und wird
adaptiv genutzt. Zur Laufzeit werden zwei Fähigkeiten erkannt:

- **`online`** – Netzverfügbarkeit (`navigator.onLine` **und** ein echter Erreichbarkeits-Check
  gegen einen leichten Endpoint; `navigator.onLine` allein ist unzuverlässig).
- **`localPersistenceAvailable`** – ist IndexedDB/localStorage nutzbar? (kann durch
  Privatmodus, Browser-Einstellungen oder fehlende Zustimmung blockiert sein).

| Online | Lokaler Speicher | Verhalten |
|---|---|---|
| ✅ | ✅ | **Server sofort** nach jedem Schritt speichern; lokal zusätzlich spiegeln (Fallback). |
| ✅ | ❌ | **Nur Server** (sofort). Voll funktionsfähig, kein lokaler Bedarf. |
| ❌ | ✅ | **Lokal** speichern (IndexedDB inkl. Bild-Blobs). Automatischer Sync, sobald online. |
| ❌ | ❌ | **Keine Persistenz möglich** → **hart blockieren (Entscheidung):** eindringliche Warnung „Ohne Internet **und** ohne lokalen Speicher kann nichts zwischengespeichert werden. Bitte mit Internetverbindung erfassen." und die Erfassung wird **nicht zugelassen** (kein stilles Weiterarbeiten, das garantiert zu Datenverlust führt). |

## 4. Lokaler Speicher: Technikwahl

- **Bilder → IndexedDB (Blobs).** `localStorage` ist ungeeignet (~5–10 MB, nur Strings). Fotos
  werden als Blob in IndexedDB gehalten (Kontingent i. d. R. hunderte MB–GB).
- **Erfassungs-Metadaten → IndexedDB** (eine „Session" je Erfassung), zusätzlich ein kleiner
  Zeiger (aktive Session-ID, Sync-Status) in `localStorage` für schnellen Start.
- **Bild-Vorschau offline** über `URL.createObjectURL(blob)`.
- **Bildqualität hat Vorrang (Entscheidung):** Fotos werden **in voller Qualität** lokal abgelegt –
  **kein** clientseitiges Herunterskalieren, da die Bildqualität für die KI-Analyse wichtig ist.
- **Freien Speicher proaktiv prüfen (Entscheidung):** Vor/bei lokaler Ablage `navigator.storage.estimate()`
  auswerten. Liegt der verbleibende Speicher unter einem Schwellwert (bzw. reicht das geschätzte
  Restkontingent nicht für die anstehenden Fotos), **frühzeitig warnen** und zum Synchronisieren auffordern –
  nicht erst, wenn der Fehler eintritt.
- **Kontingent-Fehler (`QuotaExceededError`)** zusätzlich als Sicherheitsnetz abfangen → Hinweis +
  zum Synchronisieren auffordern.

## 5. Statusmodell

### Lokale Session (Client/IndexedDB)
- `entwurf_lokal` – offline erfasst, nur lokal vorhanden
- `sync_ausstehend` – bereit zur Übertragung
- `synchronisiert` – serverseitig gespeichert (jobId vorhanden)
- `abgeschlossen` – analysiert/eingereicht (vom Server bestätigt)
- `sync_fehler` – Übertragung fehlgeschlagen (Retry möglich)

### Server `AnalysisJob.status` (Erweiterung)
Neuer Wert **`'draft'`** (Erfassung läuft / noch nicht analysiert), zusätzlich zu
`pending | analyzing | completed | failed`. Ablauf: `draft` → (Analyse starten) → `pending` →
`analyzing` → `completed`/`failed`. Verifizierungsfelder unverändert.

> ⚠️ **Invariante:** `status: 'draft'`-Datensätze sind **nie** öffentlich und tauchen **nicht**
> in normalen Listen auf (nur unter „Meine Habitate → Entwürfe"). Alle öffentlichen/Listen-Filter
> müssen `draft` ausschließen (zusätzlich zur bestehenden `verified`/`deleted`-Logik).

## 6. Bild-Handling (offline-fähig)

1. Aufnahme → Blob lokal in IndexedDB ablegen (mit stabiler `clientImageId` + EXIF-Orientierung),
   lokale Vorschau anzeigen. **Kein** Upload währenddessen.
2. **Online & Server-Modus:** Bild sofort hochladen (`/api/upload`) **und** Referenz an den
   Server-Entwurf hängen → keine verwaisten Bilder mehr.
3. **Offline:** Upload wird auf den Sync verschoben.
4. **Idempotenz:** `clientImageId` verhindert Doppel-Uploads beim erneuten Sync.
5. **PlantNet/KI brauchen Netz** → laufen erst beim Sync/Online; offline = nur erfassen.

## 7. Sync-Engine

- Auslöser: `online`-Event, App-Start mit Empfang, oder manuell („Jetzt synchronisieren").
- Pro Session: ausstehende Bild-Blobs → Azure hochladen, lokale Blob-Referenzen durch URLs
  ersetzen, Server-Entwurf anlegen/aktualisieren, lokal als `synchronisiert` markieren.
- **Retry mit Backoff**; pro Session sichtbarer Sync-Status; Fehler werden angezeigt, nicht verschluckt.
- **Konflikte:** Entwürfe sind nie verifiziert → Last-Write-Wins je `jobId` genügt.
- **Aufräumen (Entscheidung):** Lokale Kopie (inkl. Blobs) wird **erst nach bestätigtem Abschluss**
  (Server-2xx auf den finalen Speicher/Analyse-Schritt) gelöscht – **nicht** schon direkt nach dem
  reinen Bild-Sync, damit bei einem späteren Fehler nichts verloren geht.
- **Manuelle Bereinigung (Entscheidung):** Im **Nutzerprofil** gibt es eine Option „Offline-Daten
  bereinigen", mit der lokal verbliebene Sessions/Blobs angezeigt und gezielt gelöscht werden können
  (z. B. nach erfolgtem Abschluss auf einem anderen Gerät, oder zum Freigeben von Speicher).

## 8. Fortsetzen (Resume)

- App-Start prüft: lokale Sessions (IndexedDB) **und** Server-Entwürfe
  (`GET /api/habitat/mine?status=draft`).
- Banner „Erfassung fortsetzen" je offener Session.
- Rehydrierung nutzt den **bestehenden** Pfad (`NatureScout.tsx:530`, Laden via `editJobId`) bzw.
  lokale Hydrierung; springt in den passenden Schritt.

## 9. Ehrliche Bestätigung & Fehlerbehandlung

- Unbedingtes „… wurde gespeichert" (`Summary.tsx:297`) **entfernen**; Statusabhängige Meldung:
  - offline/lokal: „Lokal gesichert – wird übertragen, sobald Internet verfügbar ist."
  - synchronisiert/abgeschlossen: „Erfolgreich gespeichert" **nur** nach Server-2xx.
- `saveError` sichtbar machen + **Retry-Button**; keine verschluckten `catch`-Blöcke.
- Persistenter **Online/Offline-Indikator** + Anzahl ausstehender Syncs in der UI.

## 10. PWA / echtes Cold-Offline (eigene Phase)

Damit die App **ohne jeden Empfang startet** (nicht nur „warm" nach einmaligem Online-Laden),
braucht es eine **PWA**: Web-App-Manifest + Service Worker, der die App-Shell cacht;
installierbar. Ohne Service Worker funktioniert Offline nur, solange der Tab im Speicher bleibt –
für „stundenlang im Feld, mehrere Sessions" zu fragil. Hinweise: saubere Update-Strategie
(keine veraltete App ausliefern); iOS-Safari verwirft PWA-Storage nach längerer Inaktivität.

## 11. Benötigte Änderungen (für die Umsetzung)

**Typen/Entität:** `AnalysisJob.status` um `'draft'` erweitern (`src/types/nature-scout.ts`,
`specs/entitaeten/habitat.md`).

**API:**
- `POST /api/habitat/draft` – Entwurf anlegen (liefert `jobId`) [online]
- `PATCH /api/habitat/[jobId]/draft` – Teil-Metadaten upserten [online]
- `GET /api/habitat/mine?status=draft` – eigene Entwürfe (Resume/„Meine Habitate")
- `/api/upload` – unverändert; optional `jobId` akzeptieren, um Bild serverseitig direkt zu verknüpfen
- Alle öffentlichen/Listen-Queries: `status: 'draft'` ausschließen

**DB-Indizes:** ggf. `{ 'metadata.email': 1, status: 1 }` für „Meine Entwürfe".

**Client:** Persistenz-Service (Strategie aus §3), IndexedDB-Layer (§4/§6), Sync-Engine (§7),
Capability-Erkennung, Auto-Save-Hook im Orchestrator, Status-/Offline-UI.

**Consent offline (Entscheidung):** Für die **Offline-Erfassung ist keine gesonderte Einwilligung
erforderlich** – das Zwischenspeichern (lokal/Server-Entwurf) läuft ohne zusätzliches Consent-Gate.
Die bestehenden Consent-Pflichten gelten unverändert beim **Abschluss/Einreichen** (online).

**Spec-Folgeänderungen:** `habitat.md` (Status `draft`, Listen-Ausschluss-Invariante),
`datenschutz-und-consent.md` (lokale Speicherung personenbezogener Daten; kein zusätzliches
Consent fürs Offline-Zwischenspeichern; Aufräumen erst nach bestätigtem Abschluss + manuelle
Bereinigung im Profil), `analyse-pipeline.md` (Analyse/PlantNet erst online/bei Sync).

## 12. Umsetzungsplan (Phasen)

- **Phase 0 – Spec (dieses Dokument).** ✅ Abnahme einholen.
- **Phase 1 – Datenrettung (online-first).** Server-Entwurf (`draft`) früh anlegen; Bilder sofort
  an den Entwurf verknüpfen; Auto-Save je Schritt (online); ehrliche Bestätigung + sichtbare
  Fehler/Retry; Resume über Server-Entwürfe. → Behebt den Hauptschmerz für alle, die zumindest
  zeitweise Empfang haben.
- **Phase 2 – Offline-Fähigkeit.** IndexedDB-Sessions + Bild-Blob-Cache; Capability-Matrix (§3);
  Sync-Engine (§7); Offline-Status-UI; mehrere Offline-Sessions.
- **Phase 3 – PWA.** Service Worker + Manifest → echtes Cold-Offline, installierbar.

Jede Phase wird verifiziert: `npm run lint` + `npm run build` grün, `tsc`-Fehleranzahl ≤ Baseline,
Offline-Test (DevTools „Offline"), Test auf echtem Smartphone (inkl. Tab-Eviction/Flugmodus).

## 13. Entscheidungen & offene Punkte

### Entschieden
- ✅ **Kontingent/Bildqualität:** **Kein** Herunterskalieren – Bildqualität hat Vorrang (KI-Analyse).
  Stattdessen freien Speicher proaktiv prüfen und bei wenig Platz warnen (§4).
- ✅ **Aufbewahrung lokaler Daten:** Löschen **erst nach bestätigtem Abschluss**; zusätzlich
  manuelle „Offline-Daten bereinigen"-Option im Nutzerprofil (§7).
- ✅ **Consent offline:** **Keine** gesonderte Einwilligung fürs Offline-Zwischenspeichern;
  Consent-Pflichten gelten beim Abschluss/Einreichen (§11).
- ✅ **„Kein Internet & kein lokaler Speicher":** Erfassung **hart blockieren** (warnen + nicht
  zulassen) (§3).

### Noch offen
- **iOS-Besonderheiten:** PWA-Storage-Eviction; Kamera/Datei-APIs in Safari (in Phase 2/3 klären).
- **Mehrgeräte-Resume:** Server-Entwürfe ermöglichen Fortsetzen auf anderem Gerät; lokale Sessions
  sind gerätegebunden – gewünschtes Verhalten bei Umsetzung von Phase 2 bestätigen.
</content>
