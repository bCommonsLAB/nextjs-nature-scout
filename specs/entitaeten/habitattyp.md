# Entität: Habitattyp (HabitatType)

> Katalog-Eintrag, der einen klassifizierbaren Habitattyp samt typischer Arten, Familie und
> Schutzstatus beschreibt. Grundlage für die KI-Klassifizierung und die Verifizierung.

- **Technischer Typ/Name:** `HabitatType`
- **MongoDB-Collection:** `habitatTypes`
- **Quellen im Code:**
  - `src/lib/services/habitat-service.ts` (Interface, CRUD, Initialdaten, `getHabitatTypeDescription`)
  - `src/app/api/habitat-types/*`, `src/app/api/admin/habitat-types/*`, `src/app/api/init/habitat-types/*`

## Zweck & Kontext

Die Habitattypen bilden die kontrollierte Werteliste, gegen die die KI klassifiziert
(`getHabitatTypeDescription()` fließt in den Analyse-Prompt ein) und auf die sich die
Verifizierung (`effective-habitat`) stützt. Beim Verifizieren werden `habitatFamilie` und
`schutzstatus` aus dem Habitattyp übernommen.

## Felder

| Feld | Typ | Pflicht | Status | Beschreibung | Validierung / Invariante |
|---|---|---|---|---|---|
| `_id` | `ObjectId` | ✓ | gespeichert | MongoDB-ID | |
| `name` | `string` | ✓ | gespeichert | Name des Habitattyps (z. B. „Magerwiese") | **unique** |
| `description` | `string` | ✓ | gespeichert | Kurzbeschreibung | |
| `typicalSpecies` | `string[]` | ✓ | gespeichert | Typische Arten (wiss. + dt. Name) | fließt in Analyse-Prompt ein |
| `habitatFamilie` | `string` | – | gespeichert | Zugehörige Habitatgruppe (per Name) | → `HabitatGroup.name` |
| `schutzstatus` | `string` | – | gespeichert | Standard-Schutzstatus dieses Typs | s. `regeln/schutzstatus.md` |

## Beziehungen

- `habitatFamilie` → **Habitatgruppe** (per Name)
- Wird referenziert von **Habitat** (`result.habitattyp`, `verifiedResult.habitattyp`).

## Invarianten & Geschäftsregeln

- **Name eindeutig** – Anlage/Update mit Duplikat wirft Fehler.
- `validateHabitatType(name)` prüft Existenz; KI-Ergebnisse außerhalb des Katalogs gelten als
  `sonstiges`.
- Änderungen werden über einen 5-Minuten-In-Memory-Cache ausgeliefert (`getAllHabitatTypes`);
  CRUD invalidiert den Cache.
- ~20 Initialtypen werden via `initializeHabitatTypes()` angelegt (von „Verlandungsbereich" bis
  „Ruderalfläche").

## Indizes (MongoDB)

`createHabitatTypeIndexes()`: `name` (unique), `habitatFamilie`, `schutzstatus`.

## API-Endpunkte

| Methode & Pfad | Zweck | Berechtigung |
|---|---|---|
| `GET /api/habitat-types` | Liste | angemeldet/öffentlich (je Route) |
| `GET/POST /api/admin/habitat-types` | Verwaltung | Admin |
| `DELETE /api/admin/habitat-types/delete` | Löschen | Admin |
| `POST /api/init/habitat-types` | Initialdaten | Admin/Init |

## Offene Punkte / Abweichungen

- `schutzstatus` ist als Freitext modelliert; eine Enum-Bindung an die drei Schutzstatus-Werte
  (s. `regeln/schutzstatus.md`) wäre robuster.
</content>
