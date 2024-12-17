import OpenAI from 'openai';
import { z } from "zod";
import { openAiResult, AnalyseErgebnis, NatureScoutData, SimplifiedSchema } from '@/types/nature-scout';
import { serverConfig } from '../config';
import { zodResponseFormat } from "openai/helpers/zod";
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
const openai = new OpenAI({
    apiKey: serverConfig.OPENAI_API_KEY
});

const llmSystemInstruction = `
Du bist ein erfahrener Vegetationsökologe und sollst bei der Habitatanalyse unterstützen. 
Berücksichtige die bereits bekannten Standortdaten und Pflanzenarten in deiner Analyse.
argumentiere wissenschaftlich fundiert nur auf Basis der bereitgestellten Informationen.`.trim();



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
  const imageContents = await getImageContents(metadata);
  const pflanzenarten = metadata.bilder
    .filter(bild => bild.analyse && bild.analyse.trim() !== '')
    .map(bild => bild.analyse)
    .join(', ');
  
  const habitatAnalyseSchema = z.object({
    "analyses": z.array(z.object({
      "standort": z.object({
        "hangneigung": z.string()
          .describe("Beschreibe die Hangneigung des Geländes als 'eben', 'leicht geneigt', 'steil' oder 'weis nicht', wenn du dir nicht sicher bist"),
        "exposition": z.string()
          .describe("Beschreibe die Ausrichtung des Habitats als 'Nord', 'Nordost', 'Ost', 'Südost', 'Süd', 'Südwest', 'West', 'Nordwest' oder 'weis nicht', wenn du dir nicht sicher bist"),
        "bodenfeuchtigkeit": z.string()
          .describe("Beschreibe die Feuchtigkeit des Bodens als 'trocken', 'frisch', 'feucht', 'nass' oder 'wasserzügig' oder 'weis nicht', wenn du dir nicht sicher bist"),
      }),
      "pflanzenarten": z.array(
        z.object({
          "name": z.string().describe("Name der Pflanzenart in deutscher Sprache. Wenn sie nicht genannt werden, bitte 'weis nicht' angeben."),
          "häufigkeit": z.string()
            .describe("Beschreibe die Häufigkeit der Art im Bestand als 'einzeln', 'zerstreut', 'häufig', 'dominant' oder 'weis nicht"),
          "istzeiger": z.boolean()
            .describe("Ist die Art ein wichtiger Indikator?")
        })
      ).describe("Liste der in der fragestellung genannten Pflanzenarten mit Details. Wenn sie nicht genannt werden, bitte 'weis nicht' angeben."),
      "vegetationsstruktur": z.object({
        "höhe": z.string()
          .describe("Beschreibe die Höhe des Hauptbestandes als 'kurz', 'mittel', 'hoch' oder 'weis nicht', wenn du dir nicht sicher bist"),
        "dichte": z.string()
          .describe("Beschreibe die Dichte der Vegetation als 'dünn', 'mittel', 'dicht' oder 'weis nicht', wenn du dir nicht sicher bist"),
        "deckung": z.string()
          .describe("Beschreibe die Bodendeckung der Vegetation als 'offen', 'mittel', 'geschlossen' oder 'weis nicht', wenn du dir nicht sicher bist")
      }).describe("Beschreibe die Vegetationsstruktur."),
      "blühaspekte": z.object({
        "intensität": z.string()
          .describe("Intensität der Blüte als 'keine', 'vereinzelt', 'reich' oder 'weis nicht', wenn du dir nicht sicher bist"),
        "anzahlfarben": z.number()
          .int()
          .describe("Anzahl verschiedener Blütenfarben")
      }).describe("Bitte die Blühaspekte beschreiben. Wenn nicht genau erkennbar, bitte 'weis nicht' angeben."),
      "nutzung": z.object({
        "beweidung": z.boolean()
          .describe("Beweidungsspuren vorhanden oder weis nicht, wenn du dir nicht sicher bist"),
        "mahd": z.boolean()
          .describe("Mahdspuren vorhanden oder weis nicht, wenn du dir nicht sicher bist"),
        "düngung": z.boolean()
          .describe("Düngungsspuren vorhanden oder weis nicht, wenn du dir nicht sicher bist")
      }).describe("Bitte die Nutzungsspuren beschreiben. Wenn nicht genau erkennbar, bitte 'weis nicht' angeben."),
      "bewertung": z.object({
        "artenreichtum": z.number()
          .int()
          .describe("Geschätzte Anzahl Arten pro 25m²"),
        "konfidenz": z.number()
          .int()
          .describe("Konfidenz der Habitatbestimmung in Prozent")
      }).describe("Bitte die Bewertung der ökologischen Qualität und Schutzwürdigkeit des Habitats beschreiben."),
      "habitattyp": z.string()
        .describe("Klassifiziere den wahrscheinlichsten Habitattyps nach 'Verlandungsbereich', 'Schilf', 'Röhricht', 'Großsegge', 'Hochmoor', 'Niedermoor', 'Übergangsmoor', 'Quellmoor', 'Kastenmoor', 'Auwald', 'Sumpfwald', 'Bruchwald', 'Quellbereich', 'Naturnaher Bachlauf', 'Wassergraben', 'Trockenrasen', 'Felsensteppe', 'Magerwiese', 'Magerweide', 'Fettwiese', 'Fettweide', 'Kunstrasen', 'Parkanlage', 'Ruderalfläche' oder 'sonstiges', wenn es keines dieser Habitate ist oder du dir nicht sicher bist"),
      "evidenz": z.object({
        "dafür_spricht": z.array(z.string())
          .describe("Merkmale die für die Klassifizierung sprechen"),
        "dagegen_spricht": z.array(z.string())
          .describe("Merkmale die gegen die Klassifizierung sprechen")
      }).describe("Bitte die Merkmale angeben, die für oder gegen diese Klassifizierung des Habitat sprechen."),
      "zusammenfassung": z.string()
        .describe(`Wie könnte man die Einschätzung des Habitat kurz zusammenfassen? Bitte den Satz beginnen mit 'Das Habitat ist wahrscheinlich ein...'`)
    })
    )
  });
  

  const randomId = Math.floor(Math.random() * 9000000000) + 1000000000;

  const llmQuestion = `
[ID:${randomId}]
Analysiere das hochgeladenen Gesamtbild und einige Detailbilder ` +
/*`unter Berücksichtigung der bereits bekannten:` +
`- Geokoordinaten Latitude: (${metadata.latitude}, Longitude: ${metadata.longitude}), ` +
`- Standort: ${metadata.standort} ` + */
`- bereits identifizierte Pflanzenarten: ${pflanzenarten}
` + 
`Bitte analysiere folgende Parameter:
0. Schätze die Konsistent der bereitgestellten Informationen 
1. Erfasse die Standortbedingungen und deren Einfluss auf die Vegetation
2. Wie häufig sind die erkannten Pflanzenarten im Bestand
3. Beschreibe die Vegetationsstruktur und -dynamik
4. Dokumentiere Nutzungsspuren und deren Auswirkungen
5. Leite daraus den wahrscheinlichen Habitattyp ab
${metadata.kommentar ? `Beachte bitte folgende zusätzliche Hinweise: ${metadata.kommentar}` : ''}
`.trim();


        //console.log("Question", llmQuestion);

        const messages: ChatCompletionMessageParam[] = [{ 
              role: "system", 
              content: llmSystemInstruction // Allgemeine Anweisungen für das Modell
          },
          {
              role: "user",
              content: [
                  { 
                      type: "text", 
                      text: llmQuestion // Die aktuelle Benutzerfrage
                  },
                  ...imageContents // Zusätzliche Inhalte wie Bilder                  
              ],
          }
        ];

        const completion = await openai.chat.completions.create({
            model: serverConfig.OPENAI_VISION_MODEL,
            messages: messages,
            temperature: 0.1,
            top_p: 0.1,
            response_format: zodResponseFormat(habitatAnalyseSchema, "structured_analysis"),
            max_tokens: 2000,
        });

        //const usage = completion.usage;
        //console.log("usage", usage);
        const analysisResult =  completion.choices[0]?.message.content;
        if (analysisResult) {
          //console.log("analysisResult", analysisResult);
          const parsedResult: AnalyseErgebnis = {
                ...JSON.parse(analysisResult).analyses[0],
                kommentar: metadata.kommentar
            };
            const simplifiedSchema = convertZodSchemaToSimpleDoc(habitatAnalyseSchema);

            return { 
                result: parsedResult,
                llmInfo: {
                    modelPflanzenErkennung: "PLANTNET",
                    modelHabitatErkennung: serverConfig.OPENAI_VISION_MODEL,
                    systemInstruction: llmSystemInstruction,
                    hapitatQuestion: llmQuestion,
                    habitatStructuredOutput: simplifiedSchema
                }
            };
        } else {
            return { result: null, error: "Keine Analyse verfügbar."};
        };
}

async function performSchutzStatusAnalysis(habitatAnalyse: AnalyseErgebnis) : Promise<openAiResult> {
  const schutzstatusSchema = z.object({
    "analyses": z.array(z.object({
      "schutzstatus": z.string()
      .describe(`Ist der Schutzstatus dieses Habitat ${habitatAnalyse.habitattyp} 'gesetzlich geschützt', 'ökologisch hochwertig' oder 'ökologisch niederwertig'?  

'gesetzlich geschützt': Wenn es eine Nass- und Feuchtfläche wie Verlandungsbereiche von stehenden oder langsam fließenden Gewässern, Schilfbestand, Röhrichtbestand, Großseggenbestand, Feuchtwiese, Nasswiese mit Seggen und Binsen, Moore wie Hochmoor, Niedermoor, Übergangsmoor, Quellmoor, Kastenmoor, Auwälder, Sumpfwald, Bruchwald, Quellbereiche, Naturnahe und unverbauter Bach und Flussabschnitt, Wassergraben mit Ufervegetation oder wenn es ein Trockenstandort wie Trockenrasen und Felsensteppen mit typischen Arten wie Stipa, Bothriochloa, Festuca, Astragalus onobrychis, Achillea tomentosa ist

'ökologisch hochwertig': Wenn es ein Habitat wie Magerwiese oder Magerweide ist 

'ökologisch niederwertig': Wenn es ein Habitat wie Fettwiese, Fettweide, Kunstrasen, Parkanlagen, Ruderalflächen oder sonstige Lebensräume ist`
      )
    })
    )
  });
  
  const randomId = Math.floor(Math.random() * 9000000000) + 1000000000;
  const llmQuestion = `
  [ID:${randomId}]
  Bewerte bitte den Schutzstatus des Habitats ${habitatAnalyse.habitattyp}`.trim();
  
  //console.log("SchutzStatusQuestion", llmQuestion);

  const messages: ChatCompletionMessageParam[] = [{ 
        role: "system", 
        content: llmSystemInstruction // Allgemeine Anweisungen für das Modell
    },
    {
        role: "user",
        content: [
            { 
                type: "text", 
                text: llmQuestion // Die aktuelle Benutzerfrage
            }
        ],
    }
  ];

  const completion = await openai.chat.completions.create({
      model: serverConfig.OPENAI_CHAT_MODEL,
      messages: messages,
      temperature: 0.1,
      top_p: 0.1,
      response_format: zodResponseFormat(schutzstatusSchema, "structured_analysis"),
      max_tokens: 500,
  });

  //const usage = completion.usage;
  //console.log("usage", usage);
  const analysisResult =  completion.choices[0]?.message.content;
  if (analysisResult) {
    //console.log("analysisResult", analysisResult);
    const parsedResult: AnalyseErgebnis = {
          ...JSON.parse(analysisResult).analyses[0]
      };
      const simplifiedSchema = convertZodSchemaToSimpleDoc(schutzstatusSchema);

      return { 
          result: parsedResult,
          llmInfo: {
              modelSchutzstatusErkennung: serverConfig.OPENAI_CHAT_MODEL,
              systemInstruction: llmSystemInstruction,
              schutzstatusQuestion: llmQuestion,
              schutzstatusStructuredOutput: simplifiedSchema
          }
      };
  } else {
      return { result: null, error: "Keine Analyse verfügbar."};
  };
}
