# Entität: <Name>

> Kurzbeschreibung in 1–2 Sätzen: Was repräsentiert diese Entität fachlich?

- **Technischer Typ/Name:** `<InterfaceName>`
- **MongoDB-Collection:** `<collectionName>`
- **Quellen im Code:**
  - `src/...` (Interface/Schema)
  - `src/...` (Service)
  - `src/app/api/...` (API-Routen)

## Zweck & Kontext

Wofür wird die Entität verwendet? Wie hängt sie mit dem 5-Phasen-Workflow / anderen Entitäten
zusammen?

## Felder

| Feld | Typ | Pflicht | Status | Beschreibung | Validierung / Invariante |
|---|---|---|---|---|---|
| `feld` | `string` | ✓ | gespeichert | … | … |

**Status-Legende:** `gespeichert` = in DB persistiert · `abgeleitet` = berechnet/normalisiert ·
`nur Laufzeit` = nur in der Session/im Request.

## Beziehungen

- Verweist auf: `<Entität>` über `<feld>`
- Wird referenziert von: `<Entität>`

## Invarianten & Geschäftsregeln

- Regel 1 …
- Verweise auf `specs/regeln/*.md`, wo zutreffend.

## Lebenszyklus

Erstellung → Änderung → (Soft-Delete/Archivierung) → Löschung. Wer darf was (Verweis auf
`regeln/rollen-und-rechte.md`)?

## Indizes (MongoDB)

- `{ feld: 1 }` – Zweck …

## API-Endpunkte

| Methode & Pfad | Zweck | Berechtigung |
|---|---|---|
| `GET /api/...` | … | … |

## Offene Punkte / Abweichungen

- ⚠️ …
</content>
