# Schrittweise Bilderfassung

## Übersicht

Die neue schrittweise Bilderfassung teilt den "Bilder erfassen"-Schritt in vier benutzerfreundliche Einzelschritte auf, um den Anwender nicht zu überfordern. Jeder Schritt fokussiert sich auf einen spezifischen Bildtyp mit detaillierten Anleitungen.

## Konzept

### Problem
Der bisherige Ansatz zeigte alle vier Bildupload-Bereiche gleichzeitig an, was besonders auf Smartphones überfordernd wirkte und zu Verwirrung bei der Bedienung führte.

### Lösung
- **Ein Bild pro Schritt**: Fokus auf jeweils nur einen Upload
- **Visuelle Anleitungen**: Schematische Hintergrundbilder zeigen was fotografiert werden soll
- **Handy-Orientierungshilfen**: Klare Anweisungen für Quer- oder Hochformat
- **Automatische Navigation**: Nach erfolgreichem Upload automatisch zum nächsten Schritt
- **Fortschrittsanzeige**: Unterfortschritt innerhalb des "Bilder erfassen" Hauptschritts

## Die vier Schritte

### 1. Panoramabild
**Ziel**: Gesamtüberblick des Habitats

**Anweisungen**:
- Handy horizontal (quer) halten
- Etwas Himmel mit einbeziehen  
- Gesamtes Habitat erfassen
- Guten Überblick schaffen

**Technische Details**:
- `imageKey`: "Panoramabild"
- `doAnalyzePlant`: false
- `orientation`: 'landscape'

### 2. Detailbild
**Ziel**: Nahaufnahme mit Hintergrund

**Anweisungen**:
- Handy vertikal (aufrecht) halten
- Nahaufnahme im Vordergrund
- Etwas Hintergrund mitzeigen
- Interessante Details fokussieren

**Technische Details**:
- `imageKey`: "Detailansicht"
- `doAnalyzePlant`: false
- `orientation`: 'portrait'

### 3. Pflanzenbild 1
**Ziel**: Erste typische Pflanzenart

**Anweisungen**:
- Pflanze scharf fokussieren
- Gute Beleuchtung nutzen
- Typische Art für das Habitat
- Automatische Bestimmung aktiviert

**Technische Details**:
- `imageKey`: "Detailbild_1" 
- `doAnalyzePlant`: true
- `orientation`: 'portrait'

### 4. Pflanzenbild 2
**Ziel**: Zweite typische Pflanzenart

**Anweisungen**:
- Andere Art als Bild 1
- Scharf fokussieren
- Für Habitatcharakterisierung
- Automatische Bestimmung aktiviert

**Technische Details**:
- `imageKey`: "Detailbild_2"
- `doAnalyzePlant`: true
- `orientation`: 'portrait'

## UI/UX Features

### Mobile-first Design
- Optimiert für Smartphone-Nutzung
- Touch-freundliche Buttons
- Klare Hierarchie und Lesbarkeit

### Visuelle Hilfsmittel
- **Handy-Orientierungsindikator**: Zeigt ob Quer- oder Hochformat
- **Fortschrittsbalken**: Innerhalb des Bilderfassungsschritts
- **Schematische Hintergrundbilder**: Zeigen was fotografiert werden soll
- **Status-Indikatoren**: Dots zeigen aktuellen und abgeschlossene Schritte

### Navigation
- **Automatisch**: Nach Upload automatisch zum nächsten Schritt
- **Manuell**: Zurück/Weiter Buttons für manuelle Navigation
- **Überspringen**: Möglichkeit Schritte zu überspringen (außer Panoramabild)

### Feedback
- **Sofortiges Feedback**: Upload-Status und Fortschritt
- **Bildvorschau**: Übersicht der hochgeladenen Bilder
- **Pflanzenerkennung**: Automatische Analyse bei Pflanzenbildern

## Technische Implementierung

### Komponenten-Architektur

```
StepByStepImageUpload.tsx
├── Fortschrittsanzeige (Progress Bar)
├── Schritt-spezifische Anleitung (Card)
│   ├── Icon und Titel
│   ├── Handy-Orientierungshilfe
│   ├── Detaillierte Anweisungen
│   └── Tipps-Liste
├── Schematisches Hintergrundbild
├── Upload-Bereich (GetImage)
├── Navigation (Zurück/Weiter)
└── Übersicht hochgeladener Bilder
```

### State Management

```typescript
interface ImageStep {
  id: string;           // imageKey für Metadaten
  title: string;        // Anzeigename
  subtitle: string;     // Kurzbeschreibung  
  instruction: string;  // Detaillierte Anweisung
  orientation: 'landscape' | 'portrait'; // Handy-Orientierung
  icon: React.ReactNode; // Schritt-Icon
  tips: string[];       // Tipps-Liste
  doAnalyzePlant: boolean; // Pflanzenerkennung aktivieren
}
```

### Integration

Die Komponente ersetzt `UploadImages` in `NatureScout.tsx`:

```typescript
case 3: // "Bilder erfassen" Schritt
  return <StepByStepImageUpload 
    metadata={metadata} 
    setMetadata={setMetadata} 
    scrollToNext={scrollToNext}
    onUploadActiveChange={handleUploadActiveChange}
  />;
```

## Schematische Hintergrundbilder

### Panoramabild
- **Motiv**: Weite Landschaft mit Horizont
- **Elemente**: Himmel (1/3), Habitat (2/3), Handy-Symbol (quer)
- **Farben**: Blau-Grün-Gradient

### Detailbild  
- **Motiv**: Nahaufnahme mit Tiefenschärfe
- **Elemente**: Vordergrund scharf, Hintergrund unscharf
- **Farben**: Grün-Töne mit Fokus-Indikator

### Pflanzenbild 1
- **Motiv**: Einzelne Pflanze im Fokus
- **Elemente**: Blüte oder charakteristische Blätter
- **Farben**: Natürliche Pflanzenfarben mit Fokus-Ring

### Pflanzenbild 2
- **Motiv**: Andere Pflanzenart
- **Elemente**: Unterschiedliche Wuchsform als Bild 1
- **Farben**: Komplementäre Pflanzenfarben

## Zukünftige Verbesserungen

### Geplante Features
1. **Interaktive Tutorials**: Animierte Anleitungen für jeden Schritt
2. **AR-Hilfsmittel**: Augmented Reality Guides für Bildkomposition
3. **Qualitätsprüfung**: Automatische Bildqualitätsbewertung
4. **Personalisierung**: Anpassung basierend auf Benutzerverhalten

### Technische Optimierungen
1. **Offline-Modus**: Zwischenspeicherung bei schlechter Verbindung
2. **Bildkomprimierung**: Optimierte Upload-Größen
3. **Batch-Upload**: Mehrere Bilder gleichzeitig verarbeiten
4. **Cloud-Sync**: Automatische Synchronisation zwischen Geräten

## Testing und Validierung

### Usability Tests
- **Zielgruppe**: Feldforcher und Naturbegeisterte
- **Szenarien**: Echte Habitat-Erfassung im Feld
- **Metriken**: Erfolgsrate, Aufgabenzeit, Benutzerzufriedenheit

### Technische Tests
- **Responsive Design**: Tests auf verschiedenen Bildschirmgrößen
- **Performance**: Upload-Geschwindigkeit und Speicherverbrauch
- **Kompatibilität**: Browser- und Geräte-Kompatibilität

### A/B Testing
- **Varianten**: Alte vs. neue schrittweise Bedienung
- **Metriken**: Abschlussrate, Bildqualität, Benutzerfreundlichkeit

## Fazit

Die schrittweise Bilderfassung verbessert die Benutzerfreundlichkeit erheblich durch:

- **Reduzierte kognitive Belastung**: Ein Fokus pro Schritt
- **Klare Führung**: Spezifische Anweisungen und visuelle Hilfen
- **Mobile Optimierung**: Bessere Smartphone-Erfahrung
- **Höhere Erfolgsrate**: Weniger Abbrüche und bessere Bildqualität

Die Implementierung behält die bestehende Datenstruktur bei und fügt eine intuitive Benutzeroberfläche hinzu, die besonders für Feldarbeit und mobile Nutzung optimiert ist.