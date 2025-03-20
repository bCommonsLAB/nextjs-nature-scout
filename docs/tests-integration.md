# Test-Integration Dokumentation

## Überblick der Komponenten

### 1. Test-Seite (`/app/tests/page.tsx`)
- Hauptseite für die Testausführung (Client-Komponente)
- Lädt initiale Testfälle beim Start via `useEffect`
- Enthält drei Hauptkomponenten:
  - `TestControls`: Steuerung der Tests und Kategorie-Auswahl
  - `TestTable`: Anzeige der Testfälle und Ergebnisse
  - `TestHistory`: Anzeige vergangener Testläufe
- Implementiert strukturiertes Logging über `logTestEvent`
- Verwaltet den Zustand für Testfälle, Ergebnisse und Warnungen

### 2. Komponenten-Struktur

#### a) TestControls (`/app/tests/components/test-controls.tsx`)
- Ermöglicht Auswahl von Testkategorien und einzelnen Testfällen
- Startet Testläufe und zeigt Fortschritt an
- Eigenschaften:
  ```typescript
  interface TestControlsProps {
    testCases: GroupedTestCases;
    onReload?: () => Promise<void>;
    onTestProgress?: (current: string, progress: number) => void;
    onTestResult?: (result: TestResult) => void;
    onTestComplete?: (testRun: TestRun) => void;
    data?: {
      warning?: string;
      invalidHabitats?: { testCase: string; habitat: string }[];
    };
    selectedCategory: string;
    onCategoryChange: (category: string) => void;
  }
  ```

#### b) TestTable (`/app/tests/components/test-table.tsx`)
- Zeigt Testfälle in einer tabellarischen Struktur
- Gruppiert nach Kategorien und Subkategorien
- Umfasst Bildvorschau-Dialoge für Testbilder
- Zeigt Ergebnisstatus (Erfolg/Misserfolg) für jeden Test an
- Eigenschaften:
  ```typescript
  interface TestTableProps {
    testCases: TestCase[];
    results?: TestResult[];
    selectedCategory?: string;
  }
  ```

#### c) TestHistory (`/app/tests/components/test-history.tsx`)
- Zeigt vergangene Testläufe mit Zeitstempel und Erfolgsrate
- Ermöglicht Auswahl vergangener Testläufe
- Eigenschaften:
  ```typescript
  interface TestHistoryProps {
    testRuns?: TestRun[];
    onSelectTestRun?: (testRun: TestRun) => void;
  }
  ```

### 3. API-Routen

#### a) Test-Daten Laden (`/api/tests/load-cases/route.ts`)
- Liest Testfälle aus dem Dateisystem
- Gruppiert Testfälle nach Kategorien
- Validiert Habitattypen und meldet ungültige Typen
- Struktur:
  ```typescript
  POST /api/tests/load-cases
  Response: {
    testCases: Record<string, TestCaseInfo[]>;
    metadata: {
      count: number;
      categoryCounts: Record<string, number>;
      timestamp: string;
    };
    warning?: string;
    invalidHabitats?: { testCase: string; habitat: string }[];
  }
  ```

#### b) Test Ausführen (`/api/tests/run/route.ts`)
- Führt die Habitat-Erkennung für Testfälle durch
- Nutzt den OpenAI-Service für die Analyse
- Implementiert Server-Sent Events (SSE) für Echtzeit-Updates
- Umfasst detailliertes Logging mit `logTestEvent`
- Struktur:
  ```typescript
  GET/POST /api/tests/run
  Parameter:
    - category: string (optional, default: 'all')
    - testCaseId: string (optional)
  Response: SSE Stream mit:
    - Progress Updates (type: 'progress')
    - Einzelne Testergebnisse (type: 'result')
    - Finales TestRun-Objekt (type: 'complete')
  ```

### 4. Typdefinitionen

Die wichtigsten Typen in `/app/tests/types/test-types.ts`:

```typescript
export interface TestCase {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  expectedHabitat: string;
  imageUrls: string[] | "Bilder fehlen";
  plants: string[] | "Pflanzenliste fehlt";
  status: "vollständig" | "unvollständig";
}

export interface TestResult {
  testCaseId: string;
  expectedHabitat: string;
  predictedHabitat: string;
  confidence: number;
  isCorrect: boolean;
  timestamp: string;
}

export interface TestRun {
  id: string;
  timestamp: string;
  results: TestResult[];
  successRate: number;
}
```

## Datenfluss

1. **Test-Initialisierung**:
   ```mermaid
   sequenceDiagram
   TestPage->>LoadCasesAPI: Lade Testfälle
   LoadCasesAPI->>Filesystem: Lese Testbilder
   Filesystem->>LoadCasesAPI: Testfall-Daten
   LoadCasesAPI->>TestPage: Gruppierte Testfälle mit Metadaten
   ```

2. **Test-Ausführung**:
   ```mermaid
   sequenceDiagram
   TestControls->>RunAPI: Starte Test (POST mit category/testCaseId)
   RunAPI->>LoadCasesAPI: Lade Testfälle
   RunAPI-->>TestControls: SSE Progress Updates
   RunAPI->>OpenAIService: Analysiere Bilder mit analyzeImageStructured
   OpenAIService->>RunAPI: Analyse-Ergebnis
   RunAPI-->>TestControls: SSE Einzelresultate
   RunAPI-->>TestControls: SSE Testlauf komplett
   ```

## Verzeichnisstruktur für Testfälle

Die Tests erwarten folgende Verzeichnisstruktur:

```
/test-images/
  /{kategorie}/              # z.B. "Wiesen", "Wälder"
    /{habitattyp}/           # z.B. "Feuchtwiese", "Buchenwald"
      /pflanzen.md           # Optional: Standard-Pflanzenliste für alle Beispiele
      /Beispiel1/            # Testfall-Verzeichnis (muss mit "Beispiel" beginnen)
        /bild1.jpg           # Beliebige Anzahl Bilder
        /bild2.jpg
        /pflanzen.md         # Optional: Spezifische Pflanzenliste für dieses Beispiel
      /Beispiel2/
        ...
```

## Testresultate

Die Testresultate enthalten:
- Erkanntes Habitat (`predictedHabitat`)
- Erwartetes Habitat (`expectedHabitat`)
- Erfolgsstatus (`isCorrect`)
- Zeitstempel (`timestamp`)
- Vollständige Analyse-Ergebnisse (`analysis`)

## Konfiguration und Umgebungsvariablen

Erforderliche Umgebungsvariablen:
- `OPENAI_API_KEY`: Für Vision-Modell
- `HABITAT_TEST_IMAGES_PATH`: Pfad zu Testbildern
- `NEXT_PUBLIC_BASE_URL`: Basis-URL für absolute Bildpfade (default: 'http://localhost:3000')

## Nächste Schritte

1. Implementierung von Konfidenz-Schwellenwerten für Testresultate
2. Erweiterung der Testfall-Anzeige um detaillierte Analyseergebnisse
3. Hinzufügen von Statistiken und Metriken zur Testauswertung
4. Integration von Performance-Metriken für die Analyse
5. Verbesserung der Filterung nach Kategorien/Subkategorien
6. Speichern von Testläufen in einer Datenbank für langfristige Auswertung 