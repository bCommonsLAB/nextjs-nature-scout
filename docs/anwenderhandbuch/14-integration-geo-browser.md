# Integration Geo‑Browser (Export)

Dieses Kapitel beschreibt ein **nachgelagertes, technisches Thema**:
Eine berechtigte Person kann eine **JSON‑Datei exportieren**, die **verifizierte** Habitate
in einer flachen Struktur enthält.

Ziel ist, diese Datei dem Gemeindeverband zu übermitteln, damit sie im **Geo‑Browser**
ausgespielt wird.

> Wichtig: In der Codebasis wird „GeoBrowser“ auch für Standort-/Katasterabfragen verwendet
> (z.B. `/api/geobrowser`). Dieses Kapitel meint **die externe Geo‑Browser‑Integration** für
> die Anzeige wertvoller Habitate.

## Aktueller Prozess (Stand heute)

- **Manuell**: Export wird von einer berechtigten Person in der Weboberfläche ausgelöst.
- Ergebnis ist ein Download: `habitat-export-YYYY-MM-DD.json`.
- Die Datei wird anschließend **manuell** an den Gemeindeverband übermittelt (z.B. E‑Mail / Upload).

## Geplanter Prozess (TBD)

- **Endpoint**: Ziel-Endpoint (Upload/Push) ist noch zu definieren.
- **Zeitpunkt/Frequenz**: noch zu definieren (z.B. monatlich, wöchentlich, ad-hoc).
- **Automatisierung**: perspektivisch möglich, initial aber nicht vorgesehen.

## Export-Endpoint (NatureScout)

- Methode: `GET`
- Pfad: `/api/habitat/export`
- Auth: **erforderlich** (nur eingeloggte Nutzer*innen)
- Datenbasis: Es werden **nur verifizierte** Einträge exportiert (`verified: true`).

Zusätzlich akzeptiert der Export Query-Parameter, um die exportierte Datenmenge an die
aktuellen Filter der UI anzupassen (z.B. Gemeinde, Organisation, Habitatfamilie, Suchbegriff).
Die UI ruft den Endpoint entsprechend auf (Button „JSON exportieren“).

## JSON-Format

Die exportierte JSON-Datei hat die folgende Top-Level-Struktur:

```json
{
  "header": {
    "source": "Dachverband für Natur- und Umweltschutz",
    "date": "YYYY-MM-DD"
  },
  "data": [
    {
      "Id": "…",
      "gemeinde": "…",
      "flurname": "…",
      "latitude": 46.0,
      "longitude": 11.0,
      "polygonPoints": [[46.0, 11.0], [46.0, 11.0]],
      "updatedAt": "…",
      "protectionStatus": "RED|YELLOW|GREEN",
      "url": ""
    }
  ]
}
```

### Feldbeschreibung

- `header.source` (**string**): Datenquelle/Institution (statisch gesetzt).
- `header.date` (**string**): Exportdatum im Format `YYYY-MM-DD`.
- `data` (**array**): Liste exportierter Habitate (flach).

Pro Eintrag in `data`:

- `Id` (**string**): interne Job-/Habitat-ID (`jobId`).
- `gemeinde` (**string**): Gemeinde (falls vorhanden).
- `flurname` (**string**): Flurname (falls vorhanden).
- `latitude` (**number|null**): Mittelpunkt-/Referenzkoordinate.
- `longitude` (**number|null**): Mittelpunkt-/Referenzkoordinate.
- `polygonPoints` (**array|null**): Polygonpunkte als Liste von `[latitude, longitude]`.
- `updatedAt` (**string**): Zeitstempel der letzten Aktualisierung (wie in DB gespeichert).
- `protectionStatus` (**string**): farbliche Klassifikation als Text:
  - `RED` = gesetzlich geschützt (oder entsprechender Status)
  - `YELLOW` = hochwertig / schützenswert
  - `GREEN` = sonst (Fallback)
- `url` (**string**): derzeit leer. TODO: später Link auf eine Detailseite, z.B. `/habitat/<Id>`.

## Beispiel-Datei (reale Daten)

Für den Gemeindeverband liegt eine Beispiel-Exportdatei mit realen Daten im Repo:

- `samples/habitat-export-2025-12-30.json`

## Hinweise zur Datenqualität

- Export ist absichtlich „flach“, damit er in externe Systeme leichter zu importieren ist.
- Fehlende Werte werden als leere Strings (`""`) oder `null` exportiert.

## Offene Punkte (zu klären)

- Zielsystem:
  - akzeptiertes Format (GeoJSON vs aktuelles JSON)
  - Koordinatenreihenfolge (hier: `[lat, lon]`)
  - erwartete Projektion/CRS
- Transport:
  - Upload-Endpoint und Authentifizierung
  - Größenlimits / Komprimierung
- Governance:
  - wer darf exportieren und übermitteln?
  - Versionierung (Schema-Version im Header?)


