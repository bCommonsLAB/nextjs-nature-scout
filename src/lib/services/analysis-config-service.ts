import { connectToDatabase } from './db';
import { ObjectId } from 'mongodb';
import { getHabitatTypeDescription } from './habitat-service';

export interface AnalysisSchema {
  _id?: ObjectId;
  name: string;
  version: string;
  description: string;
  schema: Record<string, unknown>;  // Das Schema als JSON
  createdAt: Date;
  updatedAt: Date;
}

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

export async function initializeAnalysisConfigs(): Promise<void> {
  const db = await connectToDatabase();
  const habitatSchemaCollection = db.collection<AnalysisSchema>('habitatAnalysisSchemas');
  const promptCollection = db.collection<Prompt>('prompts');

  // Prüfe ob bereits Konfigurationen existieren
  const habitatSchemaCount = await habitatSchemaCollection.countDocuments();
  const promptCount = await promptCollection.countDocuments();
  
  if (habitatSchemaCount > 0 && promptCount > 0) {
    // Logging nur im Development
    if (process.env.NODE_ENV === 'development') {
      console.log('Konfigurationen existieren bereits:', { 
        habitatSchemaCount, 
        promptCount 
      });
    }
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('Initialisiere Konfigurationen...');
  }

  try {
    // Hole die Habitattypen-Beschreibung aus der Datenbank
    const habitatTypeDesc = await getHabitatTypeDescription();

    // Initial-Schema für die Habitat-Analyse
    const habitatAnalysisSchema: Omit<AnalysisSchema, '_id'> = {
      name: 'habitat-analysis',
      version: '1.0.0',
      description: 'Schema für die Analyse von Habitattypen',
      schema: {
        standort_hangneigung: "Beschreibe die Hangneigung des Geländes als 'eben', 'leicht geneigt', 'steil' oder 'weis nicht', wenn du dir nicht sicher bist",
        standort_exposition: "Beschreibe die Ausrichtung des Habitats als 'Nord', 'Nordost', 'Ost', 'Südost', 'Süd', 'Südwest', 'West', 'Nordwest' oder 'weis nicht', wenn du dir nicht sicher bist",
        standort_bodenfeuchtigkeit: "Beschreibe die Feuchtigkeit des Bodens als 'trocken', 'frisch', 'feucht', 'nass' oder 'wasserzügig' oder 'weis nicht', wenn du dir nicht sicher bist",
        pflanzenarten: "Liste der in der fragestellung genannten Pflanzenarten mit Details. Wenn sie nicht genannt werden, bitte 'weis nicht' angeben.",
        pflanzenarten_name: "Name der Pflanzenart in deutscher Sprache. Wenn sie nicht genannt werden, bitte 'weis nicht' angeben.",
        pflanzenarten_häufigkeit: "Beschreibe die Häufigkeit der Art im Bestand als 'einzeln', 'zerstreut', 'häufig', 'dominant' oder 'weis nicht'",
        pflanzenarten_istzeiger: "Ist die Art ein wichtiger Indikator?",
        vegetationsstruktur: "Beschreibe die Vegetationsstruktur.",
        vegetationsstruktur_höhe: "Beschreibe die Höhe des Hauptbestandes als 'kurz', 'mittel', 'hoch' oder 'weis nicht', wenn du dir nicht sicher bist",
        vegetationsstruktur_dichte: "Beschreibe die Dichte der Vegetation als 'dünn', 'mittel', 'dicht' oder 'weis nicht', wenn du dir nicht sicher bist",
        vegetationsstruktur_deckung: "Beschreibe die Bodendeckung der Vegetation als 'offen', 'mittel', 'geschlossen' oder 'weis nicht', wenn du dir nicht sicher bist",
        blühaspekte: "Bitte die Blühaspekte beschreiben. Wenn nicht genau erkennbar, bitte 'weis nicht' angeben.",
        blühaspekte_intensität: "Intensität der Blüte als 'keine', 'vereinzelt', 'reich' oder 'weis nicht', wenn du dir nicht sicher bist",
        blühaspekte_anzahlfarben: "Anzahl verschiedener Blütenfarben",
        nutzung: "Bitte die Nutzungsspuren beschreiben. Wenn nicht genau erkennbar, bitte 'weis nicht' angeben.",
        nutzung_beweidung: "Beweidungsspuren vorhanden oder weis nicht, wenn du dir nicht sicher bist",
        nutzung_mahd: "Mahdspuren vorhanden oder weis nicht, wenn du dir nicht sicher bist",
        nutzung_düngung: "Düngungsspuren vorhanden oder weis nicht, wenn du dir nicht sicher bist",
        bewertung: "Bitte die Bewertung der ökologischen Qualität und Schutzwürdigkeit des Habitats beschreiben.",
        bewertung_artenreichtum: "Geschätzte Anzahl Arten pro 25m²",
        bewertung_konfidenz: "Konfidenz der Habitatbestimmung in Prozent",
        habitattyp: `Klassifiziere den wahrscheinlichsten Habitattyp nach:\n${habitatTypeDesc}\noder 'sonstiges', wenn es keines dieser Habitate ist oder du dir nicht sicher bist`,
        evidenz: "Bitte die Merkmale angeben, die für oder gegen diese Klassifizierung des Habitat sprechen.",
        evidenz_dafür_spricht: "Merkmale die für die Klassifizierung sprechen",
        evidenz_dagegen_spricht: "Merkmale die gegen die Klassifizierung sprechen",
        zusammenfassung: "Wie könnte man die Einschätzung des Habitat kurz zusammenfassen? Bitte den Satz beginnen mit 'Das Habitat ist wahrscheinlich ein...'",
        schutzstatus: `Klassifiziere den Schutzstatus des Habitats als 'gesetzlich geschützt', 'ökologisch hochwertig' oder 'ökologisch niederwertig'.

'gesetzlich geschützt': Wenn es sich beim Habitat handelt um ein Feuchtgebiet wie Verlandungsbereich, Schilf, Röhricht, Großsegge, Moor (alle Typen), Auwald, Sumpfwald, Bruchwald, Quellbereich, Naturnaher Bachlauf, Wassergraben mit Ufervegetation und alle Trockenstandorte wie Trockenrasen, Felsensteppe.

'ökologisch hochwertig': Wenn es sich beim Habitat handelt um eine extensiv bewirtschaftete Grünlandfläche wie Magerwiese, Magerweide.

'ökologisch niederwertig': Wenn es sich beim Habitat handelt um eine intensiv genutzte oder anthropogen stark veränderte Flächen wie Fettwiese, Fettweide, Kunstrasen, Parkanlage, Ruderalfläche, sonstige Lebensräume.`
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Speichere nur das Schema
    await habitatSchemaCollection.insertOne(habitatAnalysisSchema);
    console.log('Habitat-Analysis Schema gespeichert');

  } catch (error) {
    console.error('Fehler beim Speichern der Konfigurationen:', error);
    throw error;
  }
}

export async function getAnalysisSchema(name: string, version?: string): Promise<AnalysisSchema | null> {
  const db = await connectToDatabase();
  const collection = db.collection<AnalysisSchema>('habitatAnalysisSchemas');
  
  const query = version ? { name, version } : { name };
  return collection.findOne(query, { sort: { version: -1 } });
}

export async function getPrompt(name: string, version?: string): Promise<Prompt | null> {
  const db = await connectToDatabase();
  const collection = db.collection<Prompt>('prompts');
  
  const query = version ? { name, version } : { name };
  return collection.findOne(query, { sort: { version: -1 } });
}

// CRUD-Funktionen für Schemata
export async function createAnalysisSchema(schema: Omit<AnalysisSchema, '_id'>): Promise<AnalysisSchema> {
  const db = await connectToDatabase();
  const collection = db.collection<AnalysisSchema>('habitatAnalysisSchemas');
  
  const result = await collection.insertOne({
    ...schema,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return {
    _id: result.insertedId,
    ...schema
  };
}

export async function updateAnalysisSchema(id: string | undefined, updates: Partial<AnalysisSchema>): Promise<AnalysisSchema | null> {
  const db = await connectToDatabase();
  const collection = db.collection<AnalysisSchema>('habitatAnalysisSchemas');
  
  // Entferne _id aus den Updates
  const { _id, ...updateData } = updates;
  
  // Wenn keine ID vorhanden ist, suche nach dem Namen
  const query = id 
    ? { _id: new ObjectId(id) }
    : { name: updates.name };

  const result = await collection.findOneAndUpdate(
    query,
    { 
      $set: {
        ...updateData,
        updatedAt: new Date()
      }
    },
    { 
      returnDocument: 'after',
      upsert: true // Erstelle ein neues Dokument, wenn keines gefunden wurde
    }
  );

  return result;
}

// CRUD-Funktionen für Prompts
export async function createPrompt(prompt: Omit<Prompt, '_id'>): Promise<Prompt> {
  const db = await connectToDatabase();
  const collection = db.collection<Prompt>('prompts');
  
  const result = await collection.insertOne({
    ...prompt,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return {
    _id: result.insertedId,
    ...prompt
  };
}

export async function updatePrompt(id: string | undefined, updates: Partial<Prompt>): Promise<Prompt | null> {
  const db = await connectToDatabase();
  const collection = db.collection<Prompt>('prompts');
  
  // Entferne _id aus den Updates
  const { _id, ...updateData } = updates;
  
  // Wenn keine ID vorhanden ist, suche nach dem Namen
  const query = id 
    ? { _id: new ObjectId(id) }
    : { name: updates.name };

  const result = await collection.findOneAndUpdate(
    query,
    { 
      $set: {
        ...updateData,
        updatedAt: new Date()
      }
    },
    { 
      returnDocument: 'after',
      upsert: true // Erstelle ein neues Dokument, wenn keines gefunden wurde
    }
  );

  return result;
} 