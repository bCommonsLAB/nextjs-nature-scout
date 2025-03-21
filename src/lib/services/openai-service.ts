import OpenAI from 'openai';
import { z } from "zod";
import { openAiResult, AnalyseErgebnis, NatureScoutData, SimplifiedSchema } from '@/types/nature-scout';
import { serverConfig } from '../config';
import { zodResponseFormat } from "openai/helpers/zod";
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { getHabitatTypeDescription } from './habitat-service';
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
    //console.log('🔄 Lade Bild:', url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString('base64');
    
    //console.log('✅ Base64 Konvertierung erfolgreich', {
    //  originalUrl: url,
    //  base64Length: base64String.length
    //});
    
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

function getZodDescription(zodType: z.ZodTypeAny): string | undefined {
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

async function createHabitatAnalyseSchema(analysisSchema: any): Promise<z.ZodObject<any, any>> {
  const habitatTypeDesc = await getHabitatTypeDescription();
  
  return z.object({
    analyses: z.array(
      z.object({
        standort: z.object({
          hangneigung: z.string()
            .describe(analysisSchema.schema.standort_hangneigung),
          exposition: z.string()
            .describe(analysisSchema.schema.standort_exposition),
          bodenfeuchtigkeit: z.string()
            .describe(analysisSchema.schema.standort_bodenfeuchtigkeit)
        }),
        pflanzenarten: z.array(
          z.object({
            name: z.string()
              .describe(analysisSchema.schema.pflanzenarten_name),
            häufigkeit: z.string()
              .describe(analysisSchema.schema.pflanzenarten_häufigkeit),
            istzeiger: z.boolean()
              .describe(analysisSchema.schema.pflanzenarten_istzeiger)
          })
        ).describe(analysisSchema.schema.pflanzenarten),
        vegetationsstruktur: z.object({
          höhe: z.string()
            .describe(analysisSchema.schema.vegetationsstruktur_höhe),
          dichte: z.string()
            .describe(analysisSchema.schema.vegetationsstruktur_dichte),
          deckung: z.string()
            .describe(analysisSchema.schema.vegetationsstruktur_deckung)
        }).describe(analysisSchema.schema.vegetationsstruktur),
        blühaspekte: z.object({
          intensität: z.string()
            .describe(analysisSchema.schema.blühaspekte_intensität),
          anzahlfarben: z.number()
            .int()
            .describe(analysisSchema.schema.blühaspekte_anzahlfarben)
        }).describe(analysisSchema.schema.blühaspekte),
        nutzung: z.object({
          beweidung: z.boolean()
            .describe(analysisSchema.schema.nutzung_beweidung),
          mahd: z.boolean()
            .describe(analysisSchema.schema.nutzung_mahd),
          düngung: z.boolean()
            .describe(analysisSchema.schema.nutzung_düngung)
        }).describe(analysisSchema.schema.nutzung),
        bewertung: z.object({
          artenreichtum: z.number()
            .int()
            .describe(analysisSchema.schema.bewertung_artenreichtum),
          konfidenz: z.number()
            .int()
            .describe(analysisSchema.schema.bewertung_konfidenz)
        }).describe(analysisSchema.schema.bewertung),
        habitattyp: z.string()
          .describe(habitatTypeDesc),
        evidenz: z.object({
          dafür_spricht: z.array(z.string())
            .describe(analysisSchema.schema.evidenz_dafür_spricht),
          dagegen_spricht: z.array(z.string())
            .describe(analysisSchema.schema.evidenz_dagegen_spricht)
        }).describe(analysisSchema.schema.evidenz),
        zusammenfassung: z.string()
          .describe(analysisSchema.schema.zusammenfassung),
        schutzstatus: z.string()
          .describe(analysisSchema.schema.schutzstatus)
      })
    )
  });
}

export async function analyzeImageStructured(metadata: NatureScoutData): Promise<openAiResult> {
  try {
    // Schritt 1: Habitat-Analyse
    const habitatAnalyse = await performHabitatAnalysis(metadata);
    if (!habitatAnalyse.result) return habitatAnalyse;

    //console.log("habitatAnalyse", habitatAnalyse);

    // Schritt 2: Schutzstatus-Analyse
    const schutzStatusAnalyse = await performSchutzStatusAnalysis(habitatAnalyse.result);
    if (!schutzStatusAnalyse.result) return schutzStatusAnalyse;

    //console.log("schutzStatusAnalyse", schutzStatusAnalyse);

    // Kombiniere die Ergebnisse
    return {
      result: {
        ...habitatAnalyse.result,
        ...schutzStatusAnalyse.result,
      },
      llmInfo: {
        ...habitatAnalyse.llmInfo,
        ...schutzStatusAnalyse.llmInfo,
      }
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

async function performHabitatAnalysis(metadata: NatureScoutData) : Promise<openAiResult> {
  try {
    const analysisSchema = await getAnalysisSchema('habitat-analysis');
    const prompt = await getPrompt('habitat-analysis');
    
    if (!analysisSchema || !prompt) {
      throw new Error('Analyse-Konfigurationen nicht gefunden');
    }

    const imageContents = await getImageContents(metadata);
    const pflanzenarten = metadata.bilder
      .filter(bild => bild.analyse && bild.analyse.trim() !== '')
      .map(bild => bild.analyse)
      .join(', ');
    
    // Erstelle das Zod-Schema mit Beschreibungen aus der Datenbank
    const habitatAnalyseSchema = await createHabitatAnalyseSchema(analysisSchema);

    const randomId = Math.floor(Math.random() * 9000000000) + 1000000000;

    // Erstelle die Analyse-Frage mit den Platzhaltern aus dem Template
    const llmQuestion = prompt.analysisPrompt
      .replace('{randomId}', randomId.toString())
      .replace('{pflanzenarten}', pflanzenarten)
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

    const parsedResult: AnalyseErgebnis = {
      ...parsedAnalysis.analyses[0],
      kommentar: metadata.kommentar
    };

    const simplifiedSchema = convertZodSchemaToSimpleDoc(habitatAnalyseSchema);

    return { 
      result: parsedResult,
      llmInfo: {
        modelPflanzenErkennung: "PLANTNET",
        modelHabitatErkennung: serverConfig.OPENAI_VISION_MODEL,
        systemInstruction: prompt.systemInstruction,
        hapitatQuestion: llmQuestion,
        habitatStructuredOutput: simplifiedSchema
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

async function performSchutzStatusAnalysis(habitatAnalyse: AnalyseErgebnis) : Promise<openAiResult> {
  try {
    // Lade Konfigurationen aus der Datenbank
    const analysisSchema = await getAnalysisSchema('habitat-analysis');
    const prompt = await getPrompt('schutzstatus-analysis');
    
    if (!analysisSchema || !prompt) {
      throw new Error('Schutzstatus-Konfigurationen nicht gefunden');
    }

    console.log('Geladenes Habitat-Schema für Schutzstatus:', analysisSchema);

    const schutzstatusSchema = z.object({
      analyses: z.array(z.object({
        schutzstatus: z.string()
          .describe(analysisSchema.schema.schutzstatus)
      }))
    });
    
    const randomId = Math.floor(Math.random() * 9000000000) + 1000000000;
    const llmQuestion = prompt.analysisPrompt
      .replace('{randomId}', randomId.toString())
      .replace('{habitattyp}', habitatAnalyse.habitattyp);

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
        }
      ],
    }];

    console.log('Sende Schutzstatus-Anfrage an OpenAI');

    const completion = await openai.chat.completions.create({
      model: serverConfig.OPENAI_CHAT_MODEL,
      messages: messages,
      temperature: 0.1,
      top_p: 0.1,
      response_format: zodResponseFormat(schutzstatusSchema, "structured_analysis"),
      max_tokens: 500,
    });

    const analysisResult = completion.choices[0]?.message.content;
    if (!analysisResult) {
      throw new Error("Keine Schutzstatus-Analyse verfügbar");
    }

    console.log('Erhaltenes Schutzstatus-Ergebnis:', analysisResult);

    const parsedAnalysis = JSON.parse(analysisResult);
    
    if (!parsedAnalysis.analyses || !Array.isArray(parsedAnalysis.analyses) || parsedAnalysis.analyses.length === 0) {
      throw new Error("Das Schutzstatus-Ergebnis hat nicht das erwartete Format (analyses array fehlt oder leer)");
    }

    const parsedResult: AnalyseErgebnis = {
      ...parsedAnalysis.analyses[0]
    };

    const simplifiedSchema = convertZodSchemaToSimpleDoc(schutzstatusSchema);

    return { 
      result: parsedResult,
      llmInfo: {
        modelSchutzstatusErkennung: serverConfig.OPENAI_CHAT_MODEL,
        systemInstruction: prompt.systemInstruction,
        schutzstatusQuestion: llmQuestion,
        schutzstatusStructuredOutput: simplifiedSchema
      }
    };
  } catch (error) {
    console.error('Fehler bei der Schutzstatus-Analyse:', error);
    return { 
      result: null, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
