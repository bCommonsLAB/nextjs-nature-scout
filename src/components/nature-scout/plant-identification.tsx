"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bild } from "@/types/nature-scout";
import { PlantNetResponse } from "@/types/nature-scout";
import { toast } from "sonner";

interface PlantIdentificationProps {
  bilder: Bild[];
  onIdentificationComplete: (updatedBilder: Bild[]) => void;
}

export function PlantIdentification({ bilder, onIdentificationComplete }: PlantIdentificationProps) {
  const [isIdentifying, setIsIdentifying] = useState(false);

  const identifyPlants = async () => {
    setIsIdentifying(true);
    
    try {
      const updatedBilder = [...bilder];
      
      // Sequentiell jeden API-Call durchführen
      for (const bild of bilder) {
        const response = await analyzePlants([bild.url]);
        
        // Aktualisiere das einzelne Bild mit dem Analyseergebnis
        const bildIndex = updatedBilder.findIndex(b => b.imageKey === bild.imageKey);
        if (bildIndex !== -1) {
          updatedBilder[bildIndex] = {
            ...bild,
            analyse: response.bestMatch || '',
            plantnetResult: response.results[0]
          };
        }
      }

      onIdentificationComplete(updatedBilder);
      toast.success('Pflanzen wurden erfolgreich identifiziert');
    } catch (error) {
      console.error('Fehler bei der Pflanzenidentifikation:', error);
      toast.error('Fehler bei der Pflanzenidentifikation');
    } finally {
      setIsIdentifying(false);
    }
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Pflanzen bestimmen</h3>
      <p className="mb-4">
        Die hochgeladenen Detailbilder werden analysiert, um die vorhandenen Pflanzenarten zu bestimmen.
      </p>
      <Button 
        onClick={identifyPlants} 
        disabled={isIdentifying || bilder.length === 0}
      >
        {isIdentifying ? "Analyse läuft..." : "Pflanzen bestimmen"}
      </Button>
    </Card>
  );
}

async function analyzePlants(imageUrls: string[]) {
  try {
    const response = await fetch('/api/analyze/plants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrls }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('PlantNet API Fehler:', {
        status: response.status,
        statusText: response.statusText,
        details: errorData.details,
        error: errorData.error
      });
      throw new Error(errorData.error);
    }

    const data: PlantNetResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Fehler bei der Pflanzenanalyse:', error);
    throw error;
  }
} 