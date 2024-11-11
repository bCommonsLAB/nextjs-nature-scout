"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bild, AnalyseErgebnis } from "@/types/nature-scout";
import { Textarea } from "@/components/ui/textarea";

interface ImageAnalysisProps {
  bilder: Bild[];
  analyseErgebnis: AnalyseErgebnis | null;
  onAnalysisComplete: (analysedBilder: Bild[], ergebnis: AnalyseErgebnis) => void;
}

export function ImageAnalysis({ bilder, analyseErgebnis, onAnalysisComplete }: ImageAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [kommentar, setKommentar] = useState("");

  const handleAnalyzeClick = async () => {
    setIsAnalyzing(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 Sekunden

    try {
      const response = await fetch('/api/analyze', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images: bilder.map(bild => bild.url),
          kommentar
        }),
        signal: controller.signal
      });
      
      if (!response.ok) {
        throw new Error('Netzwerk-Antwort war nicht ok');
      }
      
      const data = await response.json();
      const parsedAnalysis = JSON.parse(data.analysis);
      
      const updatedBilder = bilder.map(bild => ({
        ...bild,
        analyse: null
      }));
      
      onAnalysisComplete(updatedBilder, parsedAnalysis.analyses[0]);
      
    } catch (error) {
      console.error("Fehler bei der Analyse:", error);
    } finally {
      clearTimeout(timeoutId);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      
      {!analyseErgebnis && (
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
      {analyseErgebnis && (
          <Card>
            <CardHeader>
              <CardTitle>Habitat-Analyse</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-[200px_1fr] gap-4">
                  <div className="font-bold">Habitat:</div>
                  <div className="text-lg font-semibold text-green-700">{analyseErgebnis.habitatTyp}</div>

                    <div className="font-bold">Standort:</div>
                    <div className="flex gap-4">
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Hangneigung: {analyseErgebnis.standort.hangneigung}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Exposition: {analyseErgebnis.standort.exposition}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Bodenfeuchtigkeit: {analyseErgebnis.standort.bodenfeuchtigkeit}
                      </span>
                    </div>

                    <div className="font-bold">Pflanzenarten:</div>
                    <div className="flex flex-wrap gap-2">
                      {analyseErgebnis.pflanzenArten.map((art, i) => (
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
                        Höhe: {analyseErgebnis.Vegetationsstruktur.höhe}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Dichte: {analyseErgebnis.Vegetationsstruktur.dichte}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Deckung: {analyseErgebnis.Vegetationsstruktur.deckung}
                      </span>
                    </div>

                    <div className="font-bold">Blühaspekte:</div>
                    <div className="flex items-center gap-4">
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        Intensität: {analyseErgebnis.blühaspekte.intensität}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {analyseErgebnis.blühaspekte.anzahlFarben} Farben
                      </span>
                    </div>

                    <div className="font-bold">Nutzung:</div>
                    <div className="flex gap-2">
                      {Object.entries(analyseErgebnis.nutzung).map(([key, value]) => (
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
                      {Object.entries(analyseErgebnis.schutzstatus).map(([key, value]) => (
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
                            style={{ width: `${analyseErgebnis.bewertung.artenreichtum}%` }}
                          />
                        </div>
                        <span className="text-sm">{analyseErgebnis.bewertung.artenreichtum}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Konfidenz:</span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${analyseErgebnis.bewertung.konfidenz}%` }}
                          />
                        </div>
                        <span className="text-sm">{analyseErgebnis.bewertung.konfidenz}%</span>
                      </div>
                    </div>

                    <div className="font-bold">Evidenz:</div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Dafür spricht:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {analyseErgebnis.evidenz.dafürSpricht.map((punkt, i) => (
                            <li key={i} className="text-green-700">{punkt}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Dagegen spricht:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {analyseErgebnis.evidenz.dagegenSpricht.map((punkt, i) => (
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
              placeholder={analyseErgebnis ? "Optionaler Korrekturhinweis zur Analyse... (nur zu Standort, Pflanzenarten, Vegetationsstruktur, Blühaspekte und Nutzung)" : "Optionaler Kommentar zur Analyse... (nur zu Standort, Pflanzenarten, Vegetationsstruktur, Blühaspekte und Nutzung)"} 
              className="flex-1 h-24 resize-none"
              value={kommentar}
              onChange={(e) => setKommentar(e.target.value)}
            />
            <Button 
              onClick={handleAnalyzeClick}
              disabled={isAnalyzing || bilder.length === 0}
            >
              {isAnalyzing ? "Analysiere..." : "Analyse jetzt starten"}
            </Button>
        </div>
        </CardContent>
      </Card>
    </div>
  );
} 