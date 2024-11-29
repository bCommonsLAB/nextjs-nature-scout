import OpenAI from 'openai';
import { z } from "zod";
import { openAiResult, AnalyseErgebnis, NatureScoutData } from '@/types/nature-scout';
import { serverConfig } from '../config';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { zodResponseFormat } from "openai/helpers/zod";
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
const openai = new OpenAI({
    apiKey: serverConfig.OPENAI_API_KEY
});

async function urlToBase64(url: string): Promise<string> {
  try {
    console.log('🔄 Lade Bild:', url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString('base64');
    
    console.log('✅ Base64 Konvertierung erfolgreich', {
      originalUrl: url,
      base64Length: base64String.length,
      isValidBase64: /^[A-Za-z0-9+/=]+$/.test(base64String)
    });
    
    return base64String;
  } catch (error) {
    console.error('❌ Fehler beim Laden der URL:', url, error);
    throw error;
  }
}

export async function analyzeImageStructured(metadata: NatureScoutData): Promise<openAiResult> {
    /*
    const zSchema = z.object({
        "analyses": z.array(z.object({
            "Pflanzen-Arten": z.array(z.string()).describe("Liste der erkannten Pflanzenarten"),
            "Vegetationshöhe": z.string().describe("Die Höhe der Vegetation: Kurz (<10cm) - Mittel (10-30cm) - Hoch (>30cm)"),
            "Vegetationsdichte": z.string().describe("Die Dichte der Vegetation: Dünn - Mittel - Dicht"),
            "Vegetationsstruktur": z.string().describe("Die Struktur der Vegetation: Offen (Bestand lücken aufweist - man sieht den Erdboden) - Mittel - Dicht(Bestand ist dicht und man sieht den Erdboden nicht)"),
            "Blühintensität": z.string().describe("Keine Blüten - Wenige Blüten - Viele Blüten"),
            "Habitat": z.string().describe("Ist es eines der folgenden Habitate? Entweder Magerwiese, Trockenrasen, Fettwiese, Magerweide, Fettweide, Niedermoor, Hochmoor, keines dieser Habitate?"),
            "Pros": z.string().optional().describe("Besondere Merkmale, die für dieses erkannte Habitat sprechen"),
            "Cons": z.string().optional().describe("Besondere Merkmale, die eher für einen anderen Habitat sprechen"),
            "Wahrscheinlichkeit": z.number().describe("Die Wahrscheinlichkeit, dass das Habitat richtig erkannt wurde")
          }))
    });
    */
    const zSchema = z.object({
      "analyses": z.array(z.object({
        "standort": z.object({
          "hangneigung": z.string()
            .describe("Beschreibe die Hangneigung des Geländes als 'eben', 'leicht geneigt', 'steil' oder 'weis nicht', wenn du dir nicht sicher bist"),
          "exposition": z.string()
            .describe("Beschreibe die Ausrichtung des Habitats als 'Nord', 'Nordost', 'Ost', 'Südost', 'Süd', 'Südwest', 'West', 'Nordwest' oder 'weis nicht', wenn du dir nicht sicher bist"),
          "bodenfeuchtigkeit": z.string()
            .describe("Beschreibe die Feuchtigkeit des Bodens als 'trocken', 'frisch', 'feucht', 'nass' oder 'wasserzügig' oder 'weis nicht', wenn du dir nicht sicher bist"),
        }),/*
        "pflanzenArten": z.array(
          z.object({
            "name": z.string().describe("Name der Pflanzenart in deutscher Sprache"),
            "häufigkeit": z.string()
              .describe("Beschreibe die Häufigkeit der Art im Bestand als 'einzeln', 'zerstreut', 'häufig' oder 'dominant'"),
            "istZeiger": z.boolean().optional()
              .describe("Ist die Art ein wichtiger Indikator?")
          })
        ).describe("Liste der erkannten Pflanzenarten mit Details, bitte nur die Arten auflisten, die in der Fragestellung genannt wurden."),*/
        "Vegetationsstruktur": z.object({
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
          "anzahlFarben": z.number()
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
        "habitatTyp": z.string()
          .describe("Klassifizierung des Habitattyps nach 'Magerwiese', 'Trockenrasen', 'Fettwiese', 'Magerweide', 'Fettweide', 'Niedermoor', 'Hochmoor', 'Rasen' oder 'sonstiges', wenn es keines dieser Habitate ist oder du dir nicht sicher bist"),
        "schutzstatus": z.object({
          "gesetzlich": z.number()
            .int()
            .describe("Mit welcher Wahrscheinlichkeit in Prozent ist es ein Habitat, der im Naturschutzgesetz angeführt ist - Nass- und Feuchtflächen:Verlandungsbereiche von stehenden oder langsam fließenden Gewässern, Schilf-, Röhricht- und Großseggenbestände, Feucht- und Nasswiesen mit Seggen und Binsen, Moore, Auwälder, Sumpf- und Bruchwälder, Quellbereiche, Naturnahe und unverbaute Bach- und Flussabschnitte sowie Wassergräben inklusive der Ufervegetation. Bei Trockenstandorte: Trockenrasen, Felsensteppen, Lehmbrüche?"),
          "hochwertig": z.number()
            .int()
            .describe("Mit welcher Wahrscheinlichkeit in Prozent ist es ein ökologisch hochwertige Lebensraum, der nicht vom Gesetz erfasst ist: Magerwiese, Magerweide, Trockenrasen, Felsensteppen, Lehmbrüche?"),
          "standard": z.number()
            .int()
            .describe("Mit Welcher Wahrscheinlichkeit in Prozent ist es ein ökologisch nicht hochwertige Lebensraum, wie Fettwiese, Fettweide, Kunstrasen aller Art, Parkanlagen, Ruderalflächen, u. a. Standardlebensraum?")
        }),
        "bewertung": z.object({
          "artenreichtum": z.number()
            .int()
            .describe("Geschätzte Anzahl Arten pro 25m²"),
          "konfidenz": z.number()
            .int()
            .describe("Konfidenz der Habitatbestimmung in Prozent")
        }).describe("Bitte die Bewertung der ökologischen Qualität und Schutzwürdigkeit des Habitats beschreiben."),
        "glaubwürdigkeit": z.object({
          "konsistenzBewertung": z.number()
            .int()
            .describe("Prozentuale Einschätzung der Konsistenz (0-100%)"),
          "indikatorenFürKonsistenz": z.array(z.string())
            .describe("Merkmale, die für die Konsistenz sprechen"),
          "indikatorenGegenKonsistenz": z.array(z.string())
            .describe("Merkmale, die gegen die Konsistenz sprechen")
        }).describe("Wie Konsistent ist das bereitgestellten Panoramabild, bereits erkannten Pflanzenarten, Standortdaten und Hinweise? "),
        "evidenz": z.object({
          "dafürSpricht": z.array(z.string())
            .describe("Merkmale, die für die Klassifizierung sprechen"),
          "dagegenSpricht": z.array(z.string())
            .describe("Merkmale, die gegen die Klassifizierung sprechen")
        }),
        "zusammenfassung": z.string()
            .describe("Wie könnte man das Habitat und die Einschätzung des Schutzstatus zusammenfassen?")
      })
      )
    });

    const jsonSchema = zodToJsonSchema(zSchema, 'analyseSchema');
    console.log(JSON.stringify(jsonSchema, null, 2));

    try {
        
        console.log('🔄 Starte Bildanalyse für URLs:', metadata.bilder);
        
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

        console.log('✅ Bildkonvertierung abgeschlossen', {
            numberOfImages: imageContents.length,
            isDummy: imageBase64Contents.length === 0
        });

        
        const randomId = Math.floor(Math.random() * 9000000000) + 1000000000;

        const llmSystemInstruction = `
[ID:${randomId}]
Du bist ein erfahrener Vegetationsökologe und sollst bei der Habitatanalyse unterstützen. 
Berücksichtige die bereits bekannten Standortdaten und Pflanzenarten in deiner Analyse.
argumentiere wissenschaftlich fundiert nur auf Basis der bereitgestellten Informationen.
        `.trim();
  
        
        const llmQuestion = `
[ID:${randomId}]
Analysiere das hochgeladenen Gesamtbild und einige Detailbilder ` +
/*`unter Berücksichtigung der bereits bekannten:` +
`- Geokoordinaten Latitude: (${metadata.latitude}, Longitude: ${metadata.longitude}), ` +
`- Standort: ${metadata.standort} ` +
`- bereits identifizierte Pflanzenarten:
${metadata.bilder
  .filter(bild => bild.analyse && bild.analyse.trim() !== '')
  .map(bild => bild.analyse)
  .join(', ')}
${metadata.bilder.some(bild => bild.analyse && bild.analyse.trim() !== '') ? '\n' : ''}
` + */
`Bitte analysiere folgende Parameter:
0. Schätze die Konsistent der bereitgestellten Informationen 
1. Erfasse die Standortbedingungen und deren Einfluss auf die Vegetation
2. Wie häufig sind die erkannten Pflanzenarten im Bestand
3. Beschreibe die Vegetationsstruktur und -dynamik
4. Dokumentiere Nutzungsspuren und deren Auswirkungen
5. Leite daraus den wahrscheinlichen Habitattyp ab
6. Bewerte die ökologische Qualität und Schutzwürdigkeit
7. Führe unterstützende und widersprechende Merkmale auf
8. Schätze die Konfidenz deiner Einordnung
${metadata.kommentar ? `Beachte bitte folgende zusätzliche Hinweise: ${metadata.kommentar}` : ''}
`.trim();


        console.log("Question", llmQuestion);

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
            response_format: zodResponseFormat(zSchema, "structured_analysis"),
            max_tokens: 2000,
        });
        const usage = completion.usage;
        console.log("usage", usage);
        const analysisResult =  completion.choices[0]?.message.content;
        if (analysisResult) {
          console.log("analysisResult", analysisResult);
          const parsedResult: AnalyseErgebnis = {
                ...JSON.parse(analysisResult).analyses[0],
                kommentar: metadata.kommentar
            };
            
            return { 
                result: parsedResult,
                llmInfo: {
                    llmModelPflanzenErkennung: "PLANTNET",
                    llmModelHabitatErkennung: serverConfig.OPENAI_VISION_MODEL,
                    llmSystemInstruction: llmSystemInstruction,
                    llmQuestion: llmQuestion,
                    jsonSchema: JSON.stringify(jsonSchema, null, 2)
                }
            };
        } else {
            return { result: null, error: "Keine Analyse verfügbar."};
        };
    } catch (error: Error | unknown) {
        console.error('Fehler bei der Bildanalyse:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        return {
            result: null,
            error: `Die Analyse ist fehlgeschlagen: ${errorMessage}`
        };
    }
} 