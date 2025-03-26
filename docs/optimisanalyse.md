# Analyseprozess der Nature Scout Anwendung

## 1. Überblick

Die Nature Scout Anwendung verwendet einen zweistufigen Analyseprozess zur Bestimmung von Habitattypen und deren Schutzstatus:

1. **Habitat-Analyse**: Analyse der Bilder und Pflanzenarten zur Bestimmung des Habitattyps
2. **Schutzstatus-Analyse**: Bewertung des Schutzstatus basierend auf dem erkannten Habitattyp

## 2. Frontend-Prozess

### 2.1 Komponente: HabitatAnalysis
- Startet automatisch die Analyse, wenn keine Ergebnisse vorliegen
- Implementiert einen Polling-Mechanismus zur Statusabfrage
- Zeigt Analyseergebnisse und Feedback-Optionen an

### 2.2 Datenfluss
1. Frontend sendet Metadaten an `/api/analyze/start`
2. Erhält eine `jobId` für die Statusverfolgung
3. Pollt `/api/analyze/status` alle 2 Sekunden
4. Aktualisiert UI bei Abschluss oder Fehler

## 3. Backend-Prozess

### 3.1 API-Endpunkte

#### `/api/analyze/start`
- Erstellt einen neuen Analyse-Job in der Datenbank
- Startet die asynchrone Analyse
- Gibt eine `jobId` zurück

#### `/api/analyze/status`
- Prüft den Status eines Analyse-Jobs
- Gibt Ergebnisse oder Fehlermeldungen zurück

### 3.2 Analyse-Service

#### `analyzeImageStructured`
Führt die Analyse in zwei Schritten durch:

1. **Habitat-Analyse** (`performHabitatAnalysis`)
   - Verwendet OpenAI Vision Model
   - Analysiert Bilder und Pflanzenarten
   - Bestimmt Habitattyp und Parameter

2. **Schutzstatus-Analyse** (`performSchutzStatusAnalysis`)
   - Verwendet OpenAI Chat Model
   - Bewertet Schutzstatus basierend auf Habitattyp
   - Berücksichtigt lokale Schutzbestimmungen

## 4. Datenstrukturen

### 4.1 Analyse-Schema
```typescript
{
  standort: {
    hangneigung: string,
    exposition: string,
    bodenfeuchtigkeit: string
  },
  pflanzenarten: Array<{
    name: string,
    häufigkeit: string,
    istzeiger: boolean
  }>,
  vegetationsstruktur: {
    höhe: string,
    dichte: string,
    deckung: string
  },
  blühaspekte: {
    intensität: string,
    anzahlfarben: number
  },
  nutzung: {
    beweidung: boolean,
    mahd: boolean,
    düngung: boolean
  },
  habitattyp: string,
  evidenz: {
    dafür_spricht: string[],
    dagegen_spricht: string[]
  },
  zusammenfassung: string,
  schutzstatus: string
}
```

### 4.2 Datenbank-Collections

#### `analyseJobs`
- Speichert Analyse-Jobs und deren Status
- Enthält Metadaten und Ergebnisse

#### `habitatAnalysisSchemas`
- Definiert die Struktur der Analyseergebnisse
- Enthält Beschreibungen für die KI-Analyse

#### `prompts`
- Speichert System-Instruktionen und Prompts
- Definiert die Analyse-Logik

## 5. Optimierungsmöglichkeiten

### 5.1 Datenqualität
- Validierung der Eingabedaten
- Qualitätskontrolle der Bilder
- Überprüfung der Pflanzenarten

### 5.2 Analyseprozess
- Optimierung der Prompts
- Verbesserung der Habitattyp-Erkennung
- Präzisere Schutzstatus-Bewertung

### 5.3 Performance
- Caching von Analyseergebnissen
- Optimierung der Bildverarbeitung
- Reduzierung der API-Aufrufe

## 6. Nächste Schritte

1. Implementierung von Datenvalidierung
2. Optimierung der Analyse-Prompts
3. Verbesserung der Fehlerbehandlung
4. Einführung von Qualitätsmetriken
5. Erweiterung der Feedback-Mechanismen 