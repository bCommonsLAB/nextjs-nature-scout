"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Flower2, Sparkles, CheckCircle2, Camera, MessagesSquare, MessageSquare, Terminal, AlertTriangle, Loader2 } from 'lucide-react';
import { NatureScoutData, AnalyseErgebnis, llmInfo } from "@/types/nature-scout";
import { ParameterHeading } from './parameter-heading';

interface ImageAnalysisProps {
  metadata: NatureScoutData;
  onAnalysisComplete: (ergebnis: AnalyseErgebnis, llmInfo: llmInfo) => void;
  onKommentarChange: (kommentar: string) => void;
}

function getHighestStatus(schutzstatus: Record<string, number>): [string, number] {
  return Object.entries(schutzstatus).reduce((a, b) => a[1] > b[1] ? a : b);
}

// Tooltip-Definitionen hinzufügen
const tooltips = {
  standort: {
    title: "Standort",
    description: "Physische Eigenschaften und Umweltbedingungen des Standorts",
    hangneigung: "Neigungsgrad des Geländes, z. B. eben, geneigt oder steil",
    exposition: "Ausrichtung des Standorts, z. B. nach Norden, Osten oder Süden",
    bodenfeuchtigkeit: "Feuchtigkeitszustand des Bodens, von trocken bis nass"
  },
  pflanzenarten: {
    title: "Pflanzenarten",
    description: "Erkannte Pflanzenarten und deren Eigenschaften",
    name: "Deutsche Bezeichnung der Pflanzenart",
    häufigkeit: "Häufigkeit der Pflanzenart im Bestand, von einzeln bis dominant",
    istZeiger: "Gibt an, ob die Pflanzenart ein Indikator für die Standortbedingungen ist"
  },
  vegetationsstruktur: {
    title: "Vegetationsstruktur",
    description: "Strukturelle Merkmale der Vegetation",
    höhe: "Hauptbestandshöhe, z. B. kurz, mittel oder hoch",
    dichte: "Dichte der Vegetation, von dünn bis dicht",
    deckung: "Grad der Bodendeckung, von offen bis geschlossen"
  },
  blühaspekte: {
    title: "Blühaspekte",
    description: "Merkmale der Blütenbildung",
    intensität: "Blühintensität, von keine bis reich",
    anzahlFarben: "Anzahl verschiedener Blütenfarben"
  },
  nutzung: {
    title: "Nutzung",
    description: "Erkennbare Nutzungsspuren",
    beweidung: "Gibt an, ob Beweidungsspuren vorhanden sind",
    mahd: "Gibt an, ob Mahdspuren vorhanden sind",
    düngung: "Gibt an, ob Düngungsspuren vorhanden sind"
  },
  habitattyp: {
    title: "Habitattyp",
    description: "Klassifizierung des Lebensraums",
    typ: "Klassifizierung des Lebensraums, z. B. Magerwiese, Hochmoor oder Trockenrasen"
  },
  schutzstatus: {
    title: "Schutzstatus",
    description: "Bewertung des Schutzstatus",
    gesetzlich: "Wahrscheinlichkeit, dass das Habitat gesetzlich geschützt ist",
    hochwertig: "Wahrscheinlichkeit, dass es ein ökologisch hochwertiger, aber nicht gesetzlich geschützter Lebensraum ist",
    standard: "Wahrscheinlichkeit, dass es sich um einen Standardlebensraum handelt"
  },
  bewertung: {
    title: "Bewertung",
    description: "Qualitative Bewertung des Habitats",
    artenreichtum: "Geschätzte Artenanzahl auf 25 m²",
    konfidenz: "Sicherheit der Habitatbestimmung in Prozent"
  },
  evidenz: {
    title: "Evidenz",
    description: "Begründung der Habitatklassifizierung",
    dafürSpricht: "Merkmale, die die Klassifizierung des Habitats unterstützen",
    dagegenSpricht: "Merkmale, die gegen die Klassifizierung sprechen"
  },
  zusammenfassung: {
    title: "Zusammenfassung",
    description: "Zusammenfassende Beschreibung",
    text: "Beschreibung des Habitats und eine Einschätzung des Schutzstatus"
  }
};


export function HabitatAnalysis({ metadata, onAnalysisComplete, onKommentarChange }: ImageAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isParametersOpen, setIsParametersOpen] = useState(false);
  const hasInitiatedAnalysis = useRef(false);
  
  useEffect(() => {
    if (!metadata.analyseErgebnis && !isAnalyzing && !hasInitiatedAnalysis.current) {
      hasInitiatedAnalysis.current = true;
      handleAnalyzeClick();
    }
  }, [metadata.analyseErgebnis]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyzeClick = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const startResponse = await fetch('/api/analyze/start', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ metadata })
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json();
        console.error("Analyse-Fehler:", errorData);
        throw new Error(errorData.details || 'Ein Fehler ist bei der Analyse aufgetreten');
      }

      const { jobId } = await startResponse.json();

      const checkStatus = async () => {
        const statusResponse = await fetch(`/api/analyze/status?jobId=${jobId}`, {
          method: "GET"
        });

        const { status, result, llmInfo } = await statusResponse.json();

        if (status === 'completed' && result) {
          onAnalysisComplete({
            ...metadata.analyseErgebnis,
            ...result,
          }, llmInfo);
          setIsAnalyzing(false);
        } else if (status === 'failed') {
          throw new Error('Analyse fehlgeschlagen');
        } else {
          setTimeout(checkStatus, 2000);
        }
      };

      await checkStatus();

    } catch (error) {
      console.error("Fehler bei der Analyse:", error);
      setAnalysisError(error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten');
      setIsAnalyzing(false);
    }
  };

  const handleKommentarChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onKommentarChange(event.target.value);
  };

  return (
    <div className="space-y-4">
      {analysisError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent>
            <p className="text-red-600">{analysisError}</p>
          </CardContent>
        </Card>
      )}
      
      {!metadata.analyseErgebnis ? (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center space-x-2 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              <p className="text-gray-600">Einen Moment bitte - Analyse läuft...</p>
            </div>
          </CardContent>
          
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start gap-4">
              <Flower2 className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div className="space-y-3 flex-1">
                <div>
                  <div className="text-sm text-gray-500">Erkanntes Habitat</div>
                  <div className="text-xl font-bold text-gray-900">
                    {metadata.analyseErgebnis.habitatTyp}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-500">Schutzstatus</div>
                  <div className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {(() => {
                      const [status, prozent] = getHighestStatus(metadata.analyseErgebnis.schutzstatus);
                      return `${status} (${prozent}%)`;
                    })()}
                  </div>
                </div>

                <p className="text-gray-600 text-sm border-l-4 border-green-200 pl-3">
                  {metadata.analyseErgebnis.zusammenfassung}
                </p>
                
                {metadata.analyseErgebnis?.kommentar && (
                  <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-md border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1" />
                    <p className="text-amber-700 text-sm">
                      Kommentar: {metadata.analyseErgebnis.kommentar}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <button
                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 w-full"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-medium">Wie kam dieses Ergebnis zustande?</span>
                </div>
                {isDetailsOpen ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
              </button>
              {isDetailsOpen && (
                <div className="mt-4 space-y-6 text-sm text-gray-600">
                  {metadata.llmInfo && (
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-blue-500" />
                        Bildanalyse Prozess
                      </h3>
                      <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                        <p>
                          Zunächst wurden die hochgeladenen Detailbilder nach Pflanzenarten analysiert. Anschliessend wurde das hochgeladene Panoramabild mit den erkannten Pflanzenarten und bekannten Standortinformationen analysiert.
                        </p>
                        <p>
                          Vision Modell Pflanzenerkennung: {metadata.llmInfo.llmModelPflanzenErkennung}
                        </p>
                        <p>
                          Vision Modell Habitaterkennung: {metadata.llmInfo.llmModelHabitatErkennung}
                        </p>
                      </div>
                    </div>
                  )}
                  {metadata.llmInfo?.llmSystemInstruction && (
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-blue-500" />
                        Systeminstruktion zur Habitat-Erkennung
                      </h3>
                      <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                        <div className="text-xs font-mono whitespace-pre-wrap">
                          {metadata.llmInfo.llmSystemInstruction}
                        </div>
                      </div>
                    </div>
                  )}

                  {metadata.llmInfo?.llmQuestion && (
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                        Fragestellung zur Habitat-Erkennung
                      </h3>
                      <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                        <div className="text-xs font-mono whitespace-pre-wrap">
                          {metadata.llmInfo.llmQuestion}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
{/* Erkannte Parameter Accordion - NEU */}
<div className="bg-white rounded-lg shadow-md p-6">
              <button
                onClick={() => setIsParametersOpen(!isParametersOpen)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 w-full"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-medium">Erkannte Parameter</span>
                </div>
                {isParametersOpen ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
              </button>
              {isParametersOpen && metadata.analyseErgebnis && (
                <div className="mt-4">
                  <div className="text-sm text-gray-600 space-y-2 mb-6">
                      <p>
                        Diese Parameter wurden aufgrund von Wahrscheinlichkeiten analysiert. Es kann sein, dass einige falsch sind. Aber es hilft die Entscheidung nachzuvollziehen und evtl. Fehlerentscheidungen zu analysieren. 
                        Wenn ein Parameter so falsch ist, dass es Auswirkungen auf den erkannten Habitattyp hätte, bitten wir sie, das im nächsten Abschnitt zu anzumerken.                      
                      </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <div className="text-xs font-mono whitespace-pre-wrap">
                      <ParameterHeading 
                        title={tooltips.standort.title}
                        description={tooltips.standort.description}
                        details={{
                          Hangneigung: tooltips.standort.hangneigung,
                          Exposition: tooltips.standort.exposition,
                          Bodenfeuchtigkeit: tooltips.standort.bodenfeuchtigkeit
                        }}
                      />
{`- Hangneigung: ${metadata.analyseErgebnis.standort?.hangneigung || 'n/a'}
- Exposition: ${metadata.analyseErgebnis.standort?.exposition || 'n/a'}
- Bodenfeuchtigkeit: ${metadata.analyseErgebnis.standort?.bodenfeuchtigkeit || 'n/a'}
`}

                      <ParameterHeading 
                        title={tooltips.pflanzenarten.title}
                        description={tooltips.pflanzenarten.description}
                        details={{
                          Name: tooltips.pflanzenarten.name,
                          Häufigkeit: tooltips.pflanzenarten.häufigkeit,
                          "Ist Zeiger": tooltips.pflanzenarten.istZeiger
                        }}
                      />
{`${metadata.analyseErgebnis.pflanzenArten?.map(art => 
  `- ${art.name} ${art.istZeiger ? '(Zeiger)' : ''}: ${art.häufigkeit}`
).join('\n') || '- keine erkannt'}
`}

                      <ParameterHeading 
                        title={tooltips.vegetationsstruktur.title}
                        description={tooltips.vegetationsstruktur.description}
                        details={{
                          Höhe: tooltips.vegetationsstruktur.höhe,
                          Dichte: tooltips.vegetationsstruktur.dichte,
                          Deckung: tooltips.vegetationsstruktur.deckung
                        }}
                      />
{`- Höhe: ${metadata.analyseErgebnis.Vegetationsstruktur?.höhe || 'n/a'}
- Dichte: ${metadata.analyseErgebnis.Vegetationsstruktur?.dichte || 'n/a'}
- Deckung: ${metadata.analyseErgebnis.Vegetationsstruktur?.deckung || 'n/a'}
`}

                      <ParameterHeading 
                        title={tooltips.blühaspekte.title}
                        description={tooltips.blühaspekte.description}
                        details={{
                          Intensität: tooltips.blühaspekte.intensität,
                          "Anzahl Farben": tooltips.blühaspekte.anzahlFarben
                        }}
                      />
{`- Intensität: ${metadata.analyseErgebnis.blühaspekte?.intensität || 'n/a'}
- Anzahl Farben: ${metadata.analyseErgebnis.blühaspekte?.anzahlFarben || 'n/a'}
`}

                      <ParameterHeading 
                        title={tooltips.nutzung.title}
                        description={tooltips.nutzung.description}
                        details={{
                          Beweidung: tooltips.nutzung.beweidung,
                          Mahd: tooltips.nutzung.mahd,
                          Düngung: tooltips.nutzung.düngung
                        }}
                      />

{`- Beweidung: ${metadata.analyseErgebnis.nutzung?.beweidung ? 'ja' : 'nein'}
- Mahd: ${metadata.analyseErgebnis.nutzung?.mahd ? 'ja' : 'nein'}
- Düngung: ${metadata.analyseErgebnis.nutzung?.düngung ? 'ja' : 'nein'}
`}

                      <ParameterHeading 
                        title={tooltips.habitattyp.title}
                        description={tooltips.habitattyp.description}
                        details={{
                          Typ: tooltips.habitattyp.typ
                        }}
                      />
{`- Typ: ${metadata.analyseErgebnis.habitatTyp || 'n/a'}
`}

                      
                      <ParameterHeading 
                        title={tooltips.schutzstatus.title}
                        description={tooltips.schutzstatus.description}
                        details={{
                          Gesetzlich: tooltips.schutzstatus.gesetzlich,
                          Hochwertig: tooltips.schutzstatus.hochwertig,
                          Standard: tooltips.schutzstatus.standard
                        }}
                      />

{`- Gesetzlich: ${metadata.analyseErgebnis.schutzstatus?.gesetzlich}%
- Hochwertig: ${metadata.analyseErgebnis.schutzstatus?.hochwertig}%
- Standard: ${metadata.analyseErgebnis.schutzstatus?.standard}%
`}

                      <ParameterHeading 
                        title={tooltips.bewertung.title}
                        description={tooltips.bewertung.description}
                        details={{
                          Artenreichtum: tooltips.bewertung.artenreichtum,
                          Konfidenz: tooltips.bewertung.konfidenz
                        }}
                      />
{`- Artenreichtum: ${metadata.analyseErgebnis.bewertung?.artenreichtum || 'n/a'}
- Konfidenz: ${metadata.analyseErgebnis.bewertung?.konfidenz || 'n/a'}%
`}

                      <ParameterHeading 
                        title={tooltips.evidenz.title}
                        description={tooltips.evidenz.description}
                        details={{
                          Dafür_spricht: tooltips.evidenz.dafürSpricht,
                          Dagegen_spricht: tooltips.evidenz.dagegenSpricht
                        }}
                      />
{`Dafür spricht:
${metadata.analyseErgebnis.evidenz?.dafürSpricht.map(punkt => `- ${punkt}`).join('\n') || ''}
${metadata.analyseErgebnis.evidenz?.dagegenSpricht?.length ? `
Dagegen spricht:
${metadata.analyseErgebnis.evidenz.dagegenSpricht.map(punkt => `- ${punkt}`).join('\n')}` : ''}
`}

                      <ParameterHeading 
                        title={tooltips.zusammenfassung.title}
                        description={tooltips.zusammenfassung.description}
                        details={{
                          Text: tooltips.zusammenfassung.text
                        }}
                      />
{`- Zusammenfassung: ${metadata.analyseErgebnis.zusammenfassung || 'n/a'}
`}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <button
                onClick={() => setIsFeedbackOpen(!isFeedbackOpen)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 w-full"
              >
                <div className="flex items-center gap-2">
                  <MessagesSquare className="w-4 h-4" />
                  <span className="font-medium">Ist das Ergebnis nicht richtig?</span>
                </div>
                {isFeedbackOpen ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
              </button>
              {isFeedbackOpen && (
                <div className="mt-4">
                  <div className="text-sm text-gray-600 space-y-2 mb-6">
                    <p>
                      Diese Anwendung befindet sich noch in der Prototyp-Phase und Deine Erfahrung ist für uns extrem wertvoll. 
                      Als Naturexpert:in vor Ort kannst Du am besten einschätzen, ob die erkannten Parameter korrekt sind.
                    </p>
                    <p>
                      Hast Du Unstimmigkeiten bei den erkannten Parametern bemerkt? Oder weitere Beobachtungen, 
                      die in der Analyse berücksichtigt werden sollten? Dein Feedback hilft uns, die Analyse-Qualität 
                      kontinuierlich zu verbessern.
                    </p>
                  </div>
                  
                  <div className="flex gap-4 items-start">
                    <Textarea
                      placeholder="Beschreibe in Worten was nicht stimmt..."
                      className="flex-1 h-24 resize-none"
                      value={metadata.kommentar ?? ""}
                      onChange={handleKommentarChange}
                    />
                    <Button 
                      onClick={handleAnalyzeClick}
                      disabled={isAnalyzing}
                      className="min-w-[160px]"
                    >
                      {isAnalyzing ? "Analysiere..." : "Analyse neu starten"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 