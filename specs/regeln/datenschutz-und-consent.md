# Regel: Datenschutz & Einwilligungen (Consent)

Regeln zu Einwilligungen, Sichtbarkeit personenbezogener Daten und Bildrechten.

- **Quellen im Code:**
  - `src/lib/services/user-service.ts` (`consent_data_processing`, `consent_image_ccby`, `habitat_name_visibility`)
  - `src/app/api/habitat/public/route.ts` (öffentliche Ausspielung)
  - `src/lib/auth.ts` (Default-Consents bei Invite-Anlage = `false`)

## Einwilligungsfelder (am Benutzer)

| Feld | Bedeutung | Default |
|---|---|---|
| `consent_data_processing` | Einwilligung in die Verarbeitung der erfassten Daten | `false` (bei Invite) |
| `consent_image_ccby` | Freigabe hochgeladener Bilder unter CC-BY | `false` (bei Invite) |
| `habitat_name_visibility` | Sichtbarkeit des Erfassernamens: `public` \| `members` \| `null` | `public` (bei Invite) |

## Kernregeln

1. **Namens-Sichtbarkeit:** `habitat_name_visibility` steuert, ob der Erfassername öffentlich
   (`public`), nur für angemeldete Mitglieder (`members`) oder gar nicht (`null`) angezeigt wird.
   Öffentliche Ansichten müssen dies respektieren.
2. **Öffentliche Habitate ≠ öffentliche Personendaten:** Auch wenn ein Habitat öffentlich ist
   (verifiziert, red/yellow), dürfen personenbezogene Felder nur gemäß `habitat_name_visibility`
   ausgespielt werden.
3. **Bildrechte:** Eine Veröffentlichung/Weitergabe von Bildern unter CC-BY setzt
   `consent_image_ccby === true` voraus.
4. **Datenverarbeitung:** `consent_data_processing` dokumentiert die Einwilligung; fachlich ist
   zu klären, ob aktive Erfassung ohne diese Einwilligung blockiert sein soll (s. „Offene Punkte").

## Ist-Zustand der Durchsetzung (verifiziert)

- ✅ **Namens-Sichtbarkeit:** In der öffentlichen Liste/Karte (`habitat/public/route.ts`) wird
  `erfassungsperson` anonymisiert: für anonyme Zugriffe **immer**; für eingeloggte Nutzer nur
  angezeigt, wenn `habitat_name_visibility === 'public'` **oder** dieselbe Organisation. Die
  `email` wird in der öffentlichen Ausgabe stets entfernt. Analog in `public-filter-options`.
- ✅ **Datenverarbeitung:** `consent_data_processing` wird clientseitig als Zugangs-Gate
  erzwungen (`hooks/use-user-consent.ts`, `components/layout/navigationbar.tsx`): ohne alle drei
  Consents wird der/die Nutzer:in zur Vervollständigung im Profil geführt.

## Offene Punkte / Abweichungen

- ⚠️ **`consent_image_ccby` wird (noch) nicht durchgesetzt:** In der öffentlichen Ausgabe/Export
  findet keine Prüfung dieses Flags statt – Bilder werden unabhängig von der CC-BY-Freigabe
  ausgespielt. **Fachliche Entscheidung nötig:** Sollen Bilder ohne CC-BY-Freigabe zurückgehalten
  oder nur intern angezeigt werden? (Bewusst nicht eigenmächtig geändert, da verhaltensändernd.)
- DSGVO-Aspekte (Auskunft, Löschung) sind nicht spezifiziert; Soft-Delete von Habitaten löscht
  Personendaten nicht physisch.
</content>
