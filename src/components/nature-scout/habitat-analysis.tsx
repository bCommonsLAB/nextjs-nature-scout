"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NatureScoutData, Bild, AnalyseErgebnis, llmInfo } from "@/types/nature-scout";
import { Textarea } from "@/components/ui/textarea";

interface ImageAnalysisProps {
  metadata: NatureScoutData;
  onAnalysisComplete: (analysedBilder: Bild[], ergebnis: AnalyseErgebnis, llmInfo: llmInfo) => void;
  onKommentarChange: (kommentar: string) => void;
}

export function HabitatAnalysis({ metadata, onAnalysisComplete, onKommentarChange }: ImageAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const handleAnalyzeClick = async () => {
    setIsAnalyzing(true);

    try {
      // Initiale Analyse-Anfrage
      const startResponse = await fetch('/api/analyze/start', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ metadata })
      });

      if (!startResponse.ok) {
        throw new Error('Netzwerk-Antwort war nicht ok');
      }

      const { jobId } = await startResponse.json();

      // Status-Polling
      const checkStatus = async () => {
        const statusResponse = await fetch(`/api/analyze/status?jobId=${jobId}`, {
          method: "GET"
        });

        const { status, result, llmInfo } = await statusResponse.json();

        //console.log('[HabitatAnalysis] Status-Antwort:', { status, result });

        if (status === 'completed' && result) {
          const updatedBilder = metadata.bilder.map(bild => ({
            ...bild,
            analyse: null
          }));
          onAnalysisComplete(updatedBilder, result, llmInfo);
          setIsAnalyzing(false);
        } else if (status === 'failed') {
          throw new Error('Analyse fehlgeschlagen');
        } else {
          // Weiter pollen nach 2 Sekunden
          setTimeout(checkStatus, 2000);
        }
      };

      // Starte Polling
      await checkStatus();

    } catch (error) {
      console.error("Fehler bei der Analyse:", error);
      setIsAnalyzing(false);
    }
  };

  // Funktion zum Aktualisieren des Kommentars
  const handleKommentarChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onKommentarChange(event.target.value);
  };

  return (
    <div className="space-y-4">
      
      {!metadata.analyseErgebnis && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isAnalyzing ? "Habitat-Analyse läuft..." : "Habitate analysieren"}
            </CardTitle>
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
      )}
      {metadata.analyseErgebnis && (
          <Card>
            <CardHeader>
              <CardTitle>Habitat-Analyse</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-[200px_1fr] gap-4">
                  <div className="font-bold">Habitat:</div>
                  <div className="text-lg font-semibold text-green-700">{metadata.analyseErgebnis.habitatTyp}</div>

                    <div className="font-bold">Standort:</div>
                    <div className="flex gap-4">
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Hangneigung: {metadata.analyseErgebnis.standort.hangneigung}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Exposition: {metadata.analyseErgebnis.standort.exposition}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Bodenfeuchtigkeit: {metadata.analyseErgebnis.standort.bodenfeuchtigkeit}
                      </span>
                    </div>

                    <div className="font-bold">Pflanzenarten:</div>
                    <div className="flex flex-wrap gap-2">
                      {metadata.analyseErgebnis.pflanzenArten.map((art, i) => (
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
                        Höhe: {metadata.analyseErgebnis.Vegetationsstruktur.höhe}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Dichte: {metadata.analyseErgebnis.Vegetationsstruktur.dichte}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Deckung: {metadata.analyseErgebnis.Vegetationsstruktur.deckung}
                      </span>
                    </div>

                    <div className="font-bold">Blühaspekte:</div>
                    <div className="flex items-center gap-4">
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Intensität: {metadata.analyseErgebnis.blühaspekte.intensität}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {metadata.analyseErgebnis?.blühaspekte.anzahlFarben} Farben
                      </span>
                    </div>

                    <div className="font-bold">Nutzung:</div>
                    <div className="flex gap-2">
                      {Object.entries(metadata.analyseErgebnis?.nutzung).map(([key, value]) => (
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
                      {Object.entries(metadata.analyseErgebnis?.schutzstatus).map(([key, value]) => (
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
                            style={{ width: `${metadata.analyseErgebnis?.bewertung.artenreichtum}%` }}
                          />
                        </div>
                        <span className="text-sm">{metadata.analyseErgebnis?.bewertung.artenreichtum}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Konfidenz:</span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${metadata.analyseErgebnis?.bewertung.konfidenz}%` }}
                          />
                        </div>
                        <span className="text-sm">{metadata.analyseErgebnis?.bewertung.konfidenz}%</span>
                      </div>
                    </div>

                    <div className="font-bold">Evidenz:</div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Dafür spricht:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {metadata.analyseErgebnis?.evidenz.dafürSpricht.map((punkt, i) => (
                            <li key={i} className="text-green-700">{punkt}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Dagegen spricht:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {metadata.analyseErgebnis?.evidenz.dagegenSpricht.map((punkt, i) => (
                            <li key={i} className="text-red-700">{punkt}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              
            </CardContent>
          </Card>
        )
      }
      <Card>
        <CardHeader>
          <CardTitle>Kommentar & Hinweis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-start">
            <Textarea
              placeholder="Kommentar zur Analyse..."
              className="flex-1 h-24 resize-none mt-4"
              value={metadata.kommentar ?? ""}
              onChange={handleKommentarChange}
            />
            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleAnalyzeClick}
                disabled={isAnalyzing || metadata.bilder.length === 0}
              >
                {isAnalyzing ? "Analysiere..." : "Analyse jetzt starten"}
              </Button>
              
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 