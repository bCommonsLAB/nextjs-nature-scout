# Umriss-Flow UX-Analyse und Verbesserung

## Problemstellung

Viele Nutzer bleiben im Schritt "Umriss zeichnen" hängen. Die aktuelle UI zeigt vier Buttons gleichzeitig:
- "Umriss speichern" (links unten)
- "Neu beginnen" (links unten)
- "Zurück" (links unten)
- "Panoramabild erfassen" (rechts unten)

**Beobachtung**: Der "Panoramabild erfassen" Button erscheint als primärer CTA, obwohl zuerst der Umriss gezeichnet und gespeichert werden muss. Dies führt zu Verwirrung und Drop-offs.

## Ist-Zustand

### Aktuelle UI-Struktur
- **Links unten**: "Umriss speichern", "Neu beginnen", "Zurück" (alle gleichrangig)
- **Rechts unten**: "Panoramabild erfassen" (prominent, aber technisch disabled)
- **Standortinformationen**: Erscheinen nach dem Speichern rechts unten

### Aktuelle Validierung
Die Funktion `isNextButtonDisabled` in `NatureScout.tsx` prüft für Schritt 2 (Umriss zeichnen):
```typescript
case 2: // Umriss zeichnen
  return !metadata.gemeinde || !metadata.flurname || !metadata.latitude || !metadata.longitude;
```

**Problem**: Es wird nicht geprüft, ob ein Polygon gespeichert wurde (`polygonPoints`).

### Flow-Probleme
1. **Unklare Hierarchie**: Alle Buttons erscheinen gleichrangig
2. **Fehlende visuelle Führung**: Kein klares Signal, was zuerst zu tun ist
3. **Technische vs. UX-Blockierung**: Button ist disabled, aber Nutzer sehen nicht klar warum
4. **Polygon-Status nicht validiert**: Weiter-Button könnte theoretisch aktiv sein, auch ohne gespeichertes Polygon

## Hypothesen

1. **Hypothese 1**: Nutzer sehen den "Panoramabild erfassen" Button als primäre Aktion und versuchen, darauf zu klicken, ohne zuerst den Umriss zu speichern.
2. **Hypothese 2**: Die Buttons "Umriss speichern" und "Neu beginnen" erscheinen als "drittrangig" und werden übersehen.
3. **Hypothese 3**: Nutzer verstehen nicht, dass sie mindestens 3 Punkte zeichnen müssen, bevor sie speichern können.
4. **Hypothese 4**: Nach dem Speichern fehlt ein klares visuelles Feedback, dass der Schritt abgeschlossen ist.

## Gewählte Lösung: Variante A - Fester CTA-Block rechts unten

### Konzept
Ein **fester CTA-Block rechts unten** mit zustandsabhängigem Primary-CTA:

**Vor dem Speichern:**
- **Primary CTA**: "Umriss speichern" (disabled bis Polygon geschlossen)
- **Secondary CTA**: "Neu beginnen"
- **Hinweistext**: Klare Anweisung, was fehlt (z.B. "Mindestens 3 Punkte zeichnen" oder "Polygon schließen: ersten Punkt anklicken")

**Nach dem Speichern:**
- **Primary CTA**: "Weiter: Panoramabild erfassen" (enabled)
- **Secondary CTA**: "Umriss ändern" oder "Neu beginnen" (mit Bestätigungsdialog)
- **Standortinformationen**: Erscheinen wie bisher

### Begründung
- **Klarheit**: Ein einziger primärer CTA pro Zustand
- **Konsistenz**: Rechts unten ist der Standard-Platz für "Weiter"-Aktionen
- **Visuelle Hierarchie**: Primary-Button ist deutlich größer/prominenter
- **Mobile-First**: Funktioniert gut auf kleinen Bildschirmen

### Alternative Varianten (nicht umgesetzt)

**Variante B**: Standortinfo-Card rechts unten, darunter immer der Primary-CTA
- **Pro**: Standortinfo und CTA zusammen
- **Contra**: Kann bei vielen Informationen überladen wirken

**Variante C**: Checkliste/Stepper-Card mit CTA
- **Pro**: Sehr explizit, zeigt jeden Schritt
- **Contra**: Kann zu viel UI sein, weniger elegant

## Akzeptanzkriterien

### Funktionale Anforderungen
- [x] Polygon muss mindestens 3 Punkte haben, um gespeichert werden zu können
- [x] Polygon muss geschlossen sein (erster = letzter Punkt)
- [x] "Weiter" Button ist disabled, bis Polygon gespeichert wurde
- [x] Nach dem Speichern werden Standortdaten ermittelt und angezeigt
- [x] Nach dem Speichern wird "Weiter" aktiviert

### UX-Anforderungen
- [x] Primary CTA ist immer eindeutig erkennbar
- [x] Disabled-State zeigt klaren Grund (Hinweistext)
- [x] CTA-Block ist rechts unten positioniert
- [x] Responsive Design (mobil + desktop)
- [x] Keine Überlappung mit Map-Controls

### Technische Anforderungen
- [x] `hasSavedPolygon` wird aus `metadata.polygonPoints` abgeleitet (persistent)
- [x] Helper-Funktionen für Polygon-Status (`isPolygonClosed`, `getPolygonCtaState`)
- [x] `isNextButtonDisabled` prüft auf gespeichertes Polygon
- [x] Bestehende Funktionalität bleibt erhalten

## Test-Checkliste

### Manuelle Tests

#### Desktop (1920x1080)
- [ ] CTA-Panel sitzt rechts unten, keine Überlappung mit Map-Controls
- [ ] Ohne Punkte: "Umriss speichern" disabled + Hinweis "Mindestens 3 Punkte zeichnen"
- [ ] Mit 2 Punkten: weiterhin disabled + Hinweis "Mindestens 3 Punkte zeichnen"
- [ ] Mit 3+ Punkten, nicht geschlossen: disabled + Hinweis "Polygon schließen: ersten Punkt anklicken"
- [ ] Mit geschlossenem Polygon: "Umriss speichern" enabled
- [ ] Nach Speichern: Standortdaten laden, "Weiter: Panoramabild erfassen" wird aktiv
- [ ] "Neu beginnen" löscht Polygon und setzt Status zurück

#### Mobile (375x667)
- [ ] CTA-Panel ist gut erreichbar, nicht von Navigation überdeckt
- [ ] Buttons sind groß genug für Touch-Bedienung
- [ ] Hinweistexte sind lesbar
- [ ] Standortinformationen werden korrekt angezeigt

#### Edge Cases
- [ ] Reload der Seite: Gespeichertes Polygon wird erkannt, "Weiter" ist aktiv
- [ ] Edit-Modus: Bestehendes Polygon wird geladen, kann geändert werden
- [ ] "Neu beginnen" mit Bestätigungsdialog (falls implementiert)

### Unit-Tests
- [ ] `isPolygonClosed`: Prüft verschiedene Polygon-Formen
- [ ] `getPolygonCtaState`: Alle Zustände korrekt erkannt
- [ ] Rendering: CTA-Panel zeigt korrekten Zustand

## Implementierungsdetails

### Dateien
- `src/components/natureScout/LocationDetermination.tsx`: CTA-Panel implementieren
- `src/components/natureScout/NatureScout.tsx`: `isNextButtonDisabled` anpassen
- `src/__tests__/components/`: Tests für Helper-Funktionen

### Helper-Funktionen
```typescript
function isPolygonClosed(points: [number, number][]): boolean
function getPolygonCtaState(points: [number, number][], hasSaved: boolean): {
  canSave: boolean;
  disabledReason: string | null;
  hasSavedPolygon: boolean;
}
```

### State-Management
- `hasSavedPolygon` wird aus `metadata.polygonPoints` abgeleitet (nicht nur lokaler State)
- `polygonSaved` bleibt für UI-Feedback, aber Validierung basiert auf `metadata.polygonPoints`

## Offene Fragen / Follow-ups

- Soll "Neu beginnen" einen Bestätigungsdialog haben, wenn bereits ein Polygon gespeichert wurde?
- Soll der "Zurück"-Button in der Bottom-Navigation bleiben oder in den CTA-Block integriert werden?
- Sollen die Standortinformationen immer sichtbar sein oder nur nach dem Speichern?

