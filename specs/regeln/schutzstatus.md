# Regel: Schutzstatus & protectionStatus (Ampel)

Definiert die fachliche Schutz-Klassifizierung eines Habitats und deren technische Ableitung in
die Ampelwerte `red`/`yellow`/`green`, die u. a. die öffentliche Sichtbarkeit steuern.

- **Quellen im Code:**
  - `src/lib/utils/data-validation.ts` (`normalizeSchutzstatus`, `schutzstatusToProtectionStatus`)
  - `src/lib/services/analysis-config-service.ts` (Schema-Definition `schutzstatus`)
  - `src/app/api/habitat/[auftragsId]/effective-habitat/route.ts` (Ableitung bei Verifizierung)
  - `src/app/api/habitat/route.ts`, `.../public/route.ts` (Filterung)

## Fachliche Schutzstatus-Werte

| `schutzstatus` (Text) | Bedeutung | Beispiel-Habitattypen |
|---|---|---|
| `gesetzlich geschützt` | Gesetzlich geschützte Lebensräume | Feuchtgebiete (Verlandungsbereich, Schilf, Röhricht, Großsegge, Moor, Au-/Sumpf-/Bruchwald, Quellbereich, naturnaher Bachlauf, Wassergraben m. Ufervegetation), Trockenstandorte (Trockenrasen, Felsensteppe) |
| `ökologisch hochwertig` | Extensiv bewirtschaftetes, wertvolles Grünland | Magerwiese, Magerweide |
| `ökologisch niederwertig` | Intensiv genutzt / stark anthropogen verändert | Fettwiese, Fettweide, Kunstrasen, Parkanlage, Ruderalfläche, sonstige |

(Quelle der Zuordnung: Analyse-Schema in `analysis-config-service.ts`.)

## Ableitung in die Ampel (`protectionStatus`)

| `schutzstatus` | `protectionStatus` | Öffentlich sichtbar? |
|---|---|---|
| gesetzlich geschützt | `red` | **ja** |
| ökologisch hochwertig | `yellow` | **ja** |
| ökologisch niederwertig | `green` | **nein** |

- Die Ableitung erfolgt über `schutzstatusToProtectionStatus(schutzstatus)`.
- `normalizeSchutzstatus()` vereinheitlicht Schreibvarianten vor Vergleich/Filterung.

## Kernregeln

1. **Berechnung bei Verifizierung:** `protectionStatus` wird bei der Verifizierung aus
   `verifiedResult.schutzstatus` neu berechnet und am Habitat gespeichert.
2. **Öffentliche Sichtbarkeit:** Nur `verified === true && protectionStatus ∈ {red, yellow}`
   ist öffentlich. `green` bleibt privat (Schutz vor „Abwertungs"-Veröffentlichung).
3. **Effektiver Wert:** Für Anzeige/Filter/Export gilt `verifiedResult.schutzstatus` vor
   `result.schutzstatus`.
4. **Kein Fallback bei Filterung:** Beim Filtern nach `protectionStatus` werden Habitate **ohne**
   gesetzten `protectionStatus` nicht eingeschlossen (kein impliziter Default).

## Offene Punkte / Abweichungen

- Die Mapping-Funktionen liegen in `src/lib/utils/data-validation.ts`; die genaue
  Normalisierungslogik (Toleranz gegenüber Tippfehlern/Synonymen) sollte hier bei Änderungen
  aktuell gehalten werden.
</content>
