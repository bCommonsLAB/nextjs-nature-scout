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
          images: bilder.map(bild => bild.url)
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

      {isAnalyzing ? (
        <Card>
          <CardHeader>
            <CardTitle>Habitat-Analyse läuft...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">Um die Schutzwürdigkeit des Habitats zu bestimmen, werden die Bilder nun nach folgenden Kriterien systematisch analysiert:</p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Erfassung der Standortbedingungen und deren Einfluss auf die Vegetation</li>
              <li>Identifikation charakteristischer Pflanzenarten und deren Häufigkeit</li>
              <li>Beschreibung der Vegetationsstruktur und -dynamik</li>
              <li>Dokumentation von Nutzungsspuren und deren Auswirkungen</li>
              <li>Daraus den wahrscheinlichen Habitattyp ableiten</li>
              <li>Bewertung der ökologischen Qualität und Schutzwürdigkeit</li>
              <li>Aufführung unterstützender und widersprechender Merkmale</li>
              <li>Einschätzung der Konfidenz dieser Einordnung</li>
            </ol>
          </CardContent>
        </Card>
      ) : (
        analyseErgebnis?.analyses && (
          <Card>
            <CardHeader>
              <CardTitle>Habitat-Analyse</CardTitle>
            </CardHeader>
            <CardContent>
              {analyseErgebnis.analyses.map((analyse, index) => (
                <div key={index} className="space-y-4">
                  <div className="grid grid-cols-[200px_1fr] gap-4">
                    <div className="font-bold">Habitat:</div>
                    <div className="text-lg font-semibold text-green-700">{analyse.habitatTyp}</div>

                    <div className="font-bold">Standort:</div>
                    <div className="flex gap-4">
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Hangneigung: {analyse.standort.hangneigung}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Exposition: {analyse.standort.exposition}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Bodenfeuchtigkeit: {analyse.standort.bodenfeuchtigkeit}
                      </span>
                    </div>

                    <div className="font-bold">Pflanzenarten:</div>
                    <div className="flex flex-wrap gap-2">
                      {analyse.pflanzenArten.map((art, i) => (
                        <span 
                          key={i} 
                          className={`px-2 py-1 rounded ${
                            art.istZeiger ? 'bg-green-100 border border-green-300' : 'bg-gray-100'
                          }`}
                        >
                          <span>{art.name}</span>
                          <span className="pl-1 text-sm text-gray-600">
                            ({art.häufigkeit}{art.istZeiger && ', Zeiger'})
                          </span>
                        </span>
                      ))}
                    </div>

                    <div className="font-bold">Vegetationsstruktur:</div>
                    <div className="flex gap-4">
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Höhe: {analyse.Vegetationsstruktur.höhe}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Dichte: {analyse.Vegetationsstruktur.dichte}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Deckung: {analyse.Vegetationsstruktur.deckung}
                      </span>
                    </div>

                    <div className="font-bold">Blühaspekte:</div>
                    <div className="flex items-center gap-4">
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Intensität: {analyse.blühaspekte.intensität}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {analyse.blühaspekte.anzahlFarben} Farben
                      </span>
                    </div>

                    <div className="font-bold">Nutzung:</div>
                    <div className="flex gap-2">
                      {Object.entries(analyse.nutzung).map(([key, value]) => (
                        <span 
                          key={key}
                          className={`px-2 py-1 rounded ${
                            value ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500 line-through'
                          }`}
                        >
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </span>
                      ))}
                    </div>

                    <div className="font-bold">Schutzstatus:</div>
                    <div className="flex gap-4">
                      {Object.entries(analyse.schutzstatus).map(([key, value]) => (
                        <div key={key} className="flex flex-col items-center">
                          <div className="text-sm text-gray-600">
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                key === 'gesetzlich' ? 'bg-red-600' : 
                                key === 'hochwertig' ? 'bg-yellow-500' : 
                                'bg-green-600'
                              }`}
                              style={{ width: `${value}%` }}
                            />
                          </div>
                          <div className="text-sm">{value}%</div>
                        </div>
                      ))}
                    </div>

                    <div className="font-bold">Bewertung:</div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <span>Artenreichtum:</span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${analyse.bewertung.artenreichtum}%` }}
                          />
                        </div>
                        <span className="text-sm">{analyse.bewertung.artenreichtum}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Konfidenz:</span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${analyse.bewertung.konfidenz}%` }}
                          />
                        </div>
                        <span className="text-sm">{analyse.bewertung.konfidenz}%</span>
                      </div>
                    </div>

                    <div className="font-bold">Evidenz:</div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Dafür spricht:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {analyse.evidenz.dafürSpricht.map((punkt, i) => (
                            <li key={i} className="text-green-700">{punkt}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Dagegen spricht:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {analyse.evidenz.dagegenSpricht.map((punkt, i) => (
                            <li key={i} className="text-red-700">{punkt}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  {index < analyseErgebnis.analyses.length - 1 && (
                    <div className="border-t my-4" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
} 