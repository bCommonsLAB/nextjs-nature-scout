# Entität: Einladung (Invitation)

> Token-basierte Einladung, mit der eine Person ohne vorherige Registrierung einen Account
> aktivieren kann. Enthält Zustellungs-Tracking (Mailjet).

- **Technischer Typ/Name:** `IInvitation`
- **MongoDB-Collection:** `invitations`
- **Quellen im Code:**
  - `src/lib/services/user-service.ts` (Interface `IInvitation`, Invitation-Methoden)
  - `src/app/api/auth/invite/*`, `src/app/api/admin/invitations/*`
  - `src/app/api/webhooks/mailjet/route.ts` (Zustellereignisse)
  - `src/lib/auth.ts` (Invite-Login: `loginType: 'invite'`)

## Zweck & Kontext

Berechtigte Nutzer (`canInvite`) oder Admins laden neue Personen ein. Die Einladung erzeugt beim
ersten erfolgreichen Invite-Login einen passwortlosen Benutzer. Mailjet-Webhooks aktualisieren
den Zustellstatus.

## Felder

| Feld | Typ | Pflicht | Status | Beschreibung | Validierung / Invariante |
|---|---|---|---|---|---|
| `_id` | `string \| ObjectId` | ✓ | gespeichert | MongoDB-ID | |
| `email` | `string` | ✓ | gespeichert | Eingeladene E-Mail | normalisiert (lowercase/trim) |
| `name` | `string` | ✓ | gespeichert | Name der eingeladenen Person | |
| `invitedBy` | `string` | ✓ | gespeichert | E-Mail/ID der einladenden Person | |
| `invitedByName` | `string` | ✓ | gespeichert | Name der einladenden Person | |
| `organizationId` | `string` | – | gespeichert | Ziel-Organisation | |
| `organizationName` | `string` | – | gespeichert | Org-Name | |
| `canInvite` | `boolean` | – | gespeichert | Eingeladene:r darf selbst einladen | Default `false` |
| `token` | `string` | ✓ | gespeichert | Einladungstoken | 32-Byte hex |
| `expiresAt` | `Date` | ✓ | gespeichert | Ablaufzeitpunkt | |
| `used` | `boolean` | ✓ | gespeichert | Bereits eingelöst | Default `false` |
| `usedAt` / `acceptedAt` | `Date` | – | gespeichert | Einlöse-/Annahmezeitpunkt | bei `markInvitationAsUsed` |
| `reminder24hSentAt` / `reminder3dSentAt` | `Date` | – | gespeichert | Erinnerungen versendet | je einmal |
| `lastSentAt` | `Date` | – | gespeichert | Letzter Versand | |
| `sendAttempts` | `number` | – | gespeichert | Versandversuche | Start `0`, `$inc` bei Versand |
| `mailDeliveryStatus` | enum | – | gespeichert | Mailjet-Zustellstatus | `queued\|sent\|delivered\|opened\|clicked\|deferred\|blocked\|bounced\|spam\|unsub\|error` |
| `lastMailEvent` / `lastMailEventAt` / `lastMailError` | string/Date/string | – | gespeichert | Letztes Mailjet-Ereignis | |
| `revokedAt` | `Date` | – | gespeichert | Widerruf | macht Einladung ungültig |
| `archivedAt` | `Date` | – | gespeichert | Archivierung | aus Listen ausgeblendet |
| `createdAt` | `Date` | ✓ | gespeichert | Erstellzeitpunkt | |

## Invarianten & Geschäftsregeln

- **Gültig** ist eine Einladung nur, wenn: `used === false` **und** kein `revokedAt` **und** kein
  `archivedAt` **und** `expiresAt > now` (`findInvitationByToken`).
- **Einlösung:** Erfolgreicher Invite-Login setzt `used`, `usedAt`, `acceptedAt`. Existiert noch
  kein Benutzer, wird ein passwortloser Benutzer (`role: 'user'`, Consents `false`,
  `habitat_name_visibility: 'public'`) angelegt. Hat der Benutzer bereits ein Passwort, schlägt
  der Invite-Login fehl (normale Anmeldung erforderlich).
- **Eindeutigkeit pro „Scope":** Pro (E-Mail + Organisation) soll nur eine offene Einladung
  existieren; Neueinladung aktualisiert die bestehende (`refreshPendingInvitation`) statt zu duplizieren.
- **Erinnerungen:** Nach 24 h bzw. 72 h fällig, je nur einmal (`getInvitationsDueForReminder`).

## Lebenszyklus

Erstellen → (Versand + ggf. Erinnerungen) → Einlösen (`used`) **oder** Widerruf (`revokedAt`)
**oder** Ablauf (`expiresAt`) → Archivierung (`archivedAt`, bleibt in DB).

## API-Endpunkte

| Methode & Pfad | Zweck | Berechtigung |
|---|---|---|
| `POST /api/auth/invite` | Einladung erstellen/senden | `canInvite` oder Admin |
| `POST /api/auth/invite/validate` | Token prüfen | öffentlich (Token) |
| `POST /api/auth/invite/reminders` | Erinnerungen senden | System/Cron/Admin |
| `GET /api/admin/invitations` | Verwaltung/Übersicht | Admin |
| `POST /api/webhooks/mailjet` | Zustellereignisse | Mailjet (Signatur) |

## Offene Punkte / Abweichungen

- Webhook-Authentizität (Signaturprüfung via `svix`/Mailjet) sollte in der Spec für
  `webhooks/mailjet` explizit festgehalten und verifiziert werden.
</content>
