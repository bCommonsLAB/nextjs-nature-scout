"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Flower2, Sparkles, CheckCircle2, Camera, MessagesSquare, MessageSquare, Terminal, AlertTriangle, Loader2 } from 'lucide-react';
import { NatureScoutData, AnalyseErgebnis, llmInfo, SimplifiedSchema } from "@/types/nature-scout";
import { ParameterHeading } from './ParameterHeading';
import { normalizeSchutzstatus } from '@/lib/utils/data-validation';
import { useNatureScoutState } from "@/context/nature-scout-context";

interface ImageAnalysisProps {
  metadata: NatureScoutData;
  onAnalysisComplete: (ergebnis: AnalyseErgebnis, llmInfo: llmInfo) => void;
  onKommentarChange: (kommentar: string) => void;
}

interface TooltipDefinition {
  title: string;
  description: string;
  [key: string]: string;
}

interface TooltipMap {
  [key: string]: TooltipDefinition;
}

function transformSchemaToTooltips(schema: SimplifiedSchema): TooltipMap {
  const tooltips: TooltipMap = {};

  for (const [key, value] of Object.entries(schema)) {
    if (typeof value === 'string') {
      // Direkter String-Wert wird als Beschreibung verwendet
      tooltips[key] = {
        title: key,
        description: value
      };
    } else if (typeof value === 'object') {
      tooltips[key] = {
        title: key,
        description: '', // Leere Beschreibung für Objekte
        ...Object.entries(value).reduce((acc, [subKey, subValue]) => ({
          ...acc,
          [subKey]: typeof subValue === 'string' ? subValue : ''
        }), {})
      };
    }
  }
  console.log(tooltips);
  return tooltips;
}

export function HabitatAnalysis({ metadata, onAnalysisComplete, onKommentarChange }: ImageAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isParametersOpen, setIsParametersOpen] = useState(false);
  const { setJobId, jobId } = useNatureScoutState();
  const analysisStarted = useRef(false);
  
  useEffect(() => {
    // Analyse immer starten, wenn die Komponente geladen wird
    if (!isAnalyzing && !analysisStarted.current) {
      console.log('Starte Habitat-Analyse automatisch');
      analysisStarted.current = true;
      handleAnalyzeClick();
    }
  }, [isAnalyzing]); // Nur von isAnalyzing abhängig machen

  const handleAnalyzeClick = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    // Bestehende Analyse-Ergebnisse zurücksetzen
    metadata.analyseErgebnis = undefined;
    metadata.llmInfo = undefined;
    
    try {
      // API-Anfrage zum Starten der Analyse
      const startResponse = await fetch('/api/analyze/start', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          metadata,
          // Wenn eine bestehende jobId vorhanden ist, diese weitergeben
          ...(jobId ? { existingJobId: jobId } : {})
        })
      });

      const responseData = await startResponse.json();

      if (!startResponse.ok) {
        throw new Error(responseData.error || 'Ein Fehler ist bei der Analyse aufgetreten');
      }

      // Verwende entweder die bestehende oder die neue JobId
      const currentJobId = jobId || responseData.jobId;
      console.log("Analyse gestartet mit jobId:", currentJobId);
      
      // Speichere die jobId im NatureScoutState, falls sie noch nicht gesetzt ist
      if (!jobId) {
        setJobId(currentJobId);
      }

      // Status der Analyse abfragen
      await checkStatus(currentJobId);
    } catch (error) {
      console.error("Fehler bei der Analyse:", error);
      setAnalysisError(error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten');
      setIsAnalyzing(false);
    }
  };

  const checkStatus = async (statusJobId: string) => {
    try {
      const statusResponse = await fetch(`/api/analyze/status?jobId=${statusJobId}`, {
        method: "GET"
      });

      const statusData = await statusResponse.json();

      if (!statusResponse.ok) {
        throw new Error(statusData.error || 'Fehler beim Abrufen des Analyse-Status');
      }

      const { status, result, llmInfo } = statusData;

      if (status === 'completed' && result) {
        onAnalysisComplete({
          ...metadata.analyseErgebnis,
          ...result,
        }, llmInfo);
        setIsAnalyzing(false);
      } else if (status === 'failed') {
        throw new Error(statusData.error || 'Analyse fehlgeschlagen');
      } else {
        setTimeout(() => checkStatus(statusJobId), 2000);
      }
    } catch (statusError) {
      throw new Error(statusError instanceof Error ? statusError.message : 'Fehler bei der Statusabfrage');
    }
  };

  const handleKommentarChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onKommentarChange(event.target.value);
  };

  const habitatTooltips = useMemo(() => 
    metadata.llmInfo?.habitatStructuredOutput 
      ? transformSchemaToTooltips(metadata.llmInfo.habitatStructuredOutput)
      : {},
    [metadata.llmInfo?.habitatStructuredOutput]
  );

  const schutzstatusTooltips = useMemo(() => 
    metadata.llmInfo?.schutzstatusStructuredOutput 
      ? transformSchemaToTooltips(metadata.llmInfo.schutzstatusStructuredOutput)
      : {},
    [metadata.llmInfo?.schutzstatusStructuredOutput]
  );

  // Neue Funktion, um sicher mit Evidenz-Daten umzugehen
  const formatEvidenzData = useCallback((evidenzData: any, type: 'dafür_spricht' | 'dagegen_spricht') => {
    if (!evidenzData) return '';
    
    const title = type === 'dafür_spricht' ? 'Dafür spricht:\n' : '\nDagegen spricht:\n';
    
    // Array-Prüfung
    if (Array.isArray(evidenzData)) {
      if (evidenzData.length === 0) return '';
      return title + evidenzData.map(punkt => `- ${punkt}`).join('\n');
    }
    
    // String-Prüfung
    if (typeof evidenzData === 'string' && evidenzData.trim()) {
      return title + evidenzData;
    }
    
    // Objekt-Prüfung für den Fall, dass es in einer anderen Struktur vorliegt
    if (typeof evidenzData === 'object' && Object.keys(evidenzData).length > 0) {
      return title + JSON.stringify(evidenzData);
    }
    
    return '';
  }, []);

  const getStatusStyle = (type: string) => {
    const baseStyle = "text-sm font-medium px-3.5 py-2.5 rounded-full flex items-center gap-1";
    
    const normalizedType = normalizeSchutzstatus(type);
    
    switch(normalizedType) {
      case 'gesetzlich geschützt':
        return `${baseStyle} bg-red-100 text-red-800`;
      case 'ökologisch hochwertig':
        return `${baseStyle} bg-orange-100 text-orange-800`;
      case 'ökologisch niedrigwertig':
        return `${baseStyle} bg-green-100 text-green-800`;
      default:
        return `${baseStyle} bg-gray-100 text-gray-600`;
    }
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
                  <div className="text-sm text-gray-500">Vorläufig erkanntes Habitat</div>
                  <div className="text-xl font-bold text-gray-900">
                    {metadata.analyseErgebnis.habitattyp}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="text-sm text-gray-500">Schutzstatus für Biodiversität</div>
                  <div className="space-y-2">
                    {metadata.analyseErgebnis?.schutzstatus && (
                      <div className={getStatusStyle(normalizeSchutzstatus(metadata.analyseErgebnis.schutzstatus))}>
                        <CheckCircle2 className="w-4 h-4" />
                        {normalizeSchutzstatus(metadata.analyseErgebnis.schutzstatus)}
                      </div>
                    )}
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
            
            <div className="bg-white rounded-lg shadow-md p-3">
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
                        Analyse Prozess
                      </h3>
                      <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                        <p>Mit folgenden Schritten wurde das Ergebnis erzielt:</p>
                        <p>Zunächst wurden die hochgeladenen Detailbilder mit dem spezialisierten Visionmodell <span className="font-bold">{metadata.llmInfo.modelPflanzenErkennung}</span> nach Pflanzenarten analysiert.</p>
                        <p>Anschliessend wurde das hochgeladene Panoramabild mit den erkannten Pflanzenarten und bekannten Standortinformationen analysiert und diewerse Prameter und der Habitattyp mit dem Visionmodell <span className="font-bold">{metadata?.llmInfo?.modelHabitatErkennung?.toUpperCase()}</span> erkannt.</p>
                        <p>Und in einem 3.Schritt wurde dann auf Basis des erkannten Habitattyp der Schutzstatus für Biodiversität mit dem Large Language Modell <span className="font-bold">{metadata?.llmInfo?.modelSchutzstatusErkennung?.toUpperCase()}</span> analysiert.</p>
                      </div>
                    </div>
                  )}
                  {metadata.llmInfo?.systemInstruction && (
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-blue-500" />
                        Systeminstruktion
                      </h3>
                      <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                        <div className="text-xs font-mono whitespace-pre-wrap">
                          {metadata.llmInfo.systemInstruction}
                        </div>
                      </div>
                    </div>
                  )}

                  {metadata.llmInfo?.hapitatQuestion && (
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                        Fragestellung zur Habitat-Erkennung
                      </h3>
                      <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                        <div className="text-xs font-mono whitespace-pre-wrap">
                          {metadata.llmInfo.hapitatQuestion}
                        </div>
                      </div>
                    </div>
                  )}

                  {metadata.llmInfo?.schutzstatusQuestion && (
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                        Fragestellung zur Schutzstatus-Erkennung
                      </h3>
                      <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                        <div className="text-xs font-mono whitespace-pre-wrap">
                          {metadata.llmInfo.schutzstatusQuestion}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
{/* Erkannte Parameter Accordion - NEU */}
<div className="bg-white rounded-lg shadow-md p-3">
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
                        Die hier gelisteten Parameter wurden durch das LLM aufgrund von Wahrscheinlichkeiten analysiert. 
                        Jeder Parameter wird durch eine gezielte Frage bestimmt, die hinter dem Fragesymbol erklärt wird. 
                        Es kann sein, dass einige erkannte Parameter falsch sind, aber es zwingt das LLM viele Indizien 
                        zu berücksichtigen und die Einschätzung zu verbessern. 
                        Wenn ein Parameter so falsch ist, dass es Auswirkungen auf den erkannten Habitattyp hätte, 
                        bitten wir sie, das im nächsten Abschnitt zu anzumerken.                      
                      </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <div className="text-xs font-mono whitespace-pre-wrap">
                    <ParameterHeading 
                        title={habitatTooltips.bildanalyse?.title || ''}
                        description={habitatTooltips.bildanalyse?.description || ''}
                        details={{
                          Bilder: habitatTooltips.bildanalyse?.bilder || ''
                        }}
                      />
{`${metadata.analyseErgebnis.bildanalyse?.map(bild => 
  `- ${bild.bilder}`
).join('\n') || ''}
`}

                      <ParameterHeading 
                        title={habitatTooltips.pflanzenarten?.title || ''}
                        description={habitatTooltips.pflanzenarten?.description || ''}
                        details={{
                          Name: habitatTooltips.pflanzenarten?.name || '',
                          Häufigkeit: habitatTooltips.pflanzenarten?.häufigkeit || '',
                          "Ist Zeiger": habitatTooltips.pflanzenarten?.istzeiger || ''
                        }}
                      />
{`${metadata.analyseErgebnis.pflanzenarten?.map(art => 
  `- ${art.name} ${art.istzeiger ? '(Zeiger)' : ''}: ${art.häufigkeit}`
).join('\n') || ''}
`}

                      <ParameterHeading 
                        title={habitatTooltips.vegetationsstruktur?.title || ''}
                        description={habitatTooltips.vegetationsstruktur?.description || ''}
                        details={{
                          Höhe: habitatTooltips.vegetationsstruktur?.höhe || '',
                          Dichte: habitatTooltips.vegetationsstruktur?.dichte || '',
                          Deckung: habitatTooltips.vegetationsstruktur?.deckung || ''
                        }}
                      />
{`- Höhe: ${metadata.analyseErgebnis.vegetationsstruktur?.höhe || ''}
- Dichte: ${metadata.analyseErgebnis.vegetationsstruktur?.dichte || ''}
- Deckung: ${metadata.analyseErgebnis.vegetationsstruktur?.deckung || ''}
`}

                      <ParameterHeading 
                        title={habitatTooltips.blühaspekte?.title || ''}
                        description={habitatTooltips.blühaspekte?.description || ''}
                        details={{
                          Intensität: habitatTooltips.blühaspekte?.intensität || '',
                          "Anzahl Farben": habitatTooltips.blühaspekte?.anzahlfarben || ''
                        }}
                      />
{`- Intensität: ${metadata.analyseErgebnis.blühaspekte?.intensität || ''}
- Anzahl Farben: ${metadata.analyseErgebnis.blühaspekte?.anzahlfarben || ''}
`}

                      <ParameterHeading 
                        title={habitatTooltips.nutzung?.title || ''}
                        description={habitatTooltips.nutzung?.description || ''}
                        details={{
                          Beweidung: habitatTooltips.nutzung?.beweidung || '',
                          Mahd: habitatTooltips.nutzung?.mahd || '',
                          Düngung: habitatTooltips.nutzung?.düngung || ''
                        }}
                      />

{`- Beweidung: ${metadata.analyseErgebnis.nutzung?.beweidung ? 'ja' : 'nein'}
- Mahd: ${metadata.analyseErgebnis.nutzung?.mahd ? 'ja' : 'nein'}
- Düngung: ${metadata.analyseErgebnis.nutzung?.düngung ? 'ja' : 'nein'}
`}

                      <ParameterHeading 
                        title={habitatTooltips.habitattyp?.title || ''}
                        description={habitatTooltips.habitattyp?.description || ''}
                        details={{}}
                      />
{`- Typ: ${metadata.analyseErgebnis.habitattyp || ''}`}

                      <ParameterHeading 
                        title={habitatTooltips.evidenz?.title || ''}
                        description={habitatTooltips.evidenz?.description || ''}
                        details={{
                          dafür_spricht: habitatTooltips.evidenz?.dafür_spricht || '',
                          dagegen_spricht: habitatTooltips.evidenz?.dagegen_spricht || ''
                        }}
                      />
{`${formatEvidenzData(metadata.analyseErgebnis.evidenz?.dafür_spricht, 'dafür_spricht')}
${formatEvidenzData(metadata.analyseErgebnis.evidenz?.dagegen_spricht, 'dagegen_spricht')}`}
                      
                      <ParameterHeading 
                        title={habitatTooltips.zusammenfassung?.title || ''}
                        description={habitatTooltips.zusammenfassung?.description || ''}
                        details={{}}
                      />
{`${metadata.analyseErgebnis.zusammenfassung || ''}`}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-3">
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
                  
                  <div className="flex flex-col">
                    <Textarea
                      placeholder="Beschreibe in Worten was nicht stimmt..."
                      className="h-24 resize-none"
                      value={metadata.kommentar ?? ""}
                      onChange={handleKommentarChange}
                    />
                    <p className="text-gray-500 text-xs mt-2">
                      Dein Kommentar wird gespeichert und bei der Überprüfung durch einen Experten berücksichtigt.
                    </p>
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