"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bild, AnalyseErgebnis } from "@/types/nature-scout";

interface ImageAnalysisProps {
  bilder: Bild[];
  onAnalysisComplete: (analysedBilder: Bild[]) => void;
}

export function ImageAnalysis({ bilder, onAnalysisComplete }: ImageAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyseErgebnis, setAnalyseErgebnis] = useState<AnalyseErgebnis | null>(null);

  const handleAnalyzeClick = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images: bilder.map(bild => bild.filename)
        }),
      });
      
      if (!response.ok) {
        throw new Error('Netzwerk-Antwort war nicht ok');
      }
      
      const data = await response.json();
      const parsedAnalysis = JSON.parse(data.analysis);
      setAnalyseErgebnis(parsedAnalysis);
      
      const updatedBilder = bilder.map(bild => ({
        ...bild,
        analyse: JSON.stringify(parsedAnalysis)
      }));
      onAnalysisComplete(updatedBilder);
      
    } catch (error) {
      console.error("Fehler bei der Analyse:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button 
          onClick={handleAnalyzeClick}
          disabled={isAnalyzing || bilder.length === 0}
        >
          {isAnalyzing ? "Analysiere..." : "Habitate analysieren"}
        </Button>
      </div>

      {analyseErgebnis?.analyses && (
        <Card>
          <CardHeader>
            <CardTitle>Habitat-Analyse</CardTitle>
          </CardHeader>
          <CardContent>
            {analyseErgebnis.analyses.map((analyse, index) => (
              <div key={index} className="space-y-4">
                <div className="grid grid-cols-[200px_1fr] gap-4">
                  <div className="font-bold">Habitat:</div>
                  <div>{analyse.Habitat}</div>

                  <div className="font-bold">Pflanzenarten:</div>
                  <div>{analyse["Pflanzen-Arten"].join(", ")}</div>

                  <div className="font-bold">Vegetationshöhe:</div>
                  <div>{analyse.Vegetationshöhe}</div>

                  <div className="font-bold">Vegetationsdichte:</div>
                  <div>{analyse.Vegetationsdichte}</div>

                  <div className="font-bold">Vegetationsstruktur:</div>
                  <div>{analyse.Vegetationsstruktur}</div>

                  <div className="font-bold">Blühintensität:</div>
                  <div>{analyse.Blühintensität}</div>

                  <div className="font-bold">Pros:</div>
                  <div>{analyse.Pros}</div>

                  <div className="font-bold">Cons:</div>
                  <div>{analyse.Cons}</div>

                  <div className="font-bold">Wahrscheinlichkeit:</div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${analyse.Wahrscheinlichkeit * 100}%` }}
                      />
                    </div>
                    <span className="text-sm">
                      {Math.round(analyse.Wahrscheinlichkeit * 100)}%
                    </span>
                  </div>
                </div>
                
                {index < analyseErgebnis.analyses.length - 1 && (
                  <div className="border-t my-4" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 