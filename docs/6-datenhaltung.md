# Datenhaltung und Architektur

## Überblick der Architektur

Die NatureScout-Anwendung folgt einer Drei-Schichten-Architektur, bestehend aus:

1. **Frontend-Layer** (Präsentationsschicht)
2. **Logic-Layer** (Geschäftslogikschicht)
3. **Data-Layer** (Datenhaltungsschicht)

Diese Trennung ermöglicht eine klare Abgrenzung der Zuständigkeiten und verbessert die Wartbarkeit und Skalierbarkeit der Anwendung.

![Architektur-Überblick](../public/screenshots/architecture.jpg)

## Data-Layer

Der Data-Layer ist für die persistente Speicherung aller Anwendungsdaten verantwortlich.

### Tatsächliche MongoDB-Collections

Die Hauptdatenbank der Anwendung ist MongoDB. Basierend auf der aktuellen Implementierung werden folgende Collections verwendet:

#### 1. `analyseJobs`

Speichert die KI-Analyseprozesse und deren Ergebnisse:

```typescript
// Definiert in src/types/nature-scout.ts
export interface AnalysisJob {
  _id: ObjectId;
  jobId: string;
  status: 'pending' | 'completed' | 'failed';
  metadata: NatureScoutData;
  result?: AnalyseErgebnis | null;
  llmInfo?: llmInfo;
  error?: string | null;
  startTime: Date;
  updatedAt: Date;
}
```

Diese Collection wird in `analysis-service.ts` verwendet und der Name wird über die Umgebungsvariable `MONGODB_COLLECTION_NAME` konfiguriert (standardmäßig auf "analyseJobs" gesetzt).

```typescript
// src/lib/services/analysis-service.ts
const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
```

#### 2. `habitatTypes`

Speichert die verfügbaren Habitattypen und deren Metadaten:

```typescript
// Definiert in src/lib/services/habitat-service.ts
export interface HabitatType {
  _id?: ObjectId;
  name: string;
  description: string;
  typicalSpecies: string[];
}
```

Die Collection wird mit Standardwerten initialisiert und bietet CRUD-Operationen:

```typescript
// src/lib/services/habitat-service.ts
export async function initializeHabitatTypes(): Promise<void> {
  const db = await connectToDatabase();
  const collection = db.collection('habitatTypes');
  
  // Prüfe ob bereits Habitattypen existieren
  const count = await collection.countDocuments();
  if (count > 0) return;
  
  // Initial-Daten für Habitattypen
  const habitatTypes: HabitatType[] = [
    // Liste mit etwa 20 vordefinierten Habitattypen
    // ...
  ];
  
  await collection.insertMany(habitatTypes);
}
```

#### 3. `habitatAnalysisSchemas`

Speichert Konfigurationen für die Habitatanalyse:

```typescript
// Definiert in src/lib/services/analysis-config-service.ts
export interface AnalysisSchema {
  _id?: ObjectId;
  name: string;
  version: string;
  description: string;
  schema: Record<string, any>;  // Das Zod-Schema als JSON
  createdAt: Date;
  updatedAt: Date;
}
```

Diese Collection enthält strukturierte Analyseschemata, die definieren, wie die KI die Habitate analysieren soll.

#### 4. `prompts`

Speichert die Prompts für die KI-Analyse:

```typescript
// Definiert in src/lib/services/analysis-config-service.ts
export interface Prompt {
  _id?: ObjectId;
  name: string;
  version: string;
  description: string;
  systemInstruction: string;
  analysisPrompt: string;
  createdAt: Date;
  updatedAt: Date;
}
```

Diese Collection wird verwendet, um die System-Instruktionen und Prompts für die OpenAI API zu speichern.

#### Initialisierung der Analysekonfigurationen

Die Collections `habitatAnalysisSchemas` und `prompts` werden über eine `initializeAnalysisConfigs`-Funktion initialisiert:

```typescript
// src/lib/services/analysis-config-service.ts
export async function initializeAnalysisConfigs(): Promise<void> {
  const db = await connectToDatabase();
  const habitatSchemaCollection = db.collection<AnalysisSchema>('habitatAnalysisSchemas');
  const promptCollection = db.collection<Prompt>('prompts');

  // Prüfe ob bereits Konfigurationen existieren
  const habitatSchemaCount = await habitatSchemaCollection.countDocuments();
  const promptCount = await promptCollection.countDocuments();
  
  if (habitatSchemaCount > 0 && promptCount > 0) {
    console.log('Konfigurationen existieren bereits');
    return;
  }

  // Initialisiere Standard-Schemas und Prompts
  // ...
}
```

### Datenmodellierung der Analyseresultate

Die Analyse-Ergebnisse werden in einem strukturierten Format gespeichert:

```typescript
// Definiert in src/types/nature-scout.ts
export interface AnalyseErgebnis {
  standort: {
    hangneigung: string;
    exposition: string;
    bodenfeuchtigkeit: string;
  };
  pflanzenarten: Array<{
    name: string;
    häufigkeit: string;
    istzeiger: boolean;
  }>;
  vegetationsstruktur: {
    höhe: string;
    dichte: string;
    deckung: string;
  };
  blühaspekte: {
    intensität: string;
    anzahlfarben: number;
  };
  nutzung: {
    beweidung: boolean;
    mahd: boolean;
    düngung: boolean;
  };
  habitattyp: string;
  schutzstatus: string;
  bewertung: {
    artenreichtum: number;
    konfidenz: number;
  };
  evidenz: {
    dafür_spricht: string[];
    dagegen_spricht: string[];
  };
  zusammenfassung: string;
  kommentar?: string;
}
```

### Bildspeicherung in Azure Blob Storage

Die Anwendung speichert Bilder in Azure Blob Storage, dem skalierbaren Objektspeicherdienst von Microsoft Azure. Die Bildreferenzen werden in MongoDB gespeichert.

#### Azure Storage-Konfiguration

```
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=ragtempproject;AccountKey=***;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=biodiv
UPLOAD_DIR=naturescout
```

#### Speicherstruktur

```
biodiv/                         # Container
  └── naturescout/              # Verzeichnis für alle NatureScout-Bilder
      ├── [bild-id-1].jpg       # Hochgeladene Bilder
      ├── [bild-id-2].jpg
      └── ...
```

#### Bildverarbeitung

1. **Upload-Prozess**:
   - Bilder werden zunächst temporär auf dem Server gespeichert
   - Dann zum Azure Blob Storage hochgeladen
   - Originaldateien werden gelöscht, sobald der Upload abgeschlossen ist

2. **Sicherheitsmaßnahmen**:
   - Verschlüsselung im Ruhezustand
   - Zugriffssteuerung über Azure Storage-Richtlinien
   - Signierte URLs für zeitlich begrenzten Zugriff

3. **Bild-Referenzierung**:
   In der Datenbank werden Bilder über die `Bild`-Schnittstelle referenziert:

   ```typescript
   // Definiert in src/types/nature-scout.ts
   export interface Bild {
     imageKey: string;
     filename: string;
     url: string;
     analyse: string | null;
     plantnetResult?: PlantNetResult;
   }
   ```

   Die `url`-Eigenschaft enthält den vollständigen Pfad zum Bild im Azure Blob Storage.

## Logic-Layer

Der Logic-Layer verbindet das Frontend mit dem Data-Layer und enthält die Geschäftslogik der Anwendung.

### Service-Module

Die Service-Module kapseln spezifische Funktionalitäten:

#### 1. Analysis-Service (`lib/services/analysis-service.ts`)

Verwaltet die Analyseaufträge in der `analyseJobs`-Collection:

```typescript
// Beispiel für die Erstellung eines Analysejobs
export async function createAnalysisJob(jobId: string, metadata: NatureScoutData, status: 'pending' | 'completed' | 'failed'): Promise<AnalysisJob> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');

    const jobData: AnalysisJob = {
      _id: new ObjectId(),
      jobId: jobId,
      status: status,
      metadata,
      startTime: new Date(),
      updatedAt: new Date()
    };

    await collection.insertOne(jobData);
    return jobData;
  } catch (error) {
    console.error('Fehler bei der Verbindung zur Datenbank:', error);
    throw error;
  }
}
```

#### 2. Habitat-Service (`lib/services/habitat-service.ts`)

Verwaltet die Habitattypen in der `habitatTypes`-Collection:

```typescript
// Beispiele für CRUD-Operationen
export async function getAllHabitatTypes(): Promise<HabitatType[]> {
  const db = await connectToDatabase();
  const collection = db.collection<HabitatType>('habitatTypes');
  return collection.find().toArray();
}

export async function validateHabitatType(habitatName: string): Promise<boolean> {
  const db = await connectToDatabase();
  const collection = db.collection('habitatTypes');
  const count = await collection.countDocuments({ name: habitatName });
  return count > 0;
}
```

#### 3. Analysis-Config-Service (`lib/services/analysis-config-service.ts`)

Verwaltet die Analysekonfigurationen in den Collections `habitatAnalysisSchemas` und `prompts`:

```typescript
// Beispiel für das Abrufen eines Prompts
export async function getPrompt(name: string, version?: string): Promise<Prompt | null> {
  const db = await connectToDatabase();
  const collection = db.collection<Prompt>('prompts');
  
  const query = version ? { name, version } : { name };
  return collection.findOne(query, { sort: { version: -1 } });
}
```

#### 4. Azure Storage-Service (für Bildverwaltung)

Dieser Service verwaltet das Hochladen und Abrufen von Bildern aus Azure Blob Storage:

```typescript
// Beispiel für Bildupload zu Azure Blob Storage
export async function uploadImageToAzure(file: Buffer, filename: string): Promise<string> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING || ''
  );
  const containerClient = blobServiceClient.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER_NAME || 'biodiv'
  );
  
  const blobName = `${process.env.UPLOAD_DIR || 'naturescout'}/${filename}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  await blockBlobClient.upload(file, file.length);
  
  // Generiere URL für das hochgeladene Bild
  return blockBlobClient.url;
}
```

## Frontend-Layer

Der Frontend-Layer ist für die Darstellung der Benutzeroberfläche und die Benutzerinteraktion verantwortlich.

### Hauptdatenstruktur für die Naturerfassung

```typescript
// Definiert in src/types/nature-scout.ts
export interface NatureScoutData {
  erfassungsperson: string;
  email: string;
  gemeinde: string;
  flurname: string;
  latitude: number;
  longitude: number;
  standort: string;
  bilder: Bild[];
  analyseErgebnis?: AnalyseErgebnis;
  llmInfo?: llmInfo;
  kommentar?: string;
}
```

Diese Struktur bildet die Hauptdateneinheit der Anwendung und enthält alle relevanten Informationen zu einer Naturerfassung.

## Datenfluss und Integration

### Initialisierung der Datenbanken

1. **Habitattypen**: Werden über einen `/api/init`-Endpunkt initialisiert:
   ```typescript
   // src/app/api/init/route.ts
   import { initializeHabitatTypes } from '@/lib/services/habitat-service';
   
   export async function GET() {
     await initializeHabitatTypes();
     // ...
   }
   ```

2. **Analysekonfigurationen**: Werden über denselben Endpunkt oder bei Bedarf initialisiert.

### Datenbankverbindung

Die Verbindung zur MongoDB wird über eine Hilfsfunktion hergestellt:

```typescript
// src/lib/services/db.ts
import { MongoClient, Db } from 'mongodb';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MongoDB URI ist nicht konfiguriert');
  }

  try {
    const client = await MongoClient.connect(uri);
    const db = client.db(process.env.MONGODB_DB_NAME || 'naturescout');
    
    cachedClient = client;
    cachedDb = db;
    
    return db;
  } catch (error) {
    console.error('Fehler beim Verbinden zur Datenbank:', error);
    throw error;
  }
}
```

## Konfiguration über Umgebungsvariablen

Die Anwendung verwendet folgende Umgebungsvariablen für die Datenhaltung:

```
# Datenbank-Konfiguration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=naturescout
MONGODB_COLLECTION_NAME=analyseJobs

# Azure Blob Storage Konfiguration
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=ragtempproject;AccountKey=***;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=biodiv
UPLOAD_DIR=naturescout

# API-Schlüssel
OPENAI_API_KEY=sk-...
PLANTNET_API_KEY=...
```

## Zusammenfassung der aktuellen Datenmodellierung

- **MongoDB-Collections:**
  - **analyseJobs**: Speichert Analyseprozesse und -ergebnisse
  - **habitatTypes**: Speichert verfügbare Habitattypen
  - **habitatAnalysisSchemas**: Speichert Struktur-Vorgaben für die KI-Analyse
  - **prompts**: Speichert System-Instruktionen und Prompts für die KI
  
- **Azure Blob Storage:**
  - Speichert alle hochgeladenen Bilder in der Struktur `biodiv/naturescout/[bild-id].jpg`
  - Bildreferenzen werden in der MongoDB mit URLs gespeichert

## Datenfluss zwischen den Schichten

### 1. Frontend → Logic-Layer

Die Kommunikation erfolgt über HTTP-Anfragen an die API-Routen:

```typescript
// Beispiel: Bilderkennung
const result = await fetch('/api/identify-plant', {
  method: 'POST',
  body: formData  // Enthält das Bild
});
```

### 2. Logic-Layer → Data-Layer

Der Zugriff auf die Datenbank erfolgt über MongoDB-Treiber:

```typescript
// Beispiel: Speichern eines Analysejobs
await db.collection('analysisJobs').insertOne({
  submissionId: new ObjectId(submissionId),
  startTime: new Date(),
  status: 'processing'
});
```

### 3. Logic-Layer → Externe Dienste

Die Kommunikation mit externen Diensten wird über deren APIs abgewickelt:

```typescript
// Beispiel: OpenAI API-Aufruf
const response = await openai.chat.completions.create({
  model: "gpt-4-vision-preview",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: [...imageContents] }
  ],
  max_tokens: 1000
});
```

## Datensicherheit und DSGVO-Konformität

### Sicherheitsmaßnahmen

1. **Verschlüsselung**:
   - Daten in Transit: HTTPS/TLS
   - Daten im Ruhezustand: AES-256 (MongoDB und S3)

2. **Zugriffssteuerung**:
   - Feingranulare IAM-Richtlinien für AWS-Ressourcen
   - RBAC (Role-Based Access Control) für MongoDB

3. **Datenschutz**:
   - Automatisierte Löschrichtlinien für temporäre Daten
   - Anonymisierung von Analysedaten für Forschungszwecke

### DSGVO-Maßnahmen

1. **Benutzerrechte**:
   - Recht auf Auskunft: API-Endpunkt `/api/users/data-export`
   - Recht auf Löschung: API-Endpunkt `/api/users/data-deletion`

2. **Datenschutzerklärung**:
   - Transparente Kommunikation über Datenverarbeitung
   - Einwilligungsmanagement mit Opt-in-Mechanismen

3. **Datenspeicherdauer**:
   - Benutzerdaten: Bis zur Löschung durch den Benutzer
   - Analyseergebnisse: 12 Monate nach Erstellung
   - Audit-Logs: 24 Monate für Sicherheitszwecke

## Performance-Aspekte

### Caching-Strategien

1. **Frontend-Caching**:
   - Zwischenspeichern von Analyseergebnissen in SessionStorage
   - Service Worker für Offline-Funktionalität

2. **Backend-Caching**:
   - Redis für häufig abgerufene Daten (z.B. Habitattypen)
   - Cloudflare-Caching für statische Assets

### Datenbankoptimierung

1. **Indexierung**:
   - Indizes auf häufig abgefragte Felder wie `status`, `userId` und `timestamp`
   - Compound-Indizes für komplexe Abfragen

2. **Sharding-Strategie**:
   - Horizontale Skalierung basierend auf geografischen Regionen
   - Hash-basiertes Sharding für gleichmäßige Datenverteilung

## Fehlerbehandlung und Monitoring

### Fehlerbehandlung

1. **Frontend**:
   - Globaler Error Boundary für UI-Fehler
   - Fehlerwiederholung mit exponentiellem Backoff für API-Anfragen

2. **Backend**:
   - Strukturierte Fehlerprotokollierung mit Kontext
   - Circuit Breaker für externe API-Aufrufe

### Monitoring

1. **Anwendungsmonitoring**:
   - Sentry für Echtzeit-Fehlerüberwachung
   - New Relic für Performance-Monitoring

2. **Infrastrukturmonitoring**:
   - AWS CloudWatch für Ressourcenauslastung
   - Grafana-Dashboards für benutzerdefinierte Metriken 