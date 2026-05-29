# Entität: Habitat (AnalysisJob)

> Ein erfasster Naturraum samt Standort, Bildern, KI-Analyse und (optionaler) Experten-
> Verifizierung. Dies ist die **zentrale Entität** der Anwendung.

- **Technischer Typ/Name:** `AnalysisJob` (mit eingebettetem `NatureScoutData`, `AnalyseErgebnis`)
- **MongoDB-Collection:** `analyseJobs` (Name via `process.env.MONGODB_COLLECTION_NAME`, Default `analyseJobs`)
- **Quellen im Code:**
  - `src/types/nature-scout.ts` (Interfaces `AnalysisJob`, `NatureScoutData`, `AnalyseErgebnis`, `Bild`, `PlantNetResult`)
  - `src/lib/services/analysis-service.ts` (CRUD: `createAnalysisJob`, `updateAnalysisJob`, `getAnalysisJob`)
  - `src/lib/services/habitat-service.ts` (Indizes, Filter-Optionen)
  - `src/app/api/analyze/start|status/route.ts` (Analyse anstoßen/abfragen)
  - `src/app/api/habitat/route.ts` (Liste), `src/app/api/habitat/[auftragsId]/route.ts` (Detail, Soft-Delete, Reanalyse)
  - `src/app/api/habitat/[auftragsId]/effective-habitat/route.ts` (Verifizierung)
  - `src/app/api/habitat/[auftragsId]/unverify/route.ts` (Verifizierung zurücknehmen)
  - `src/app/api/habitat/public/route.ts` (öffentliche Liste/Karte)

## Zweck & Kontext

Ein Habitat entsteht im 5-Phasen-Workflow (Willkommen → Standort → Bilder → Analyse →
Verifizierung). Während der Erfassung wird ein `AnalysisJob` angelegt (`status: 'pending'`),
durch die KI-Analyse befüllt (`status: 'completed'`) und kann anschließend durch eine:n
Expert:in **verifiziert** werden. Der Identifikator nach außen ist `jobId` (auch „auftragsId").

## Felder

### Wurzel-Dokument (`AnalysisJob`)

| Feld | Typ | Pflicht | Status | Beschreibung | Validierung / Invariante |
|---|---|---|---|---|---|
| `_id` | `ObjectId` | ✓ | gespeichert | MongoDB-ID | automatisch |
| `jobId` | `string` | ✓ | gespeichert | Fachlicher/öffentlicher Identifikator (= „auftragsId" in URLs) | Default: `new ObjectId().toString()` |
| `status` | `'draft' \| 'pending' \| 'analyzing' \| 'completed' \| 'failed'` | ✓ | gespeichert | Bearbeitungsstatus | `draft` = Erfassung läuft, noch nicht analysiert (offline-fähige Erfassung); nie öffentlich/in normalen Listen (s. Invarianten). `analyzing` wird zur Laufzeit gesetzt. |
| `metadata` | `NatureScoutData` | ✓ | gespeichert | Erfassungsdaten (s. u.) | |
| `result` | `AnalyseErgebnis \| null` | – | gespeichert | KI-Analyseergebnis | gesetzt bei `status='completed'` |
| `llmInfo` | `llmInfo` | – | gespeichert | Modell-/Prompt-Metadaten zur Nachvollziehbarkeit | |
| `error` | `string \| null` | – | gespeichert | Fehlertext bei `status='failed'` | |
| `startTime` | `Date` | ✓ | gespeichert | Erstellzeitpunkt | |
| `updatedAt` | `Date` | ✓ | gespeichert | Letzte Änderung | bei jeder Mutation aktualisiert |
| `protectionStatus` | `'red' \| 'yellow' \| 'green'` | – | abgeleitet | Ampel-Schutzstatus | aus `schutzstatus` abgeleitet, s. `regeln/schutzstatus.md` |

### Zusätzliche, gespeicherte Felder (Verifizierung, Soft-Delete, History)

Diese Felder existieren im DB-Dokument und werden von API/Indizes genutzt. Sie sind seit der
Spec→Code-Angleichung auch im TypeScript-Interface `AnalysisJob` (`src/types/nature-scout.ts`)
abgebildet (vgl. Hilfstypen `AuditUser`, `VerifiedResult`, `HabitatHistoryEntry`).

| Feld | Typ | Status | Beschreibung | Gesetzt in |
|---|---|---|---|---|
| `verified` | `boolean` | gespeichert | Habitat wurde verifiziert | `effective-habitat/route.ts` |
| `verifiedAt` | `Date` | gespeichert | Zeitpunkt der Verifizierung | dito |
| `verifiedBy` | `{ userId, userName, role }` | gespeichert | Verifizierende Person | dito |
| `verifiedResult` | `{ habitattyp, habitatfamilie, schutzstatus, kommentar }` | gespeichert | Verifiziertes (effektives) Ergebnis, überschreibt `result` fachlich | dito |
| `deleted` | `boolean` | gespeichert | Soft-Delete-Markierung | `[auftragsId]/route.ts` (DELETE) |
| `deletedAt` | `Date` | gespeichert | Zeitpunkt des Soft-Deletes | dito |
| `deletedBy` | `{ userId, userName, role }` | gespeichert | Löschende Person | dito |
| `history` | `Array<HistoryEntry>` | gespeichert | Versionshistorie (Reanalyse & Verifizierung) | Reanalyse + Verifizierung |

`HistoryEntry`: `{ date: Date, user: { userId, userName, email, role }, module: string,
previousResult: {...} \| null, changes: {...} }`.

### Eingebettet: `NatureScoutData` (`metadata`)

| Feld | Typ | Pflicht | Beschreibung | Validierung / Invariante |
|---|---|---|---|---|
| `erfassungsperson` | `string` | ✓ | Name der erfassenden Person | indexiert; Teil der Volltextsuche |
| `email` | `string` | ✓ | E-Mail der erfassenden Person | Eigentums-/Zugriffsschlüssel (s. `regeln/rollen-und-rechte.md`) |
| `organizationId` | `string` | ✓ | Zugehörige Organisation | |
| `organizationName` | `string` | ✓ | Name der Organisation | indexiert (öffentl. Filter) |
| `organizationLogo` | `string` | ✓ | Logo-URL der Organisation | |
| `gemeinde` | `string` | ✓ | Politische Gemeinde | indexiert; Volltextsuche |
| `flurname` | `string` | ✓ | Flur-/Ortsname | Volltextsuche |
| `latitude` | `number` | ✓ | Breitengrad | Teil des Geo-Index |
| `longitude` | `number` | ✓ | Längengrad | Teil des Geo-Index |
| `standort` | `string` | ✓ | Standortbeschreibung (Adresse) | |
| `elevation` | `string` | – | Höhe ü. M. | |
| `exposition` | `string` | – | Ausrichtung (Nord/Ost/…) | |
| `slope` | `string` | – | Hangneigung | |
| `plotsize` | `number` | – | Flächengröße (m²) | |
| `polygonPoints` | `Array<[number, number]>` | – | Umrisspolygon auf der Karte | |
| `kataster` | `object` | – | Katasterdaten (s. u.) | |
| `bilder` | `Bild[]` | ✓ | Erfasste Bilder | mind. Panorama- + Detailbilder erwartet |
| `analyseErgebnis` | `AnalyseErgebnis` | – | (Redundant zu `result`) | ⚠️ Quelle der Wahrheit ist `result` auf Wurzelebene |
| `llmInfo` | `llmInfo` | – | Modell-Metadaten | |
| `kommentar` | `string` | – | Freitext-Kommentar | |

`kataster`: `{ parzellennummer?, flaeche?, katastralgemeinde?, katastralgemeindeKodex?,
gemeinde?, istatKodex? }`.

### Eingebettet: `Bild`

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `imageKey` | `string` | ✓ | Logischer Schlüssel (z. B. „Panorama", „Detail_1") |
| `filename` | `string` | ✓ | Dateiname im Azure Blob Storage |
| `url` | `string` | ✓ | Voll aufgelöste Bild-URL |
| `lowResUrl` | `string` | – | Vorschau-URL |
| `analyse` | `string \| null` | ✓ | Bildbezogene Analysenotiz |
| `plantnetResult` | `PlantNetResult` | – | Pflanzenbestimmung (PlantNet) |

### Eingebettet: `AnalyseErgebnis` (`result`)

Strukturiertes KI-Ergebnis. Felder (gekürzt): `bildanalyse[]`, `pflanzenarten[] {name,
häufigkeit, istzeiger}`, `vegetationsstruktur {höhe, dichte, deckung}`, `blühaspekte
{intensität, anzahlfarben}`, `nutzung {beweidung, mahd, düngung}`, `habitattyp`,
`habitatfamilie`, `schutzstatus`, `bewertung {artenreichtum, konfidenz}`, `evidenz
{dafür_spricht[], dagegen_spricht[]}`, `zusammenfassung`, `kommentar?`.

Die Bedeutung jedes Feldes (erlaubte Werte) ist im Analyse-Schema definiert – siehe
`entitaeten/analyse-konfiguration.md` und `regeln/analyse-pipeline.md`.

## Beziehungen

- `metadata.organizationId` → **Organisation**
- `metadata.email` → **Benutzer** (Eigentümer; kein FK, sondern E-Mail-Match)
- `result.habitattyp` / `verifiedResult.habitattyp` → **Habitattyp** (per Name)
- `result.habitatfamilie` → **Habitatgruppe** (per Name)

## Invarianten & Geschäftsregeln

- **Eigentum:** Ein Habitat „gehört" der Person mit `metadata.email`. Normale Nutzer:innen sehen
  und bearbeiten nur eigene Habitate (s. `regeln/rollen-und-rechte.md`).
- **Öffentlichkeit:** Ein Habitat ist genau dann öffentlich sichtbar, wenn
  `verified === true && protectionStatus ∈ {red, yellow}`. `green` ist **nicht** öffentlich.
  (Quelle: `[auftragsId]/route.ts`, `public/route.ts`.)
- **Entwürfe (`status: 'draft'`):** Ein Entwurf ist **nie öffentlich** und taucht **nicht** in
  normalen Listen auf (nur unter „Meine Habitate → Entwürfe"). Alle öffentlichen/Listen-Queries
  schließen `draft` aus (`status: { $ne: 'draft' }`, zusätzlich zur `verified`/`deleted`-Logik).
  Fundstellen: `habitat/route.ts`, `habitat/public/route.ts`, `habitat/export/route.ts`,
  `filter-options/route.ts`, `public-filter-options/route.ts`, `habitat-service.ts`
  (`getFilterOptions`). **Ausnahmen (Entwürfe bleiben enthalten):** vollständiger Admin-Backup-Dump
  (`habitat/download/route.ts`) und Bild-Referenzprüfung der Speicherbereinigung
  (`admin/storage-cleanup/route.ts`, sonst gälten Entwurfs-Bilder als verwaist).
  Siehe `regeln/offline-erfassung-und-sync.md`.
- **Effektives Ergebnis:** Nach Verifizierung gilt `verifiedResult` fachlich vor `result`
  (z. B. bei Schutzstatus-Anzeige/Export).
- **Soft-Delete:** Löschen markiert nur `deleted: true` (kein physisches Löschen). Gelöschte
  Habitate werden in Listen/Filtern ausgeschlossen (`deleted: { $ne: true }`).
- **protectionStatus-Ableitung:** Bei Verifizierung aus `verifiedResult.schutzstatus` neu
  berechnet (`schutzstatusToProtectionStatus`). Siehe `regeln/schutzstatus.md`.

## Lebenszyklus

0. **(Optional) Entwurf** (`status: 'draft'`) – Erfassung läuft, noch nicht analysiert; früh
   angelegt zur Datensicherung (offline-fähige Erfassung). Geht beim Start der Analyse in
   `pending` über. Details: `regeln/offline-erfassung-und-sync.md`.
1. **Anlegen** (`analyze/start`, `status: 'pending'`) durch erfassende Person.
2. **Analyse** läuft → `status: 'analyzing'` → `completed` (mit `result`) oder `failed` (mit `error`).
3. **Reanalyse** (`POST /api/habitat/[auftragsId]`) durch Eigentümer:in/Expert:in/Admin – schreibt `history`.
4. **Verifizierung** (`PATCH .../effective-habitat`) durch Expert:in/Admin – setzt `verified`, `verifiedResult`, `protectionStatus`.
5. **Rücknahme** (`POST .../unverify`) entfernt Verifizierungsfelder.
6. **Soft-Delete** (`DELETE /api/habitat/[auftragsId]`).

## Indizes (MongoDB)

Definiert in `createAnalyseJobsIndexes()` (`habitat-service.ts`). Auswahl:

- Einzel: `metadata.gemeinde`, `metadata.erfassungsperson`, `metadata.email`,
  `metadata.organizationName`, `result.habitattyp`, `result.habitatfamilie`,
  `result.schutzstatus`, `verifiedResult.habitatfamilie`, `verified`, `deleted`, `updatedAt`.
- Verbund („Meine Entwürfe"): `{metadata.email, status}` (eigene Habitate nach Status, z. B. `draft`).
- Verbund (öffentliche Sicht): `{deleted, verified}`, `{deleted, verified, organizationName}`,
  `{deleted, verified, gemeinde}`, `{deleted, verified, result.habitattyp}`,
  `{deleted, verified, result.habitatfamilie}`, `{deleted, verified, result.schutzstatus}`.
- Sortierung: `{deleted, updatedAt:-1}`, `{deleted, verified, updatedAt:-1}`.
- Geo: `{metadata.latitude, metadata.longitude, updatedAt:-1}`.
- Volltext: `text_search_index` über `erfassungsperson, gemeinde, flurname, result.habitattyp`.

## API-Endpunkte

| Methode & Pfad | Zweck | Berechtigung |
|---|---|---|
| `POST /api/analyze/start` | Analyse starten / Job anlegen | angemeldet |
| `GET /api/analyze/status` | Analysestatus abfragen | angemeldet |
| `POST /api/habitat/draft` | Entwurf anlegen (`status: 'draft'`), liefert `jobId` | angemeldet (Eigentümer = anlegende Person) |
| `PATCH /api/habitat/[auftragsId]/draft` | Teil-Metadaten in Entwurf mergen (idempotent, je Schritt) | nur eigener Entwurf |
| `GET /api/habitat/mine?status=draft` | Eigene Habitate (z. B. Entwürfe) – Resume/„Meine Habitate" | angemeldet (nur eigene) |
| `GET /api/habitat` | Liste (eigene bzw. alle bei erw. Rechten) | angemeldet |
| `GET /api/habitat/[auftragsId]` | Detail | öffentlich (falls public) sonst Eigentümer/Experte/Admin |
| `POST /api/habitat/[auftragsId]` | Reanalyse | Eigentümer/Experte/Admin |
| `DELETE /api/habitat/[auftragsId]` | Soft-Delete | Eigentümer/Experte/Admin |
| `PATCH /api/habitat/[auftragsId]/effective-habitat` | Verifizieren | Experte/Admin |
| `POST /api/habitat/[auftragsId]/unverify` | Verifizierung zurücknehmen | Experte/Admin |
| `GET /api/habitat/public` | Öffentliche Liste/Karte | öffentlich |
| `POST /api/habitat/export` | Export verifizierter Habitate | je nach Route/Rechten |

## Offene Punkte / Abweichungen

- ✅ **TS-Typ vollständig (erledigt):** `AnalysisJob` in `src/types/nature-scout.ts` bildet nun
  `verified`, `verifiedAt`, `verifiedBy`, `verifiedResult`, `deleted`, `deletedAt`, `deletedBy`,
  `history` ab; `status` umfasst `analyzing`. (Commit „types: AnalysisJob an persistiertes
  Habitat-Dokument angleichen".)
- ⚠️ **Doppelte Ergebnisablage:** `metadata.analyseErgebnis` vs. Wurzel-`result`. Konsens:
  `result` ist maßgeblich; `metadata.analyseErgebnis` möglichst nicht mehr verwenden.
- ✅ **Status `'draft'` + Entwurf-API (erledigt – Sessions 1.1/1.2):** `AnalysisJob.status`
  umfasst `'draft'`; alle öffentlichen/Listen-Queries schließen `draft` aus (s. Invariante
  „Entwürfe"); Index `{ 'metadata.email': 1, status: 1 }` angelegt (1.1). Entwurf-API umgesetzt
  (1.2): `POST /api/habitat/draft`, `PATCH /api/habitat/[auftragsId]/draft` (Param = `jobId`),
  `GET /api/habitat/mine?status=draft`; Service `createDraftJob`/`updateDraftMetadata`
  (`analysis-service.ts`). **Noch offen:** Bilder serverseitig an Entwurf verknüpfen (1.3),
  Auto-Save im Orchestrator (1.4). Plan: `specs/regeln/offline-erfassung-umsetzungsplan.md`.
- ✅ **Wartungs-Route `habitat/cleanup` (DELETE) abgesichert (Session 1.2):** Die Admin-Route
  löscht hart Einträge ohne `result`; sie nimmt nun Entwürfe aus (`status: { $ne: 'draft' }`),
  damit (resultlose) Entwürfe nicht versehentlich gelöscht werden. Quelle:
  `src/app/api/habitat/cleanup/route.ts`.
</content>
