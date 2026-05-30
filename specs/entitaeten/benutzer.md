# Entität: Benutzer (User)

> Eine registrierte Person, die Habitate erfasst, verifiziert oder verwaltet. Primärer
> Identifikator ist die **E-Mail-Adresse**.

- **Technischer Typ/Name:** `IUser`
- **MongoDB-Collection:** `users`
- **Quellen im Code:**
  - `src/lib/services/user-service.ts` (Interface `IUser`, `UserService`)
  - `src/lib/auth.ts` (Anmeldung/Provider), `src/types/auth.ts` (Session-/JWT-Typen)
  - `src/app/api/users/*`, `src/app/api/auth/*`

## Zweck & Kontext

Benutzer authentifizieren sich über NextAuth (Passwort, 6-stelliger Login-Code oder
Einladungs-Token). Die E-Mail ist der zentrale Schlüssel: Habitat-Eigentum, Filter-Sichtbarkeit
und Berechtigungen hängen daran. Siehe `regeln/rollen-und-rechte.md` und `regeln/datenschutz-und-consent.md`.

## Felder

| Feld | Typ | Pflicht | Status | Beschreibung | Validierung / Invariante |
|---|---|---|---|---|---|
| `_id` | `string \| ObjectId` | ✓ | gespeichert | MongoDB-ID | |
| `email` | `string` | ✓ | gespeichert | Primärer Identifikator | **unique** (sparse); stets `toLowerCase().trim()` |
| `password` | `string` | – | gespeichert | bcrypt-Hash (saltRounds 12) | leer ⇒ nur Code-/Invite-Login möglich |
| `name` | `string` | ✓ | gespeichert | Anzeigename | |
| `role` | `'user' \| 'experte' \| 'admin' \| 'superadmin'` | ✓ | gespeichert | Rolle/Rechte | Default `user` |
| `image` | `string` | – | gespeichert | Avatar-URL | |
| `organizationId` | `string` | – | gespeichert | Zugehörige Organisation | |
| `organizationName` | `string` | – | gespeichert | Denormalisierter Org-Name | |
| `organizationLogo` | `string` | – | gespeichert | Denormalisiertes Org-Logo | |
| `canInvite` | `boolean` | – | gespeichert | Darf andere einladen | Default `false` |
| `consent_data_processing` | `boolean` | – | gespeichert | Einwilligung Datenverarbeitung | s. `regeln/datenschutz-und-consent.md` |
| `consent_image_ccby` | `boolean` | – | gespeichert | Bilder unter CC-BY freigegeben | dito |
| `habitat_name_visibility` | `'public' \| 'members' \| null` | – | gespeichert | Sichtbarkeit des Erfassernamens | indexiert |
| `createdAt` | `Date` | – | gespeichert | Erstellzeitpunkt | |
| `updatedAt` | `Date` | – | gespeichert | Letzte Änderung | bei jeder Mutation gesetzt |
| `lastAccess` | `Date` | – | gespeichert | Letzter Login/Zugriff | bei jeder Anmeldung aktualisiert |
| `emailVerified` | `Date` | – | gespeichert | E-Mail-Verifizierungszeitpunkt | |
| `emailVerificationToken` | `string` | – | gespeichert | Token für E-Mail-Bestätigung | |
| `passwordResetToken` | `string` | – | gespeichert | Token für Passwort-Reset | 32-Byte hex |
| `passwordResetExpires` | `Date` | – | gespeichert | Ablauf des Reset-Tokens | 1 Stunde Gültigkeit |

## Beziehungen

- `organizationId` → **Organisation**
- E-Mail wird referenziert von **Habitat** (`metadata.email`), **Einladung**, **Login-Code**.

## Invarianten & Geschäftsregeln

- **E-Mail eindeutig & normalisiert:** Lookups immer mit `email.toLowerCase().trim()`.
- **Rollenhierarchie:** `superadmin` ⊇ `admin` ⊇ (Experten-Rechte) ⊇ `experte`; `user` = Basis.
  - `isAdmin` ⇔ Rolle ∈ {admin, superadmin}
  - `isExpert` ⇔ Rolle ∈ {experte, admin, superadmin}
- **Letzter Admin:** `getAdminCount()` zählt admins/superadmins – beim Entziehen von Adminrechten
  ist sicherzustellen, dass mindestens ein Admin verbleibt (Invariante, app-seitig zu wahren).
- **Passwortloser Account:** Über Einladung erstellte Nutzer haben kein `password` und melden
  sich per Invite-/Code-Login an. Sobald ein `password` gesetzt ist, ist Invite-Login gesperrt.

## Lebenszyklus

Registrierung/Einladung → (E-Mail-Verifizierung) → Nutzung → Rollen-/Org-Änderungen durch
Admin → Löschung (`deleteUser`, hartes Löschen per E-Mail).

## Indizes (MongoDB)

`createUserIndexes()`: `email` (unique, sparse), `role`, `organizationId`,
`habitat_name_visibility`, `lastAccess:-1`, `createdAt:-1`, Verbund `{email, role}`,
`{organizationId, role}`, `{organizationId, habitat_name_visibility}`, `name`.

## API-Endpunkte

| Methode & Pfad | Zweck | Berechtigung |
|---|---|---|
| `GET/POST /api/users` | Liste/Anlage | Admin |
| `GET /api/users/[email]` | Einzelabruf | Admin/selbst |
| `GET /api/users/isAdmin` | Adminstatus | angemeldet |
| `GET /api/users/isExpert` | Expertenstatus | angemeldet |
| `POST /api/auth/register` | Registrierung | öffentlich |
| `POST /api/auth/forgot-password`, `.../reset-password`, `.../set-password` | Passwort-Flows | öffentlich (Token) |

## Offene Punkte / Abweichungen

- `consent_*`-Felder sind optional – fachlich ist zu klären, ob `consent_data_processing` für
  aktive Erfassung verpflichtend sein muss (s. `regeln/datenschutz-und-consent.md`).
</content>
