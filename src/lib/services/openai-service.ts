import OpenAI from 'openai';
import { z } from "zod";
import { openAiResult, AnalyseErgebnis, NatureScoutData, SimplifiedSchema } from '@/types/nature-scout';
import { serverConfig } from '../config';
import { zodResponseFormat } from "openai/helpers/zod";
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { getAllHabitatTypes, HabitatType } from './habitat-service';
import { getAnalysisSchema, getPrompt } from './analysis-config-service';

const openai = new OpenAI({
    apiKey: serverConfig.OPENAI_API_KEY
});

const llmSystemInstruction = `
Du bist ein erfahrener Vegetationsökologe und sollst bei der Habitatanalyse unterstützen. 
Deine Aufgabe ist es, den Habitattyp basierend auf den Bildern und den angegebenen Pflanzenarten zu bestimmen.
WICHTIG: 
- Berücksichtige die angegebenen Pflanzenarten als wichtige Indikatoren
- Analysiere die Vegetationsstruktur und -zusammensetzung
- Beachte die Standortmerkmale wie Hangneigung und Exposition
- Gib NUR den Habitattyp zurück, der am besten zu den Beobachtungen passt
- Wenn du dir nicht sicher bist, gib "unbekannt" zurück
`.trim();

async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString('base64');
    
    return base64String;
  } catch (error) {
    console.error('❌ Fehler beim Laden der URL:', url, error);
    throw error;
  }
}

function convertZodSchemaToSimpleDoc(schema: z.ZodObject<z.ZodRawShape>): SimplifiedSchema {
  const shape = schema.shape;
  
  if (!shape.analyses || !(shape.analyses instanceof z.ZodArray)) {
    throw new Error('Schema muss ein analyses Array enthalten');
  }
  
  const analysesShape = shape.analyses.element.shape;
  const simplifiedDoc: SimplifiedSchema = {};

  for (const [key, value] of Object.entries(analysesShape)) {
    if (value instanceof z.ZodObject) {
      const nestedDoc: { [key: string]: string } = {};
      
      const objectDescription = getZodDescription(value);
      if (objectDescription) {
        nestedDoc['description'] = objectDescription;
      }
      
      for (const [nestedKey, nestedValue] of Object.entries(value.shape)) {
        const description = getZodDescription(nestedValue as z.ZodTypeAny);
        if (description) {
          nestedDoc[nestedKey] = description;
        }
      }
      
      if (Object.keys(nestedDoc).length > 0) {
        simplifiedDoc[key] = nestedDoc;
      }
    } else if (value instanceof z.ZodArray) {
      if (value.element instanceof z.ZodObject) {
        const arrayItemDoc: { [key: string]: string } = {};
        
        const arrayDescription = getZodDescription(value);
        if (arrayDescription) {
          arrayItemDoc['description'] = arrayDescription;
        }
        
        for (const [arrayKey, arrayValue] of Object.entries(value.element.shape)) {
          const description = getZodDescription(arrayValue as z.ZodTypeAny);
          if (description) {
            arrayItemDoc[arrayKey] = description;
          }
        }
        
        if (Object.keys(arrayItemDoc).length > 0) {
          simplifiedDoc[key] = arrayItemDoc;
        }
      } else {
        const description = getZodDescription(value);
        if (description) {
          simplifiedDoc[key] = description;
        }
      }
    } else {
      const description = getZodDescription(value as z.ZodTypeAny);
      if (description) {
        simplifiedDoc[key] = description;
      }
    }
  }

  return simplifiedDoc;
}

function getZodDescription(zodType: z.ZodType): string | undefined {
  if (zodType instanceof z.ZodOptional) {
    return getZodDescription(zodType.unwrap());
  }
  
  if (zodType instanceof z.ZodArray) {
    return zodType.description || undefined;
  }
  
  if (zodType instanceof z.ZodString ||
      zodType instanceof z.ZodNumber ||
      zodType instanceof z.ZodBoolean) {
    return zodType.description || undefined;
  }
  
  return undefined;
}

async function createHabitatAnalyseSchema(
  analysisSchema: { schema: Record<string, string | unknown> }, 
  habitatTypes: HabitatType[]
): Promise<z.ZodObject<z.ZodRawShape>> {
  // Erstelle eine formatierte Beschreibung der Habitat-Typen
  const habitatTypeDesc = habitatTypes
    .map(ht => `\n'${ht.name}'${ht.typicalSpecies.length > 0 ? ` bei typischen Arten wie ${ht.typicalSpecies.join(', ')}` : ''}`)
    .join('\n');

  console.log('Verwende Habitat-Typen für Schema:', {
    count: habitatTypes.length,
    description: habitatTypeDesc.substring(0, 100) + '...'
  });
  
  return z.object({
    analyses: z.array(
      z.object({
        pflanzenarten: z.array(
          z.object({
            name: z.string()
              .describe(String(analysisSchema.schema.pflanzenarten_name)),
            häufigkeit: z.string()
              .describe(String(analysisSchema.schema.pflanzenarten_häufigkeit)),
            istzeiger: z.boolean()
              .describe(String(analysisSchema.schema.pflanzenarten_istzeiger)),
          })
        ).describe(String(analysisSchema.schema.pflanzenarten)),
        vegetationsstruktur: z.object({
          höhe: z.string()
            .describe(String(analysisSchema.schema.vegetationsstruktur_höhe)),
          dichte: z.string()
            .describe(String(analysisSchema.schema.vegetationsstruktur_dichte)),
          deckung: z.string()
            .describe(String(analysisSchema.schema.vegetationsstruktur_deckung)),
        }).describe(String(analysisSchema.schema.vegetationsstruktur)),
        blühaspekte: z.object({
          intensität: z.string()
            .describe(String(analysisSchema.schema.blühaspekte_intensität)),
          anzahlfarben: z.number()
            .describe(String(analysisSchema.schema.blühaspekte_anzahlfarben)),
        }).describe(String(analysisSchema.schema.blühaspekte)),
        nutzung: z.object({
          beweidung: z.string()
            .describe(String(analysisSchema.schema.nutzung_beweidung)),
          mahd: z.string()
            .describe(String(analysisSchema.schema.nutzung_mahd)),
          düngung: z.string()
            .describe(String(analysisSchema.schema.nutzung_düngung)),
        }).describe(String(analysisSchema.schema.nutzung)),
        bewertung: z.object({
          artenreichtum: z.number()
            .describe(String(analysisSchema.schema.bewertung_artenreichtum)),
          konfidenz: z.number()
            .describe(String(analysisSchema.schema.bewertung_konfidenz)),
        }).describe(String(analysisSchema.schema.bewertung)),
        habitattyp: z.string()
          .describe(String(analysisSchema.schema.habitattyp).replace('{habitattypen}', habitatTypeDesc)),
        evidenz: z.object({
          dafür_spricht: z.string()
            .describe(String(analysisSchema.schema.evidenz_dafür_spricht)),
          dagegen_spricht: z.string()
            .describe(String(analysisSchema.schema.evidenz_dagegen_spricht)),
        }).describe(String(analysisSchema.schema.evidenz)),
        zusammenfassung: z.string()
          .describe(String(analysisSchema.schema.zusammenfassung))
      })
    ),
  });
}

export async function analyzeImageStructured(metadata: NatureScoutData): Promise<openAiResult> {
  try {
    const habitatTypes = await getAllHabitatTypes();

    // Schritt 1: Habitat-Analyse
    const habitatAnalyse = await performHabitatAnalysis(metadata, habitatTypes);
    if (!habitatAnalyse.result) return habitatAnalyse;


    return {
      result: habitatAnalyse.result,
      llmInfo: habitatAnalyse.llmInfo
    };
  } catch (error: Error | unknown) {
    console.error('Fehler bei der Analyse:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return {
      result: null,
      error: `Die Analyse ist fehlgeschlagen: ${errorMessage}`
    };
  }
}

async function getImageContents(metadata: NatureScoutData) {
  //console.log('🔄 Starte Bildanalyse für URLs:', metadata.bilder);
        
  const imageBase64Contents = await Promise.all(
    metadata.bilder.map(bild => urlToBase64(bild.url))
  );

  // Schwarzer 1x1 Pixel als Base64
  const DUMMY_IMAGE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  const imageContents = imageBase64Contents.length ? 
    imageBase64Contents.map(base64 => ({
      type: "image_url" as const,
      image_url: {
        url: `data:image/jpeg;base64,${base64}`,
        detail: "high" as const
      }
    })) : [{
      type: "image_url" as const,
      image_url: {
        url: `data:image/png;base64,${DUMMY_IMAGE}`,
        detail: "high" as const
      }
    }];

    //console.log('✅ Bildkonvertierung abgeschlossen', {
    //  numberOfImages: imageContents.length,
    //  isDummy: imageBase64Contents.length === 0
    //});

  return imageContents;
}

// Neue Funktion zum Extrahieren der relevanten Schema-Informationen
function extractSchemaQuestions(zodSchema: z.ZodObject<z.ZodRawShape>): Record<string, any> {
  try {
    const schema = zodSchema.shape;
    if (!schema.analyses || !(schema.analyses instanceof z.ZodArray)) {
      return { error: 'Ungültiges Schema-Format' };
    }

    // Nur die Felder aus dem analyses-Array extrahieren
    const analysesElement = schema.analyses.element;
    if (!(analysesElement instanceof z.ZodObject)) {
      return { error: 'Ungültiges analyses-Element' };
    }

    const result: Record<string, any> = {};
    const analysesShape = analysesElement.shape;

    // Durch die Felder des analyses-Elements iterieren
    for (const [key, field] of Object.entries(analysesShape)) {
      if (field instanceof z.ZodObject) {
        // Für verschachtelte Objekte rekursiv verarbeiten
        const nestedFields: Record<string, any> = {};
        
        // Beschreibung des Objekts selbst
        const objectDescription = getZodDescription(field);
        if (objectDescription) {
          nestedFields.description = objectDescription;
        }
        
        // Durch die Unterfelder iterieren
        for (const [nestedKey, nestedField] of Object.entries(field.shape)) {
          if (nestedField instanceof z.ZodType) {
            const fieldInfo: Record<string, any> = {
              type: getZodTypeName(nestedField)
            };
            
            const description = getZodDescription(nestedField);
            if (description) {
              fieldInfo.description = description;
            }
            
            nestedFields[nestedKey] = fieldInfo;
          }
        }
        
        result[key] = nestedFields;
      } else if (field instanceof z.ZodArray) {
        // Arrays verarbeiten
        const arrayInfo: Record<string, any> = {
          type: 'array',
        };
        
        const description = getZodDescription(field);
        if (description) {
          arrayInfo.description = description;
        }
        
        // Element-Typ des Arrays
        if (field.element instanceof z.ZodObject) {
          const elementShape: Record<string, any> = {};
          
          for (const [elementKey, elementField] of Object.entries(field.element.shape)) {
            if (elementField instanceof z.ZodType) {
              const fieldInfo: Record<string, any> = {
                type: getZodTypeName(elementField)
              };
              
              const elementDesc = getZodDescription(elementField);
              if (elementDesc) {
                fieldInfo.description = elementDesc;
              }
              
              elementShape[elementKey] = fieldInfo;
            }
          }
          
          arrayInfo.items = elementShape;
        }
        
        result[key] = arrayInfo;
      } else if (field instanceof z.ZodType) {
        // Einfache Typen verarbeiten
        const fieldInfo: Record<string, any> = {
          type: getZodTypeName(field)
        };
        
        const description = getZodDescription(field);
        if (description) {
          fieldInfo.description = description;
        }
        
        result[key] = fieldInfo;
      }
    }
    
    return { analyses: result };
  } catch (error) {
    console.error('Fehler beim Extrahieren der Schema-Informationen:', error);
    return { error: 'Fehler beim Extrahieren der Schema-Informationen' };
  }
}

// Hilfsfunktion für die Ermittlung des lesbaren Typnamens
function getZodTypeName(zodType: z.ZodType): string {
  if (zodType instanceof z.ZodString) return 'string';
  if (zodType instanceof z.ZodNumber) return 'number';
  if (zodType instanceof z.ZodBoolean) return 'boolean';
  if (zodType instanceof z.ZodArray) return 'array';
  if (zodType instanceof z.ZodObject) return 'object';
  if (zodType instanceof z.ZodOptional) {
    return `${getZodTypeName(zodType.unwrap())} (optional)`;
  }
  return 'unknown';
}

async function performHabitatAnalysis(metadata: NatureScoutData, habitatTypes: HabitatType[]): Promise<openAiResult> {
  try {
    const analysisSchema = await getAnalysisSchema('habitat-analysis');
    const prompt = await getPrompt('habitat-analysis');
    
    if (!analysisSchema || !prompt) {
      throw new Error('Analyse-Konfigurationen nicht gefunden');
    }

    if (!habitatTypes || habitatTypes.length === 0) {
      throw new Error('Keine Habitat-Typen in der Datenbank gefunden');
    }

    const imageContents = await getImageContents(metadata);
    const pflanzenarten = metadata.bilder
      .filter(bild => bild.analyse && bild.analyse.trim() !== '')
      .map(bild => bild.analyse)
      .join(', ');
    
    // Erstelle das Zod-Schema mit Beschreibungen aus der Datenbank und den Habitat-Typen
    const habitatAnalyseSchema = await createHabitatAnalyseSchema(
      { schema: analysisSchema.schema as Record<string, string | unknown> }, 
      habitatTypes
    );

    const randomId = Math.floor(Math.random() * 9000000000) + 1000000000;

    // Erstelle die Standortparameter aus den Metadaten
    const standortParameter = [
      metadata.gemeinde && `Gemeinde: ${metadata.gemeinde}`,
      metadata.elevation && `Höhe über dem Meer: ${metadata.elevation}`,
      metadata.exposition && `Exposition: ${metadata.exposition}`,
      metadata.slope && `Hangneigung: ${metadata.slope}`,
      metadata.plotsize && `Fläche: ${metadata.plotsize} m²`,
      metadata.latitude && metadata.longitude && `Koordinaten: ${metadata.latitude}°N, ${metadata.longitude}°E`
    ].filter(Boolean).join('\n');

    // Erstelle die Analyse-Frage mit den Platzhaltern aus dem Template
    const llmQuestion = prompt.analysisPrompt
      .replace('{randomId}', randomId.toString())
      .replace('{pflanzenarten}', pflanzenarten)
      .replace('{standortparameter}', standortParameter)
      .replace('{kommentar}', metadata.kommentar ? `Beachte bitte folgende zusätzliche Hinweise: ${metadata.kommentar}` : '');

    const messages: ChatCompletionMessageParam[] = [{ 
      role: "system", 
      content: prompt.systemInstruction
    },
    {
      role: "user",
      content: [
        { 
          type: "text", 
          text: llmQuestion
        },
        ...imageContents
      ],
    }];

    console.log('Sende Anfrage an OpenAI mit Schema:', JSON.stringify(habitatAnalyseSchema.shape, null, 2));

    const completion = await openai.chat.completions.create({
      model: serverConfig.OPENAI_VISION_MODEL,
      messages: messages,
      temperature: 0.0,
      top_p: 0.0,
      response_format: zodResponseFormat(habitatAnalyseSchema, "structured_analysis"),
      max_tokens: 2000,
    });

    const analysisResult = completion.choices[0]?.message.content;
    if (!analysisResult) {
      throw new Error("Keine Analyse verfügbar");
    }

    console.log('Erhaltenes Analyseergebnis:', analysisResult);

    const parsedAnalysis = JSON.parse(analysisResult);
    
    if (!parsedAnalysis.analyses || !Array.isArray(parsedAnalysis.analyses) || parsedAnalysis.analyses.length === 0) {
      throw new Error("Das Analyseergebnis hat nicht das erwartete Format (analyses array fehlt oder leer)");
    }


    let parsedResult: AnalyseErgebnis = {
      ...parsedAnalysis.analyses[0],
      kommentar: metadata.kommentar
    };

    // Hole den Habitat-Typ aus der Datenbank
    const habitatType = habitatTypes.find(ht => ht.name === parsedResult?.habitattyp);
    
    // Füge den Schutzstatus aus dem Habitat-Typ hinzu
    parsedResult = {
      ...parsedResult,
      schutzstatus: habitatType?.schutzstatus || 'unbekannt'
    };


    const simplifiedSchema = convertZodSchemaToSimpleDoc(habitatAnalyseSchema);
    const readableSchema = extractSchemaQuestions(habitatAnalyseSchema);

    return { 
      result: parsedResult,
      llmInfo: {
        modelPflanzenErkennung: "PLANTNET",
        modelHabitatErkennung: serverConfig.OPENAI_VISION_MODEL,
        systemInstruction: prompt.systemInstruction,
        hapitatQuestion: llmQuestion,
        habitatStructuredOutput: simplifiedSchema,
        fullSchemaStructure: readableSchema
      }
    };
  } catch (error) {
    console.error('Fehler bei der Habitat-Analyse:', error);
    return { 
      result: null, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
