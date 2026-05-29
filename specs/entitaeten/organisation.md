# Entität: Organisation (Organization)

> Eine Einrichtung/Verein, der Nutzer:innen und Habitate zugeordnet sein können (z. B. für
> Sammel-Erfassungen, Branding via Logo).

- **Technischer Typ/Name:** `IOrganization` (Mongoose-Schema `Organization`)
- **MongoDB-Collection:** `organizations`
- **Quellen im Code:**
  - `src/lib/models/organization.ts` (Mongoose-Schema)
  - `src/lib/services/organization-service.ts` (Interface + `OrganizationService`)
  - `src/app/api/organizations/*`

## Zweck & Kontext

Organisationen werden Benutzern (`user.organizationId`) und – denormalisiert – Habitaten
(`metadata.organizationId/Name/Logo`) zugeordnet. Sie dienen u. a. der Filterung in der
öffentlichen Habitat-Ansicht.

## Felder

| Feld | Typ | Pflicht | Status | Beschreibung | Validierung / Invariante |
|---|---|---|---|---|---|
| `_id` | `string \| ObjectId` | ✓ | gespeichert | MongoDB-ID | |
| `name` | `string` | ✓ | gespeichert | Name der Organisation | **unique**; `trim` |
| `logo` | `string` | – | gespeichert | Logo-URL | `trim` |
| `address` | `string` | – | gespeichert | Anschrift | `trim` |
| `email` | `string` | – | gespeichert | Kontakt-E-Mail | `trim`, `lowercase`; Index (sparse) |
| `description` | `string` | – | gespeichert | Beschreibung | `trim`; Teil des Volltext-Index |
| `web` | `string` | – | gespeichert | Website-URL | `trim` |
| `createdAt` | `Date` | – | gespeichert | Erstellzeitpunkt | Default `now` |
| `updatedAt` | `Date` | – | gespeichert | Letzte Änderung | per `pre('save')` + Service aktualisiert |

## Beziehungen

- Wird referenziert von **Benutzer** (`organizationId`) und **Habitat** (`metadata.organizationId`).

## Invarianten & Geschäftsregeln

- **Name eindeutig** (unique Index). Anlage/Update mit existierendem Namen ist unzulässig.
- Org-Daten werden bei Benutzer und Habitat **denormalisiert** gespeichert (Name, Logo) –
  Änderungen am Org-Namen propagieren nicht automatisch. ⚠️ Konsistenz app-seitig beachten.

## Lebenszyklus

Anlegen → Aktualisieren → Löschen (`deleteOrganization`, hart). Vor Löschung sollten
zugeordnete Benutzer/Habitate berücksichtigt werden.

## Indizes (MongoDB)

`createOrganizationIndexes()`: `name` (unique), `email` (sparse), `createdAt:-1`,
`updatedAt:-1`, Volltext `org_text_search` über `name, description`.

## API-Endpunkte

| Methode & Pfad | Zweck | Berechtigung |
|---|---|---|
| `GET/POST /api/organizations` | Liste/Anlage | Admin |
| `GET/PUT /api/organizations/[id]` | Detail/Update | Admin |
| `POST /api/init/organizations` | Initialdaten | Admin/Init |

## Offene Punkte / Abweichungen

- Denormalisierte Org-Daten (Name/Logo) in User/Habitat können veralten – ein
  Sync-/Migrationskonzept ist nicht spezifiziert.
</content>
