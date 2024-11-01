import OpenAI from 'openai';
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { ImageAnalysisResult } from '@/types/types';
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

export async function analyzeImageStructured(imageUrls: string[]): Promise<ImageAnalysisResult> {
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
    
    try {
        
        console.log('🔄 Starte Bildanalyse für URLs:', imageUrls);
        
        const imageBase64Contents = await Promise.all(
            imageUrls.map(url => urlToBase64(url))
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
            Du bist ein Biologe und solltest mir helfen Habitate anhand von Bildern zu erkennen. 
            Du solltest sehr wissenschaftlich argumentieren.
        `.trim();
  
        const Question = `
            Um eine Aussage zu treffen:
            - Erkenne Indizien wie typische Pflanzenarten, Vegetationshöhe , Vegetationsdichte, Vegetationsstruktur,
            Blühintensität
            - Versuche aus diesen Indizien einen Habitattyp abzuleiten und verständlich zu erklären
            - Erkenne den Hapitatstyp: Entweder Magerwiese, Trockenrasen, Fettwiese, Magerweide, Niedermoor, Hochmoor, anderes Habitate.
            - Wenn du eine Aussage machst, erkläre bitte was dafür spricht
            - Aber auch was dagegen spricht
            Am Ende muss sich ein Mensch ein Bild machen, wie wahrscheinlich die Aussage ist.
        `.trim();

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
                            text: Question
                        },
                        ...imageContents
                    ],
                },
            ],
            response_format: zodResponseFormat(zSchema, "structured_analysis"),
            max_tokens: 2000,
        });

        return { 
            analysis: completion.choices[0]?.message?.content || "Keine Analyse verfügbar.",
            error: undefined
        };
    } catch (error: Error | unknown) {
        console.error('Fehler bei der Bildanalyse:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        return {
            analysis: "Analysefehler",
            error: `Die Analyse ist fehlgeschlagen: ${errorMessage}`
        };
    }
} 