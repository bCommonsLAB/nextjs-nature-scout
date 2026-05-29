# Entität: Habitatgruppe (HabitatGroup)

> Übergeordnete Gruppierung von Habitattypen (= „Habitatfamilie"), v. a. für Navigation und
> Darstellung (Bild, Sortierposition).

- **Technischer Typ/Name:** `HabitatGroup`
- **MongoDB-Collection:** `habitatGroups`
- **Quellen im Code:**
  - `src/lib/services/habitat-groups-service.ts` (Interface, CRUD, Initialdaten)
  - `src/app/api/admin/habitat-groups/*`, `src/app/api/init/organizations` (Init-Sammelroute prüfen)

## Zweck & Kontext

Gruppen fassen Habitattypen zu Familien zusammen (Wälder, Gewässer, Wiesen und Weiden,
Sonderbiotope). Die Verknüpfung zu Habitattypen erfolgt namentlich über
`HabitatType.habitatFamilie`.

## Felder

| Feld | Typ | Pflicht | Status | Beschreibung | Validierung / Invariante |
|---|---|---|---|---|---|
| `_id` | `ObjectId` | ✓ | gespeichert | MongoDB-ID | |
| `name` | `string` | ✓ | gespeichert | Name der Gruppe/Familie | **unique** (app-seitig geprüft) |
| `description` | `string` | ✓ | gespeichert | Beschreibung | |
| `imageUrl` | `string` | ✓ | gespeichert | Darstellungsbild | z. B. `/images/habitat/wald.jpg` |
| `pos` | `number` | ✓ | gespeichert | Sortierposition | aufsteigend sortiert |

## Beziehungen

- Wird referenziert von **Habitattyp** (`habitatFamilie` = `HabitatGroup.name`) und mittelbar von
  **Habitat** (`result.habitatfamilie`).

## Invarianten & Geschäftsregeln

- **Name eindeutig** – Anlage/Update mit Duplikat wirft Fehler („Habitat-Familie … existiert bereits").
- Sortierung erfolgt über `pos` (aufsteigend).
- 4 Initialgruppen via `initializeHabitatGroups()`.

## API-Endpunkte

| Methode & Pfad | Zweck | Berechtigung |
|---|---|---|
| `GET/POST /api/admin/habitat-groups` | Verwaltung | Admin |
| `DELETE /api/admin/habitat-groups/delete` | Löschen | Admin |

## Offene Punkte / Abweichungen

- Kein DB-Unique-Index auf `name` (nur App-Prüfung) – Index ergänzen, um Race Conditions zu vermeiden.
</content>
