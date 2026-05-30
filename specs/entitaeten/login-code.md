# Entität: Login-Code (LoginCode)

> Einmaliger 6-stelliger Code für die passwortlose Anmeldung per E-Mail.

- **Technischer Typ/Name:** `ILoginCode`
- **MongoDB-Collection:** `loginCodes`
- **Quellen im Code:**
  - `src/lib/services/login-code-service.ts` (Interface, `LoginCodeService`)
  - `src/app/api/auth/request-code/route.ts`, `src/app/api/auth/code-login/route.ts`
  - `src/lib/auth.ts` (Provider, `loginType: 'code'`)

## Zweck & Kontext

Nutzer fordern per E-Mail einen Code an; mit `E-Mail + Code` melden sie sich an. Codes sind
kurzlebig und einmalig verwendbar. Versand via Mailjet.

## Felder

| Feld | Typ | Pflicht | Status | Beschreibung | Validierung / Invariante |
|---|---|---|---|---|---|
| `_id` | `string \| ObjectId` | ✓ | gespeichert | MongoDB-ID | |
| `email` | `string` | ✓ | gespeichert | Ziel-E-Mail | normalisiert (lowercase/trim) |
| `code` | `string` | ✓ | gespeichert | 6-stelliger numerischer Code | Regex `^\d{6}$`; **unique** (sparse) |
| `expiresAt` | `Date` | ✓ | gespeichert | Ablaufzeitpunkt | **15 Minuten** ab Erstellung |
| `used` | `boolean` | ✓ | gespeichert | Bereits verwendet | Default `false` |
| `createdAt` | `Date` | ✓ | gespeichert | Erstellzeitpunkt | |
| `usedAt` | `Date` | – | gespeichert | Verwendungszeitpunkt | bei `markCodeAsUsed` |

## Invarianten & Geschäftsregeln

- **Gültig** nur, wenn: `used === false` **und** `expiresAt > now` (`validateCode`).
- **Einmalig:** Nach erfolgreichem Login `markCodeAsUsed` → `used: true`.
- **Eindeutigkeit:** Code-Generierung wiederholt bis eindeutig (max. 10 Versuche).
- **Rate Limiting:** Max. **3 Codes / 5 Minuten** je E-Mail (`checkRateLimit`).
- **Auto-Cleanup:** TTL-Index auf `expiresAt` (`expireAfterSeconds: 0`) löscht abgelaufene Codes
  automatisch; zusätzlich `cleanupOldCodes` für verwendete/abgelaufene.

## Lebenszyklus

Anfordern (`createLoginCode`) → Versand → Validieren beim Login → `used` → automatische Löschung (TTL).

## Indizes (MongoDB)

`createLoginCodeIndexes()`: `email`, `code` (unique, sparse), `expiresAt`, `used`,
`createdAt:-1`, Verbund `{email, used}`, `{email, expiresAt}`, `{code, used}`,
**TTL** auf `expiresAt`.

## API-Endpunkte

| Methode & Pfad | Zweck | Berechtigung |
|---|---|---|
| `POST /api/auth/request-code` | Code anfordern (rate-limited) | öffentlich |
| `POST /api/auth/code-login` (via NextAuth) | Code-Login | öffentlich |
| `POST /api/init/login-codes` | Indizes initialisieren | Admin/Init |
</content>
