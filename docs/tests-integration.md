# Test-Integration Dokumentation

## Überblick der Komponenten

### 1. Test-Seite (`/app/tests/page.tsx`)
- Hauptseite für die Testausführung
- Lädt initiale Testfälle beim Start
- Enthält drei Hauptkomponenten:
  - `TestControls`: Steuerung der Tests
  - `TestTable`: Anzeige der Testfälle
  - `TestHistory`: Historie der Testläufe

### 2. API-Routen

#### a) Test-Daten Laden (`/api/tests/load-cases/route.ts`)
- Liest Testfälle aus dem Dateisystem
- Gruppiert Testfälle nach Kategorien
- Struktur:
  ```typescript
  POST /api/tests/load-cases
  Response: {
    testCases: GroupedTestCases;
    metadata: {
      count: number;
      categoryCounts: Record<string, number>;
      timestamp: string;
    }
  }
  ```

#### b) Test Ausführen (`/api/tests/run/route.ts`)
- Führt die Habitat-Erkennung für Testfälle durch
- Aktuell: Mock-Implementierung
- Geplante Integration mit OpenAI-Service
- Struktur:
  ```typescript
  POST /api/tests/run
  Body: {
    category?: string; // Optional: Filtert nach Kategorie
  }
  Response: TestRun
  ```

### 3. Analyse-Service Integration

#### a) OpenAI-Service (`/lib/services/openai-service.ts`)
- Hauptlogik für Habitat-Erkennung
- Verwendet OpenAI's Vision-Modell
- Analysiert:
  - Standortbedingungen
  - Pflanzenarten
  - Vegetationsstruktur
  - Nutzungsspuren
  - Habitattyp
  - Schutzstatus

#### b) Analyse-API-Routen
1. `/api/analyze/start/route.ts`:
   - Startet einen neuen Analyse-Job
   - Erstellt Job in der Datenbank
   - Führt Analyse asynchron durch

2. `/api/analyze/status/route.ts`:
   - Prüft Status eines laufenden Jobs
   - Liefert Ergebnisse zurück

3. `/api/analyze/plants/route.ts`:
   - Integriert PlantNet API
   - Identifiziert Pflanzen in Bildern

## Datenfluss

1. **Test-Initialisierung**:
   ```mermaid
   sequenceDiagram
   TestPage->>LoadCasesAPI: Lade Testfälle
   LoadCasesAPI->>Filesystem: Lese Testbilder
   Filesystem->>LoadCasesAPI: Testfall-Daten
   LoadCasesAPI->>TestPage: Gruppierte Testfälle
   ```

2. **Test-Ausführung**:
   ```mermaid
   sequenceDiagram
   TestControls->>RunAPI: Starte Test
   RunAPI->>OpenAIService: Analysiere Bilder
   OpenAIService->>PlantNetAPI: Identifiziere Pflanzen
   PlantNetAPI->>OpenAIService: Pflanzendaten
   OpenAIService->>RunAPI: Habitat-Analyse
   RunAPI->>TestControls: Testergebnisse
   ```

## Integration der OpenAI-Service Logik

Um die Mock-Implementierung durch die echte Habitat-Erkennung zu ersetzen, sind folgende Schritte notwendig:

1. **Anpassung der Test-Run-Route**:
   ```typescript
   import { analyzeImageStructured } from '@/lib/services/openai-service';

   export async function POST(request: Request) {
     const { category } = await request.json();
     const results: TestResult[] = [];
     
     for (const testCase of testCases) {
       if (category && testCase.category !== category) continue;
       
       const analysisResult = await analyzeImageStructured({
         bilder: testCase.imageUrls.map(url => ({
           url,
           analyse: testCase.plants.join(', ')
         }))
       });

       results.push({
         testCaseId: testCase.id,
         success: analysisResult.result?.habitattyp === testCase.expectedHabitat,
         detectedHabitat: analysisResult.result?.habitattyp || 'unbekannt',
         expectedHabitat: testCase.expectedHabitat,
         timestamp: new Date().toISOString()
       });
     }
     
     return NextResponse.json({
       id: crypto.randomUUID(),
       timestamp: new Date().toISOString(),
       results,
       successRate: (results.filter(r => r.success).length / results.length) * 100,
       algorithmVersion: '1.0.0'
     });
   }
   ```

2. **Erweiterung der TestResult-Schnittstelle**:
   ```typescript
   interface TestResult {
     testCaseId: string;
     success: boolean;
     detectedHabitat: string;
     expectedHabitat: string;
     timestamp: string;
     confidence?: number;
     analysis?: {
       standort: any;
       vegetationsstruktur: any;
       blühaspekte: any;
       nutzung: any;
     };
   }
   ```

## Konfiguration und Umgebungsvariablen

Erforderliche Umgebungsvariablen:
- `OPENAI_API_KEY`: Für Vision-Modell
- `PLANTNET_API_KEY`: Für Pflanzenidentifikation
- `HABITAT_TEST_IMAGES_PATH`: Pfad zu Testbildern

## Nächste Schritte

1. Integration der OpenAI-Service Logik in die Test-Run-Route
2. Implementierung der Fortschrittsanzeige während der Tests
3. Erweiterung der Testfall-Anzeige um detaillierte Analyseergebnisse
4. Hinzufügen von Konfidenzwerten und Analyseparametern zur Testauswertung 