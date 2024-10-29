import OpenAI from 'openai';
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { ImageAnalysisResult } from '@/types/types';
import { config } from '../config';

const openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY
});

export async function analyzeImageStructured(imageBase64: string[]): Promise<ImageAnalysisResult> {
    const zSchema = z.object({
        "analyses": z.array(z.object({
            "Pflanzen-Arten": z.array(z.string()),
            "Vegetationshöhe": z.string(),
            "Vegetationsdichte": z.string(),
            "Vegetationsstruktur": z.string(),
            "Blühintensität": z.string(),
            "Habitat": z.string(),
            "Pros": z.string().optional(),
            "Cons": z.string().optional(),
            "Wahrscheinlichkeit": z.number()
        }))
    });

    try {
        const imageContents = imageBase64.map(base64 => ({
            type: "image_url" as const,
            image_url: {
                url: `data:image/jpeg;base64,${base64}`,
                detail: "high" as const
            }
        }));

        const completion = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            messages: [
                { 
                    role: "system", 
                    content: "Du bist ein Biologe und solltest mir helfen Habitate anhand von Bildern zu erkennen. Du solltest sehr wissenschaftlich argumentieren."
                },
                {
                    role: "user",
                    content: [
                        { 
                            type: "text", 
                            text: "Analysiere die Vegetation und bestimme das Habitat."
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