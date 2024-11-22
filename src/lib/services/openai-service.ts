import OpenAI from 'openai';
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { openAiResult, AnalyseErgebnis, NatureScoutData } from '@/types/nature-scout';
import { serverConfig } from '../config';

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
            "hangneigung": z.enum(["eben", "leicht_geneigt", "steil", "weis nicht"])
              .describe("Hangneigung des Geländes"),
            "exposition": z.enum(["N", "NO", "O", "SO", "S", "SW", "W", "NW", "weis nicht"])
              .describe("Ausrichtung des Hanges"),
            "bodenfeuchtigkeit": z.enum(["trocken", "frisch", "feucht", "nass", "wasserzügig", "weis nicht"])
              .describe("Feuchtigkeit des Bodens")
          }),
          "pflanzenArten": z.array(
            z.object({
              "name": z.string().describe("Name der Pflanzenart in deutscher Sprache"),
              "häufigkeit": z.enum(["einzeln", "zerstreut", "häufig", "dominant"])
                .describe("Häufigkeit der Art im Bestand"),
              "istZeiger": z.boolean().optional()
                .describe("Ist die Art ein wichtiger Indikator?")
            })
          ).describe("Liste der erkannten Pflanzenarten mit Details, bitte nur die Arten auflisten, die eindeutig in den Bildern erkannt werden."),
          "Vegetationsstruktur": z.object({
            "höhe": z.enum(["kurz", "mittel", "hoch"])
              .describe("Höhe des Hauptbestandes"),
            "dichte": z.enum(["dünn", "mittel", "dicht"])
              .describe("Dichte der Vegetation"),
            "deckung": z.enum(["offen", "mittel", "geschlossen"])
              .describe("Bodendeckung der Vegetation")
          }),
          "blühaspekte": z.object({
            "intensität": z.enum(["keine", "vereinzelt", "reich"])
              .describe("Intensität der Blüte"),
            "anzahlFarben": z.number()
              .int()
              .describe("Anzahl verschiedener Blütenfarben")
          }),
          "nutzung": z.object({
            "beweidung": z.boolean()
              .describe("Beweidungsspuren vorhanden"),
            "mahd": z.boolean()
              .describe("Mahdspuren vorhanden"),
            "düngung": z.boolean()
              .describe("Düngungsspuren vorhanden")
          }),
          "habitatTyp": z.enum([
            "Magerwiese",
            "Trockenrasen",
            "Fettwiese",
            "Magerweide",
            "Fettweide",
            "Niedermoor",
            "Hochmoor",
            "sonstiges"
          ]).describe("Klassifizierung des Habitattyps"),
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
          }),
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

    try {
        
        console.log('🔄 Starte Bildanalyse für URLs:', metadata.bilder);
        
        const imageBase64Contents = await Promise.all(
          metadata.bilder.map(bild => urlToBase64(bild.url))
        );

        const imageContents = imageBase64Contents.map(base64 => ({
            type: "image_url" as const,
            image_url: {
                url: `data:image/jpeg;base64,${base64}`,
                detail: "high" as const
            }
        }));

        console.log('✅ Bildkonvertierung abgeschlossen', {
            numberOfImages: imageContents.length
        });

        const systemInstruction = `
            Du bist ein erfahrener Vegetationsökologe und sollst bei der Habitatanalyse unterstützen. 
            Berücksichtige die bereits bekannten Standortdaten und Pflanzenarten in deiner Analyse.
            Argumentiere wissenschaftlich fundiert und berücksichtige alle verfügbaren Indizien 
            für eine möglichst präzise Einschätzung.
        `.trim();
  
        const Question = `
            Analysiere die hochgeladenen Bilder unter Berücksichtigung der bekannten Geokoordinaten (${metadata.latitude}, ${metadata.longitude}), 
            Standort: ${metadata.standort} und der bereits identifizierten Pflanzenarten:
            ${metadata.bilder.map(bild => `${bild.analyse} `).join(', ')} 

            Bitte analysiere folgende Parameter:
            1. Erfasse die Standortbedingungen und deren Einfluss auf die Vegetation
            2. Identifiziere charakteristische Pflanzenarten und deren Häufigkeit
            3. Beschreibe die Vegetationsstruktur und -dynamik
            4. Dokumentiere Nutzungsspuren und deren Auswirkungen
            5. Leite daraus den wahrscheinlichen Habitattyp ab
            6. Bewerte die ökologische Qualität und Schutzwürdigkeit
            7. Führe unterstützende und widersprechende Merkmale auf
            8. Schätze die Konfidenz deiner Einordnung
        `.trim();
        console.log("Question: ", Question);
        console.log("OPENAI_VISION_MODEL: ", serverConfig.OPENAI_VISION_MODEL);

        const completion = await openai.chat.completions.create({
            model: serverConfig.OPENAI_VISION_MODEL,
            messages: [
                { 
                    role: "system", 
                    content: systemInstruction 
                },
                {
                    role: "user",
                    content: [
                        { 
                            type: "text", 
                            text: metadata.kommentar ? `${Question}\n\nZusätzliche Hinweis: ${metadata.kommentar}` : Question
                        },
                        ...imageContents
                    ],
                },
            ],
            response_format: zodResponseFormat(zSchema, "structured_analysis"),
            max_tokens: 2000,
        });
        const analysisResult =  completion.choices[0]?.message.content;
        if (analysisResult) {
            console.log("analysisResult", analysisResult);
            const parsedResult: AnalyseErgebnis = JSON.parse(analysisResult).analyses[0]; // Falls die Antwort ein JSON-String ist
            return { result: parsedResult, error: undefined};
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