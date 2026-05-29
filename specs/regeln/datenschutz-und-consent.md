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

## Offene Punkte / Abweichungen

- Die **Durchsetzung** der Consent-Felder ist im Code nur teilweise erkennbar. Zu spezifizieren
  und zu verifizieren ist:
  - Wird `habitat_name_visibility` in **allen** öffentlichen Ausgaben (Liste, Karte, Detail,
    Export) konsequent angewandt?
  - Wird `consent_image_ccby` vor Veröffentlichung/Export von Bildern geprüft?
  - Soll `consent_data_processing` Pflicht für die Erfassung sein?
- DSGVO-Aspekte (Auskunft, Löschung) sind nicht spezifiziert; Soft-Delete von Habitaten löscht
  Personendaten nicht physisch.
</content>
