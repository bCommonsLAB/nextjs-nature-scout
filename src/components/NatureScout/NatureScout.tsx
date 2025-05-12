"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Welcome } from "./Welcome";
import { Summary } from "./Summary";
import { UploadedImageList } from "./UploadedImageList";
import { HabitatAnalysis } from "./HabitatAnalysis";
import { UploadImages } from "./UploadImages";
import { Bild, NatureScoutData, AnalyseErgebnis, llmInfo, PlantNetResult } from "@/types/nature-scout";
import { LocationDetermination } from './LocationDetermination';
import { ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
import { useNatureScoutState } from "@/context/nature-scout-context";
import { InstructionDialog } from "@/components/ui/instruction-dialog";

const schritte = [
  "Willkommen",
  "Standort bestimmen",
  "Bilder erfassen",
  "Habitat analysieren",
  "Verifizierung"
];

function isNextButtonDisabled(schritt: number, metadata: NatureScoutData, isAnyUploadActive: boolean): boolean {
  if (schritt === schritte.length - 1) return true;
  if (isAnyUploadActive) return true;

  switch (schritt) {
    case 0: // Willkommen
      return false;
    
    case 1: // Standort bestimmen
      return !metadata.gemeinde || !metadata.flurname || !metadata.latitude || !metadata.longitude;
    
    case 2: // Bilder hochladen
      return !metadata.bilder.some(b => b.imageKey === "Panoramabild");
    
    case 3: // Habitat analysieren
      return !metadata.analyseErgebnis || !metadata.llmInfo;

    default:
      return false;
  }
}

export default function NatureScout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editJobId = searchParams.get('editJobId');
  const [aktiverSchritt, setAktiverSchritt] = useState(0);
  const [metadata, setMetadata] = useState<NatureScoutData>({
    erfassungsperson: "",
    organizationId: "",
    organizationName: "",
    organizationLogo: "",
    email: "",
    gemeinde: "",
    flurname: "",
    latitude: 0,
    longitude: 0,
    standort: "",
    bilder: [],
    analyseErgebnis: undefined
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [shouldScrollToNext, setShouldScrollToNext] = useState(false);
  const [isAnyUploadActive, setIsAnyUploadActive] = useState(false);
  
  // Ref für die Progressbar
  const progressBarRef = useRef<HTMLDivElement>(null);
  // Ref für den Weiter-Button
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  // Scrolle zur Progressbar, wenn sich der aktive Schritt ändert
  useEffect(() => {
    if (progressBarRef.current) {
      // Berechne Position mit etwas Offset nach oben (für bessere Sichtbarkeit)
      const yOffset = -20; // 20px Offset nach oben
      const yPosition = progressBarRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      // Sanftes Scrollen zur Progressbar
      window.scrollTo({
        top: yPosition,
        behavior: 'smooth'
      });
    }
  }, [aktiverSchritt]);

  // Laden von vorhandenen Habitatdaten, wenn editJobId vorhanden ist
  useEffect(() => {
    if (editJobId) {
      const fetchHabitatData = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/habitat/${editJobId}`);
          
          if (!response.ok) {
            throw new Error(`Fehler beim Laden der Daten: ${response.status}`);
          }
          
          const habitatData = await response.json();
          
          // Setze die geladenen Daten in den State
          if (habitatData && habitatData.metadata) {
            
            // Extrahiere polygonPoints aus points oder polygonPoints
            const polygonPoints = habitatData.metadata.polygonPoints || 
                                  habitatData.metadata.points || 
                                  [];
            
            setMetadata({
              erfassungsperson: habitatData.metadata.erfassungsperson || "",
              organizationId: habitatData.metadata.organizationId || "",
              organizationName: habitatData.metadata.organizationName || "",
              organizationLogo: habitatData.metadata.organizationLogo || "",
              email: habitatData.metadata.email || "",
              gemeinde: habitatData.metadata.gemeinde || "",
              flurname: habitatData.metadata.flurname || "",
              latitude: habitatData.metadata.latitude || 0,
              longitude: habitatData.metadata.longitude || 0,
              standort: habitatData.metadata.standort || "",
              bilder: habitatData.metadata.bilder?.map((bild: Bild) => ({
                imageKey: bild.imageKey || (bild.plantnetResult ? "Detailbild_1" : "Panoramabild"),
                filename: bild.filename || "Bild.jpg",
                url: bild.url,
                analyse: bild.analyse || "",
                plantnetResult: bild.plantnetResult
              })) || [],
              analyseErgebnis: habitatData.result || undefined,
              llmInfo: habitatData.llmInfo || undefined,
              kommentar: habitatData.metadata.kommentar || "",
              
              // Wichtig: Polygonpunkte setzen
              polygonPoints: polygonPoints,
              
              // Weitere Felder, die möglicherweise in den Metadaten vorhanden sind
              exposition: habitatData.metadata.exposition || "",
              elevation: habitatData.metadata.elevation || "",
              slope: habitatData.metadata.slope || "",
              plotsize: habitatData.metadata.plotsize || 0,
              kataster: habitatData.metadata.kataster || undefined
            });
            
            // Direkt zum zweiten Schritt springen, wenn wir ein bestehendes Habitat bearbeiten
            setAktiverSchritt(1);
          }
        } catch (error) {
          console.error("Fehler beim Laden der Habitat-Daten:", error);
          alert(`Fehler beim Laden der Habitat-Daten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchHabitatData();
    }
  }, [editJobId]);

  // Metadaten in den Context übertragen
  const { setMetadata: setContextMetadata, setEditJobId: setContextEditJobId } = useNatureScoutState();

  // useEffect zum Aktualisieren des Contexts
  useEffect(() => {
    setContextMetadata(metadata);
    if (editJobId) {
      setContextEditJobId(editJobId);
    }
  }, [metadata, editJobId, setContextMetadata, setContextEditJobId]);

  // Handler für den Upload-Status aus der UploadImages-Komponente
  const handleUploadActiveChange = (isActive: boolean) => {
    setIsAnyUploadActive(isActive);
  };

  const handleAnalysisComplete = (
    ergebnis: AnalyseErgebnis, 
    llmInfo: llmInfo
  ) => {
    setMetadata(prev => ({
      ...prev,
      analyseErgebnis: ergebnis,
      llmInfo
    }));
  };

  const handleKommentarChange = (kommentar: string) => {
    setMetadata(prev => ({
      ...prev,
      kommentar
    }));
  };

  const handleHelpClick = () => {
    setShowHelp(prev => !prev);
  };

  // Debug-Funktion zum direkten Springen zum Bilder-Upload-Schritt
  const skipToImagesUpload = useCallback(() => {
    // Für Debug-Zwecke fülle eine minimale Konfiguration der Standortdaten aus
    setMetadata(prev => ({
      ...prev,
      gemeinde: prev.gemeinde || "Debug-Gemeinde",
      flurname: prev.flurname || "Debug-Flurname",
      latitude: prev.latitude || 47.123456,
      longitude: prev.longitude || 11.123456,
      standort: prev.standort || "Debug-Standort"
    }));

    // Direkt zu Schritt 2 springen (Bilder hochladen)
    setAktiverSchritt(2);
  }, []);

  // Funktion zum Scrollen zum Weiter-Button
  const scrollToNext = useCallback(() => {
    setShouldScrollToNext(true);
  }, []);

  // Effekt für das Scrollen zum Weiter-Button
  useEffect(() => {
    if (shouldScrollToNext && nextButtonRef.current) {
      const buttonPosition = nextButtonRef.current.getBoundingClientRect();
      
      // Prüfen, ob der Button bereits sichtbar ist
      const isVisible = 
        buttonPosition.top >= 0 &&
        buttonPosition.left >= 0 &&
        buttonPosition.bottom <= window.innerHeight &&
        buttonPosition.right <= window.innerWidth;
      
      // Nur scrollen, wenn der Button nicht sichtbar ist
      if (!isVisible) {
        // Neue Scroll-Position berechnen, damit der Button gerade am unteren Rand sichtbar wird
        // Wir nehmen die absolute Position des Buttons (pageYOffset + top)
        // und ziehen die Viewport-Höhe ab, fügen aber die Button-Höhe hinzu
        // plus etwas Abstand (20px)
        const yPosition = (buttonPosition.top + window.pageYOffset) - window.innerHeight + buttonPosition.height + 20;
        
        // Sanftes Scrollen zum Weiter-Button
        window.scrollTo({
          top: yPosition,
          behavior: 'smooth'
        });
      }
      
      // State zurücksetzen, um weitere Scrollaufrufe zu ermöglichen
      setShouldScrollToNext(false);
    }
  }, [shouldScrollToNext]);

  const renderSchrittInhalt = (schritt: number) => {
    switch (schritt) {
      case 0:
        return <Welcome 
          metadata={metadata} 
          setMetadata={setMetadata} 
          showHelp={showHelp} 
          onHelpShown={() => setShowHelp(false)} 
          scrollToNext={scrollToNext}
          onSkipToImages={skipToImagesUpload}
        />;
      case 1:
        console.log("LocationDetermination wird gerendert mit:", { 
          latitude: metadata.latitude, 
          longitude: metadata.longitude,
          polygonPoints: metadata.polygonPoints,
          hasPolygonPoints: metadata.polygonPoints && metadata.polygonPoints.length > 0
        });
        return <LocationDetermination metadata={metadata} setMetadata={setMetadata} showHelp={showHelp} onHelpShown={() => setShowHelp(false)} scrollToNext={scrollToNext} />;
      case 2:
        return <UploadImages 
          metadata={metadata} 
          setMetadata={setMetadata} 
          showHelp={showHelp} 
          onHelpShown={() => setShowHelp(false)} 
          scrollToNext={scrollToNext}
          onUploadActiveChange={handleUploadActiveChange}
        />;
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <UploadedImageList bilder={metadata.bilder} />
            </div>
            <div>
              <HabitatAnalysis 
                metadata={metadata} 
                onAnalysisComplete={handleAnalysisComplete}
                onKommentarChange={handleKommentarChange}
              />
            </div>
            {showHelp && (
              <InstructionDialog
                open={showHelp}
                onOpenChange={(open) => {
                  if (!open) setShowHelp(false);
                }}
                title="Habitat analysieren"
                content="Starten Sie die Analyse, um das Habitat zu bestimmen. Die hochgeladenen Bilder und Standortdaten werden für die Analyse verwendet. Sie können auch einen Kommentar hinzufügen."
                showDontShowAgain={false}
                skipDelay={true}
              />
            )}
          </div>
        );
      case 4:
        return (
          <>
            <Summary 
              metadata={metadata}
            />
            {showHelp && (
              <InstructionDialog
                open={showHelp}
                onOpenChange={(open) => {
                  if (!open) setShowHelp(false);
                }}
                title="Zusammenfassung"
                content="Hier sehen Sie eine Zusammenfassung aller erfassten Daten und das Ergebnis der Habitatanalyse. Sie können nun den Vorgang abschließen."
                showDontShowAgain={false}
                skipDelay={true}
              />
            )}
          </>
        );
      default:
        return "Unbekannter Schritt";
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-2" ref={progressBarRef}>
        <Progress value={(aktiverSchritt / (schritte.length - 1)) * 100} className="w-full" />
        <div className="flex justify-between mt-1 px-1">
          {schritte.map((label, index) => (
            <span 
              key={label} 
              className={`
                text-[10px] sm:text-sm 
                text-center 
                max-w-[60px] sm:max-w-none 
                ${index === aktiverSchritt ? "font-bold" : ""}
              `}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="md:col-span-3">
          <Card>
            {editJobId ? (
              <CardHeader>
                <CardTitle>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span>Bearbeitung von Habitat</span>
                    <span className="text-sm font-normal bg-gray-100 px-2 py-1 rounded">
                      Job-ID: {editJobId}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              ) : (
                aktiverSchritt !== 1 ? (
                  <CardHeader>
                    <CardTitle>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span>{schritte[aktiverSchritt]}</span>
                      </div>
                  </CardTitle>
                </CardHeader>
                ) : null
              )}
            {aktiverSchritt === 1 ? (
              <div className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  renderSchrittInhalt(aktiverSchritt)
                )}
              </div>
            ) : (
              <div className="p-0">
              
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  renderSchrittInhalt(aktiverSchritt)
                )}
              </CardContent>
              </div>
            )}
          </Card>
        </div>
      </div>
      <div className="flex justify-between items-center mt-4 gap-4">
        <div className="flex gap-2">
          <Button 
            onClick={() => aktiverSchritt === 0 ? router.push('/') : setAktiverSchritt(prev => prev - 1)} 
            disabled={aktiverSchritt === 0 && false}
            variant="outline"
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Zurück
          </Button>
          
          <Button
            onClick={handleHelpClick}
            variant="outline"
            size="icon"
            className="h-9 w-9"
            title="Hilfe anzeigen"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>

        <Button 
          ref={nextButtonRef}
          onClick={() => setAktiverSchritt(prev => prev + 1)} 
          disabled={isNextButtonDisabled(aktiverSchritt, metadata, isAnyUploadActive)}
          className="gap-2"
        >
          Weiter
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
    </div>
  );
} 