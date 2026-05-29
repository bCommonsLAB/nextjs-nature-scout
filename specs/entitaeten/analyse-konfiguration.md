# Entität: Analyse-Konfiguration (AnalysisSchema & Prompt)

> Versionierte Konfiguration der KI-Analyse: das strukturierte Ausgabeschema (`AnalysisSchema`)
> und die Prompts (`Prompt`). Admin-editierbar, ohne Code-Deployment änderbar.

- **Technische Typen:** `AnalysisSchema`, `Prompt`
- **MongoDB-Collections:** `habitatAnalysisSchemas`, `prompts`
- **Quellen im Code:**
  - `src/lib/services/analysis-config-service.ts` (Interfaces, CRUD, Initialdaten)
  - `src/lib/services/openai-service.ts` (`analyzeImageStructured`, nutzt Schema/Prompt)
  - `src/app/api/admin/schema/[type]/*`, `src/app/api/admin/prompt/[type]/*`, `src/app/api/init/analysis-config/*`

## Zweck & Kontext

Trennt die fachliche KI-Konfiguration von der Implementierung. Das Schema definiert die erlaubten
Felder/Werte des `AnalyseErgebnis` (z. B. zulässige Werte für `häufigkeit`, Logik der
`schutzstatus`-Zuordnung). Prompts steuern System-Instruktion und Analyse-Frage. Siehe
`regeln/analyse-pipeline.md`.

## Felder

### `AnalysisSchema` (Collection `habitatAnalysisSchemas`)

| Feld | Typ | Pflicht | Status | Beschreibung | Validierung / Invariante |
|---|---|---|---|---|---|
| `_id` | `ObjectId` | ✓ | gespeichert | MongoDB-ID | |
| `name` | `string` | ✓ | gespeichert | Schema-Name (z. B. `habitat-analysis`) | |
| `version` | `string` | ✓ | gespeichert | Semver-Version | Abruf sortiert `version:-1` (neueste) |
| `description` | `string` | ✓ | gespeichert | Beschreibung | |
| `schema` | `Record<string, unknown>` | ✓ | gespeichert | Feld→Anweisung-Map für die strukturierte Ausgabe | |
| `createdAt` / `updatedAt` | `Date` | ✓ | gespeichert | Zeitstempel | |

### `Prompt` (Collection `prompts`)

| Feld | Typ | Pflicht | Status | Beschreibung | Validierung / Invariante |
|---|---|---|---|---|---|
| `_id` | `ObjectId` | ✓ | gespeichert | MongoDB-ID | |
| `name` | `string` | ✓ | gespeichert | Prompt-Name | |
| `version` | `string` | ✓ | gespeichert | Semver-Version | neueste via `version:-1` |
| `description` | `string` | ✓ | gespeichert | Beschreibung | |
| `systemInstruction` | `string` | ✓ | gespeichert | System-Persona/Instruktion | |
| `analysisPrompt` | `string` | ✓ | gespeichert | Analyse-Frage | |
| `createdAt` / `updatedAt` | `Date` | ✓ | gespeichert | Zeitstempel | |

## Invarianten & Geschäftsregeln

- **Versionierung:** Abruf liefert standardmäßig die höchste `version` zu einem `name`
  (`getAnalysisSchema`, `getPrompt`). Updates erfolgen per `upsert`.
- **Schutzstatus-Logik im Schema:** Das Feld `schutzstatus` im Initial-Schema kodiert die
  fachliche Zuordnung Habitattyp → Schutzstatus (gesetzlich geschützt / ökologisch hochwertig /
  ökologisch niederwertig). Quelle der Wahrheit für die Ableitung, siehe `regeln/schutzstatus.md`.
- **Habitattypen-Einbindung:** Das `habitattyp`-Feld referenziert dynamisch
  `getHabitatTypeDescription()` (aus Collection `habitatTypes`).

## Lebenszyklus

`initializeAnalysisConfigs()` legt Initial-Schema an, wenn noch keine Konfiguration existiert.
Admins bearbeiten Schema/Prompt; neue Versionen werden additiv geführt.

## API-Endpunkte

| Methode & Pfad | Zweck | Berechtigung |
|---|---|---|
| `GET/POST /api/admin/schema/[type]` | Schema lesen/schreiben | Admin |
| `GET/POST /api/admin/prompt/[type]` | Prompt lesen/schreiben | Admin |
| `POST /api/init/analysis-config` | Initialkonfiguration | Admin/Init |

## Offene Punkte / Abweichungen

- Keine DB-Unique-/Verbund-Indizes auf `{name, version}` dokumentiert – empfehlenswert zur
  Sicherung der Versionseindeutigkeit.
- Im Initialcode wird nur das Schema, aber (noch) kein `Prompt`-Dokument angelegt – Prüfen, ob
  Prompts ausschließlich über Admin-UI entstehen sollen.
</content>
