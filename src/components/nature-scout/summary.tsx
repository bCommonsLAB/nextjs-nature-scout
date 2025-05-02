"use client";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { NatureScoutData } from "@/types/nature-scout";
import { useEffect, useState } from "react";
import { EffektiverHabitatEditor } from "@/components/habitat/EffektiverHabitatEditor";
import { useNatureScoutState } from "@/context/nature-scout-context";
import Image from 'next/image';
import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { normalizeSchutzstatus } from "@/lib/utils/data-validation";

interface SummaryProps {
  metadata: NatureScoutData;
}

export function Summary({ metadata }: SummaryProps) {
  const [isExpert, setIsExpert] = useState(false);
  const { editJobId, jobId } = useNatureScoutState();
  const [isAnalysisDetailsOpen, setIsAnalysisDetailsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Verwende entweder editJobId (wenn ein bestehendes Habitat bearbeitet wird)
  // oder jobId (wenn ein neues Habitat erstellt wurde)
  const currentJobId = editJobId || jobId;
  
  // Berechtigungen prüfen
  useEffect(() => {
    async function checkPermissions() {
      try {
        // Experten-Status prüfen
        const expertResponse = await fetch('/api/users/isExpert');
        const expertData = await expertResponse.json();
        console.log("API-Antwort isExpert:", expertData);
        setIsExpert(expertData.isExpert);
      } catch (error) {
        console.error('Fehler beim Überprüfen der Benutzerberechtigungen:', error);
      }
    }
    
    checkPermissions();
  }, []);

  // Speichere die Daten (insbesondere den Kommentar) beim Öffnen der Summary
  useEffect(() => {
    async function updateHabitatWithComments() {
      // Nur speichern, wenn eine jobId vorhanden ist und die Metadaten vollständig sind
      if (currentJobId && metadata.analyseErgebnis) {
        setIsSaving(true);
        setSaveError(null);
        
        try {
          // Aktualisiere den Habitat-Eintrag mit der aktuellen Metadaten (inkl. Kommentar)
          const response = await fetch(`/api/habitat/${currentJobId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              newAnalysisModule: 'Metadata-Update',
              kommentar: metadata.kommentar || ''
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Fehler beim Speichern der Daten');
          }
          
          console.log('Habitat-Daten wurden erfolgreich aktualisiert (inkl. Kommentar)');
        } catch (error) {
          console.error('Fehler beim Speichern des Habitats:', error);
          setSaveError(error instanceof Error ? error.message : 'Unbekannter Fehler beim Speichern');
          // Kein Alert hier, da wir den Benutzer nicht stören wollen, falls etwas schief geht
        } finally {
          setIsSaving(false);
        }
      }
    }
    
    updateHabitatWithComments();
  }, [currentJobId, metadata]);

  // Debug-Logging für die Werte
  useEffect(() => {
    console.log("Summary Debug - isExpert:", isExpert);
    console.log("Summary Debug - editJobId:", editJobId);
    console.log("Summary Debug - jobId:", jobId);
    console.log("Summary Debug - currentJobId:", currentJobId);
    console.log("Summary Debug - analyseErgebnis vorhanden:", !!metadata.analyseErgebnis);
  }, [isExpert, editJobId, jobId, currentJobId, metadata.analyseErgebnis]);

  if (!metadata.analyseErgebnis) return null;
  
  // Funktion für Schutzstatus-Styling
  function getSchutzstatusColor(status: string) {
    const normalizedStatus = normalizeSchutzstatus(status);
    switch (normalizedStatus) {
      case 'gesetzlich geschützt':
        return 'bg-red-500 text-white';
      case 'schützenswert':
      case 'ökologisch hochwertig':
        return 'bg-yellow-500 text-white';
      case 'nicht geschützt':
      case 'ökologisch niederwertig':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  }

  
  // Anzeige für Experten - direkte Verifizierungsoption
  if (isExpert && currentJobId) {
    return (
      <div className="space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Linke Spalte: Standort und Bilder */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Standort</h2>
            <div className="bg-gray-50 p-3 rounded mb-4">
              <p>Gemeinde: {metadata.gemeinde || '-'}</p>
              <p>Flurname: {metadata.flurname || '-'}</p>
              <p>Koordinaten: {metadata.latitude}, {metadata.longitude}</p>
              {metadata.elevation && <p>Höhe: {metadata.elevation}</p>}
              {metadata.exposition && <p>Exposition: {metadata.exposition}</p>}
              {metadata.slope && <p>Hangneigung: {metadata.slope}</p>}
            </div>

            <h2 className="text-xl font-semibold mb-4">Bilder</h2>
            <div className="space-y-4">
              {metadata.bilder.map((bild, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded">
                  <div className="relative h-64 w-full">
                    <Image
                      src={bild.url}
                      alt={`Bild ${index + 1}`}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {bild.imageKey === "Panoramabild" ? 'Panoramabild' : `Detailbild ${index}`}
                    {bild.plantnetResult && (
                      <span className="block font-semibold">
                        {bild.plantnetResult.species.scientificName}
                        <span className="font-normal text-xs ml-1">
                          ({(bild.plantnetResult.score * 100).toFixed(0)}%)
                        </span>
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Rechte Spalte: Verifizierungs-Editor und KI-Analyse */}
          <div>
            <Alert className="bg-blue-50 border-blue-200 mb-4">
              <AlertTitle>Verifizieren Sie dieses Habitat</AlertTitle>
              <AlertDescription>
                Als Experte können Sie dieses Habitat direkt verifizieren.
                <div className="mt-1 text-xs text-gray-500">
                  Habitat-ID: {currentJobId}
                </div>
              </AlertDescription>
            </Alert>
            
            <EffektiverHabitatEditor
              jobId={currentJobId}
              detectedHabitat={metadata.analyseErgebnis.habitattyp || ""}
              detectedFamilie={metadata.analyseErgebnis.habitatfamilie || ""}
              effectiveHabitat={metadata.analyseErgebnis.habitattyp || ""}
              kommentar={metadata.kommentar}
              isExpert={true}
              isVerified={false}
              returnToList={true}
              onSaved={() => {}}
            />
            
            {/* Zuklappbarer Bereich für KI-generierte Hinweise */}
            <div className="border border-gray-200 rounded-md overflow-hidden mt-6">
              <div 
                className="flex justify-between items-center p-4 cursor-pointer bg-gray-50 hover:bg-gray-100"
                onClick={() => setIsAnalysisDetailsOpen(!isAnalysisDetailsOpen)}
              >
                <span className="font-semibold text-gray-700">Analyse Hinweise (KI generiert)</span>
                <span className="transition">
                  {isAnalysisDetailsOpen ? <ChevronUp /> : <ChevronDown />}
                </span>
              </div>
              
              {isAnalysisDetailsOpen && (
                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="space-y-4">
                    {/* Zusammenfassung */}
                    <div className="bg-gray-50 p-4 rounded">
                      <h3 className="font-semibold text-sm">Zusammenfassung</h3>
                      <p className="mt-1 text-sm text-gray-600">{metadata.analyseErgebnis.zusammenfassung}</p>
                    </div>
                    
                    {/* Erkannte Pflanzenarten */}
                    {metadata.analyseErgebnis.pflanzenarten && metadata.analyseErgebnis.pflanzenarten.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded">
                        <h3 className="font-semibold text-sm">Erkannte Pflanzenarten</h3>
                        <ul className="mt-2 space-y-1 text-sm">
                          {metadata.analyseErgebnis.pflanzenarten.map((pflanze, index) => (
                            <li key={index} className="flex justify-between">
                              <span>{pflanze.name}</span>
                              <span className="text-gray-500">{pflanze.häufigkeit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Vegetationsstruktur */}
                    {metadata.analyseErgebnis.vegetationsstruktur && (
                      <div className="bg-gray-50 p-4 rounded">
                        <h3 className="font-semibold text-sm">Vegetationsstruktur</h3>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          <div>Höhe: <span className="font-medium">{metadata.analyseErgebnis.vegetationsstruktur.höhe}</span></div>
                          <div>Dichte: <span className="font-medium">{metadata.analyseErgebnis.vegetationsstruktur.dichte}</span></div>
                          <div>Deckung: <span className="font-medium">{metadata.analyseErgebnis.vegetationsstruktur.deckung}</span></div>
                        </div>
                      </div>
                    )}
                    
                    {/* Evidenz */}
                    {metadata.analyseErgebnis.evidenz && (
                      <div className="bg-gray-50 p-4 rounded">
                        <h3 className="font-semibold text-sm">Evidenz</h3>
                        {metadata.analyseErgebnis.evidenz.dafür_spricht && (
                          <div className="mt-2">
                            <h4 className="text-xs font-medium text-green-600">Dafür spricht:</h4>
                            {Array.isArray(metadata.analyseErgebnis.evidenz.dafür_spricht) ? (
                              <ul className="list-disc pl-5 space-y-1 text-sm">
                                {metadata.analyseErgebnis.evidenz.dafür_spricht.map((punkt, index) => (
                                  <li key={index}>{punkt}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm pl-5">{metadata.analyseErgebnis.evidenz.dafür_spricht}</p>
                            )}
                          </div>
                        )}
                        {metadata.analyseErgebnis.evidenz.dagegen_spricht && (
                          <div className="mt-2">
                            <h4 className="text-xs font-medium text-red-500">Dagegen spricht:</h4>
                            {Array.isArray(metadata.analyseErgebnis.evidenz.dagegen_spricht) ? (
                              <ul className="list-disc pl-5 space-y-1 text-sm">
                                {metadata.analyseErgebnis.evidenz.dagegen_spricht.map((punkt, index) => (
                                  <li key={index}>{punkt}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm pl-5">{metadata.analyseErgebnis.evidenz.dagegen_spricht}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 bg-yellow-50 p-3 rounded text-sm border border-yellow-200">
                    <p className="text-yellow-700">
                      <strong>Hinweis:</strong> Diese Analyseinformationen wurden automatisch durch KI erzeugt und dienen nur als Orientierungshilfe. 
                      Experten verifizieren nur den Habitattyp und den Schutzstatus, nicht die dargestellten Analysehinweise.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Kommentar des Erfassers, falls vorhanden */}
            {metadata.kommentar && (
              <div className="bg-blue-50 p-4 rounded mt-4">
                <h3 className="font-semibold text-blue-700">Kommentar des Erfassers</h3>
                <p className="mt-2 italic">{metadata.kommentar}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Standard-Anzeige für normale Benutzer oder wenn keine editJobId verfügbar ist
  return (
    <div className="space-y-4">
      
      <Alert>
        <AlertTitle>Vielen Dank für Ihre Hilfe!</AlertTitle>
        <AlertDescription className="whitespace-pre-line">
          Ihre erfasstes Habitat wurde gespeichert und wird nun von einem Experten analysiert. Wir geben Ihnen eine kurze Rückmeldung, sobald das Ergebnis verfügbar ist.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Linke Spalte: Standort und Bilder */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Standort</h2>
          <div className="bg-gray-50 p-3 rounded mb-4">
            <p>Gemeinde: {metadata.gemeinde || '-'}</p>
            <p>Flurname: {metadata.flurname || '-'}</p>
            <p>Koordinaten: {metadata.latitude}, {metadata.longitude}</p>
            {metadata.elevation && <p>Höhe: {metadata.elevation}</p>}
            {metadata.exposition && <p>Exposition: {metadata.exposition}</p>}
            {metadata.slope && <p>Hangneigung: {metadata.slope}</p>}
          </div>

          <h2 className="text-xl font-semibold mb-4">Bilder</h2>
          <div className="space-y-4">
            {metadata.bilder.map((bild, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded">
                <div className="relative h-64 w-full">
                  <Image
                    src={bild.url}
                    alt={`Bild ${index + 1}`}
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {bild.imageKey === "Panoramabild" ? 'Panoramabild' : `Detailbild ${index}`}
                  {bild.plantnetResult && (
                    <span className="block font-semibold">
                      {bild.plantnetResult.species.scientificName}
                      <span className="font-normal text-xs ml-1">
                        ({(bild.plantnetResult.score * 100).toFixed(0)}%)
                      </span>
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Rechte Spalte: Vorläufige Analyse */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Vorläufige Analyse</h2>
          
          <div className="bg-yellow-50 p-4 rounded border border-yellow-200 mb-4">
            <div className="flex items-center text-yellow-700 mb-3">
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="font-medium">Habitat noch nicht verifiziert</span>
            </div>
            <p className="text-sm text-yellow-700">
              Dieses Habitat wurde noch nicht von einem Experten verifiziert. 
              Die angezeigte Klassifizierung und der Schutzstatus sind vorläufig und wurden automatisch durch KI erstellt.
            </p>
          </div>

          <div className="p-4 border rounded-lg bg-white">
            <h3 className="font-medium text-lg mb-2">Habitat: {metadata.analyseErgebnis.habitattyp}</h3>
            <p className="mb-4">{metadata.analyseErgebnis.zusammenfassung}</p>
            {metadata.analyseErgebnis.schutzstatus && (
              <div className="mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSchutzstatusColor(metadata.analyseErgebnis.schutzstatus)}`}>
                  {normalizeSchutzstatus(metadata.analyseErgebnis.schutzstatus)}
                </span>
              </div>
            )}
          </div>
          
          {/* Zuklappbarer Bereich für KI-generierte Hinweise */}
          <div className="border border-gray-200 rounded-md overflow-hidden mt-6">
            <div 
              className="flex justify-between items-center p-4 cursor-pointer bg-gray-50 hover:bg-gray-100"
              onClick={() => setIsAnalysisDetailsOpen(!isAnalysisDetailsOpen)}
            >
              <span className="font-semibold text-gray-700">Analyse Hinweise (KI generiert)</span>
              <span className="transition">
                {isAnalysisDetailsOpen ? <ChevronUp /> : <ChevronDown />}
              </span>
            </div>
            
            {isAnalysisDetailsOpen && (
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="space-y-4">
                  {/* Erkannte Pflanzenarten */}
                  {metadata.analyseErgebnis.pflanzenarten && metadata.analyseErgebnis.pflanzenarten.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded">
                      <h3 className="font-semibold text-sm">Erkannte Pflanzenarten</h3>
                      <ul className="mt-2 space-y-1 text-sm">
                        {metadata.analyseErgebnis.pflanzenarten.map((pflanze, index) => (
                          <li key={index} className="flex justify-between">
                            <span>{pflanze.name}</span>
                            <span className="text-gray-500">{pflanze.häufigkeit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Vegetationsstruktur */}
                  {metadata.analyseErgebnis.vegetationsstruktur && (
                    <div className="bg-gray-50 p-4 rounded">
                      <h3 className="font-semibold text-sm">Vegetationsstruktur</h3>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <div>Höhe: <span className="font-medium">{metadata.analyseErgebnis.vegetationsstruktur.höhe}</span></div>
                        <div>Dichte: <span className="font-medium">{metadata.analyseErgebnis.vegetationsstruktur.dichte}</span></div>
                        <div>Deckung: <span className="font-medium">{metadata.analyseErgebnis.vegetationsstruktur.deckung}</span></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Evidenz */}
                  {metadata.analyseErgebnis.evidenz && (
                    <div className="bg-gray-50 p-4 rounded">
                      <h3 className="font-semibold text-sm">Evidenz</h3>
                      {metadata.analyseErgebnis.evidenz.dafür_spricht && (
                        <div className="mt-2">
                          <h4 className="text-xs font-medium text-green-600">Dafür spricht:</h4>
                          {Array.isArray(metadata.analyseErgebnis.evidenz.dafür_spricht) ? (
                            <ul className="list-disc pl-5 space-y-1 text-sm">
                              {metadata.analyseErgebnis.evidenz.dafür_spricht.map((punkt, index) => (
                                <li key={index}>{punkt}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm pl-5">{metadata.analyseErgebnis.evidenz.dafür_spricht}</p>
                          )}
                        </div>
                      )}
                      {metadata.analyseErgebnis.evidenz.dagegen_spricht && (
                        <div className="mt-2">
                          <h4 className="text-xs font-medium text-red-500">Dagegen spricht:</h4>
                          {Array.isArray(metadata.analyseErgebnis.evidenz.dagegen_spricht) ? (
                            <ul className="list-disc pl-5 space-y-1 text-sm">
                              {metadata.analyseErgebnis.evidenz.dagegen_spricht.map((punkt, index) => (
                                <li key={index}>{punkt}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm pl-5">{metadata.analyseErgebnis.evidenz.dagegen_spricht}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="mt-4 bg-yellow-50 p-3 rounded text-sm border border-yellow-200">
                  <p className="text-yellow-700">
                    <strong>Hinweis:</strong> Diese Analyseinformationen wurden automatisch durch KI erzeugt und dienen nur als Orientierungshilfe.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Kommentar des Erfassers, falls vorhanden */}
          {metadata.kommentar && (
            <div className="bg-blue-50 p-4 rounded mt-4">
              <h3 className="font-semibold text-blue-700">Kommentar des Erfassers</h3>
              <p className="mt-2 italic">{metadata.kommentar}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}