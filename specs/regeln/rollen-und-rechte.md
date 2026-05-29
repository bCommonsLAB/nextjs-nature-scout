# Regel: Rollen & Berechtigungen (RBAC)

Definiert, wer was sehen und tun darf. Maßgeblich sind die E-Mail-basierte Identität und die
Rolle des Benutzers.

- **Quellen im Code:**
  - `src/lib/server-auth.ts` (`requireAuth`, `requireAdmin`, `requireExpert`, `checkAdminAccess`, `checkExpertAccess`)
  - `src/lib/services/user-service.ts` (`isAdmin`, `isExpert`)
  - `src/app/api/habitat/[auftragsId]/route.ts`, `.../effective-habitat/route.ts` (Zugriffsprüfungen)

## Rollen

| Rolle | Beschreibung |
|---|---|
| `user` | Standard. Erfasst und verwaltet **eigene** Habitate. |
| `experte` | Darf alle Habitate sehen, verifizieren, bearbeiten, löschen. |
| `admin` | Wie Experte + Verwaltung (Benutzer, Organisationen, Habitattypen/-gruppen, Schema/Prompt). |
| `superadmin` | Wie Admin (höchste Stufe). |

**Abgeleitete Prädikate:**
- `isAdmin` ⇔ Rolle ∈ {`admin`, `superadmin`}
- `isExpert` ⇔ Rolle ∈ {`experte`, `admin`, `superadmin`}
- `hasAdvancedPermissions` := `isAdmin || isExpert` (in mehreren Routen verwendet)

## Kernregeln

1. **Eigentum über E-Mail:** Ein Habitat „gehört" `metadata.email`. Ohne erweiterte Rechte
   darf eine Person nur eigene Habitate sehen/bearbeiten/löschen.
2. **Erweiterte Rechte (Experte/Admin):** sehen/bearbeiten/löschen **alle** Habitate, dürfen
   verifizieren und die Verifizierung zurücknehmen.
3. **Öffentlicher Lesezugriff:** Nicht angemeldete Personen sehen nur Habitate mit
   `verified === true && protectionStatus ∈ {red, yellow}` (s. `schutzstatus.md`).
4. **Filter-Sichtbarkeit:** Ohne erweiterte Rechte sind Filter-Optionen (Gemeinden, Habitate …)
   auf die eigenen Einträge beschränkt (`getFilterOptions`, Parameter `hasAdvancedPermissions`).
5. **Admin-Bereich:** Sämtliche `/api/admin/*`-Routen erfordern Adminrechte
   (`requireAdmin`/`checkAdminAccess`).
6. **Einladungsrecht:** Einladen darf, wer `canInvite === true` hat oder Admin ist.
7. **Letzter Admin:** Es muss stets mindestens ein Admin/Superadmin verbleiben
   (`getAdminCount`); Rollenänderungen müssen das wahren.

## Durchsetzung (Pattern)

- **Server-seitig** über Helfer aus `server-auth.ts`. API-Routen rufen `requireAuth()` und prüfen
  anschließend `isAdmin`/`isExpert` bzw. Eigentum (`entry.metadata.email === userEmail`).
- **Fehlercodes:** `401`/„Nicht angemeldet" bei fehlender Session, `403`/„Zugriff verweigert"
  bei fehlender Berechtigung.

## Offene Punkte / Abweichungen

- ✅ **`GET /api/init/db-indexes` gehärtet (erledigt):** Route erfordert nun `requireAdmin()`
  (zuvor war die Admin-Prüfung auskommentiert, nur `requireAuth`). Andere `/api/init/*`-Routen
  sollten gegengeprüft werden.
- Unterschied `admin` vs. `superadmin` ist im Code aktuell **nicht** wirksam differenziert
  (beide gelten als Admin). Falls eine Sonderrolle gewünscht ist, hier spezifizieren.
- Berechtigungen werden pro Route imperativ geprüft (keine zentrale Policy/Middleware) – ein
  einheitliches Guard-/Policy-Konzept wäre wartungsfreundlicher.
</content>
