export interface Bild {
  imageKey: string;
  filename: string;
  url: string;
  analyse: string;
}

export interface AnalyseErgebnis {
  analyses: Array<{
    "Pflanzen-Arten": string[];
    "Vegetationshöhe": string;
    "Vegetationsdichte": string;
    "Vegetationsstruktur": string;
    "Blühintensität": string;
    "Habitat": string;
    "Pros": string;
    "Cons": string;
    "Wahrscheinlichkeit": number;
  }>;
} 