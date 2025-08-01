"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Welcome } from "./Welcome";
import { Summary } from "./Summary";
import { UploadedImageList } from "./UploadedImageList";
import { HabitatAnalysis } from "./HabitatAnalysis";
import { SingleImageUpload } from "./SingleImageUpload";
import { Bild, NatureScoutData, AnalyseErgebnis, llmInfo, PlantNetResult } from "@/types/nature-scout";
import { LocationDetermination } from './LocationDetermination';
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
import { useNatureScoutState } from "@/context/nature-scout-context";

const schritte = [
  "Willkommen",
  "Standort finden", 
  "Umriss zeichnen",
  "Panoramabild",
  "Detailbild", 
  "Pflanzenbild 1",
  "Pflanzenbild 2",
  "Habitat analysieren",
  "Verifizierung"
];

// Schritt-Erklärungen für die schwebende Sprechblase
const schrittErklaerungen = [
  {
    title: "Schritt für Schritt",
    description: "Gehen Sie ganz einfach jeden Schritt durch und beenden Sie ihn mit der Taste 'Weiter' am unteren Seitenende."
  },
  {
    title: "Standort finden",
    description: "Verschieben Sie den Kartenausschnitt zu Ihrem Habitat und zoomen Sie so weit wie möglich hinein, bis Sie das Habitat deutlich sehen können."
  },
  {
    title: "Umriss zeichnen",
    description: "Klicken Sie auf die Karte, um Eckpunkte des Habitat-Umrisses im Uhrzeigersinn zu setzen. Sie benötigen mindestens 3 Punkte. Die Fläche wird automatisch berechnet."
  },
  {
    title: "Panoramabild",
    description: "Legen Sie das Handy quer und erfassen Sie das gesamte Habitat mit einem Panoramabild. Halten Sie etwas Himmel mit ein für einen besseren Überblick."
  },
  {
    title: "Detailbild", 
    description: "Halten Sie das Handy aufrecht und machen Sie eine Nahaufnahme des Habitats. Fokussieren Sie auf interessante Details im Vordergrund, lassen aber etwas Hintergrund sichtbar."
  },
  {
    title: "Pflanzenbild 1",
    description: "Fotografieren Sie eine typische Pflanze des Habitats. Fokussieren Sie scharf auf die Pflanze und achten Sie auf gute Beleuchtung für die automatische Pflanzenbestimmung."
  },
  {
    title: "Pflanzenbild 2", 
    description: "Fotografieren Sie eine weitere typische Pflanze des Habitats. Wählen Sie eine andere Art als beim ersten Pflanzenbild für eine bessere Habitatcharakterisierung."
  },
  {
    title: "Habitat analysieren",
    description: "Die KI analysiert Ihre Bilder und Standortdaten, um den Habitattyp zu bestimmen. Pflanzenarten werden automatisch erkannt und bewertet. Sie können auch einen Kommentar hinzufügen."
  },
  {
    title: "Verifizierung",
    description: "Überprüfen Sie alle erfassten Daten und das Analyseergebnis. Sie können Änderungen vornehmen, bevor das Habitat gespeichert wird."
  }
];

// Schwebende Sprechblasen-Komponente
function FloatingHelpBubble({ 
  title, 
  description, 
  isVisible, 
  onClose,
  navigationHeight = 0,
  viewportHeight = 0
}: { 
  title: string; 
  description: string; 
  isVisible: boolean; 
  onClose: () => void;
  navigationHeight?: number;
  viewportHeight?: number;
}) {
  useEffect(() => {
    if (isVisible) {
      // Automatisch nach 5 Sekunden ausblenden
      const timer = setTimeout(() => {
        onClose();
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  // Dynamische Positionierung
  const bottomPosition = navigationHeight > 0 ? navigationHeight + 16 : 100; // 16px Abstand zur Navigation

  return (
    <div 
      className="fixed left-4 right-4 z-[9999] transition-all duration-300 ease-in-out"
      style={{ 
        bottom: `${bottomPosition}px`,
        maxHeight: viewportHeight > 0 ? `${Math.min(viewportHeight * 0.3, 200)}px` : '200px'
      }}
    >
      <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4 max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="text-m font-semibold text-blue-900">
              {title}
            </h3>
            <p className="text-m text-blue-800 leading-relaxed">
              {description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-blue-400 hover:text-blue-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function isNextButtonDisabled(schritt: number, metadata: NatureScoutData, isAnyUploadActive: boolean): boolean {
  if (schritt === schritte.length - 1) return true;
  if (isAnyUploadActive) return true;

  switch (schritt) {
    case 0: // Willkommen
      return false;
    
    case 1: // Standort finden
      return false; // Immer möglich zu "Umriss zeichnen" zu wechseln
    
    case 2: // Umriss zeichnen
      return !metadata.gemeinde || !metadata.flurname || !metadata.latitude || !metadata.longitude;
    
    case 3: // Panoramabild
      const hasPanorama = metadata.bilder.some(b => b.imageKey === "Panoramabild");
      return !hasPanorama;
    
    case 4: // Detailbild
      const hasDetail = metadata.bilder.some(b => b.imageKey === "Detailansicht");
      return !hasDetail;
    
    case 5: // Pflanzenbild 1
      const hasPlant1 = metadata.bilder.some(b => b.imageKey === "Detailbild_1");
      return !hasPlant1;
    
    case 6: // Pflanzenbild 2
      const hasPlant2 = metadata.bilder.some(b => b.imageKey === "Detailbild_2");
      return !hasPlant2;
    
    case 7: // Habitat analysieren
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
  const [shouldScrollToNext, setShouldScrollToNext] = useState(false);
  const [isAnyUploadActive, setIsAnyUploadActive] = useState(false);
  const [showHelpBubble, setShowHelpBubble] = useState(true); // State für die Sprechblase
  
  // Refs für dynamische Höhenberechnung
  const progressBarRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const [navigationHeight, setNavigationHeight] = useState(0);
  const [helpBubbleHeight, setHelpBubbleHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  // Sprechblase bei Schrittwechsel anzeigen
  useEffect(() => {
    setShowHelpBubble(true);
  }, [aktiverSchritt]);

  // Dynamische Höhenberechnung
  useEffect(() => {
    const updateHeights = () => {
      // Viewport-Höhe
      setViewportHeight(window.innerHeight);
      
      // Navigation-Höhe (fixed, daher konstant)
      setNavigationHeight(80); // Ungefähre Höhe der fixed Navigation
      
      // HelpBubble-Höhe (geschätzt, da sie noch nicht gerendert ist)
      setHelpBubbleHeight(120); // Ungefähre Höhe der Sprechblase
    };

    // Initial berechnen
    updateHeights();
    
    // Bei Resize neu berechnen
    window.addEventListener('resize', updateHeights);
    
    return () => window.removeEventListener('resize', updateHeights);
  }, [aktiverSchritt]); // Bei Schrittwechsel neu berechnen

  // Scrolle zur Progressbar, wenn sich der aktive Schritt ändert
  useEffect(() => {
    if (progressBarRef.current) {
      // Verzögerung hinzufügen, damit das Layout vollständig gerendert ist
      setTimeout(() => {
        // Berechne Position mit etwas Offset nach oben (für bessere Sichtbarkeit)
        const yOffset = -20; // 20px Offset nach oben
        const yPosition = progressBarRef.current!.getBoundingClientRect().top + window.pageYOffset + yOffset;
        
        // Sanftes Scrollen zur Progressbar
        window.scrollTo({
          top: yPosition,
          behavior: 'smooth'
        });
      }, 100); // 100ms Verzögerung
    }
  }, [aktiverSchritt]);

  // Zusätzlicher Effekt für initiales Laden
  useEffect(() => {
    // Wenn die Seite direkt mit einem bestimmten Schritt geladen wird
    if (aktiverSchritt > 0) {
      setTimeout(() => {
        // Scrolle zum Anfang der Seite, damit Navigation sichtbar ist
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }, 200);
    }
  }, []); // Nur beim ersten Laden

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

    // Direkt zu Schritt 3 springen (Panoramabild)
    setAktiverSchritt(3);
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
          scrollToNext={scrollToNext}
          onSkipToImages={skipToImagesUpload}
        />;
      case 3: // Panoramabild
        return <SingleImageUpload 
          metadata={metadata} 
          setMetadata={setMetadata} 
          imageKey="Panoramabild"
          title="Panoramabild"
          instruction="Gesamtüberblick des Habitats"
          doAnalyzePlant={false}
          schematicBg="/images/schema-panorama.svg"
          onUploadActiveChange={handleUploadActiveChange}
          requiredOrientation="landscape"
        />;
      case 4: // Detailbild
        return <SingleImageUpload 
          metadata={metadata} 
          setMetadata={setMetadata} 
          imageKey="Detailansicht"
          title="Detailbild"
          instruction="Nahaufnahme mit Hintergrund"
          doAnalyzePlant={false}
          schematicBg="/images/schema-detail.svg"
          onUploadActiveChange={handleUploadActiveChange}
          requiredOrientation="portrait"
        />;
      case 5: // Pflanzenbild 1
        return <SingleImageUpload 
          metadata={metadata} 
          setMetadata={setMetadata} 
          imageKey="Detailbild_1"
          title="Pflanzenbild 1"
          instruction="Erste typische Pflanzenart"
          doAnalyzePlant={true}
          schematicBg="/images/schema-plant1.svg"
          onUploadActiveChange={handleUploadActiveChange}
          requiredOrientation="portrait"
        />;
      case 6: // Pflanzenbild 2
        return <SingleImageUpload 
          metadata={metadata} 
          setMetadata={setMetadata} 
          imageKey="Detailbild_2"
          title="Pflanzenbild 2"
          instruction="Zweite typische Pflanzenart"
          doAnalyzePlant={true}
          schematicBg="/images/schema-plant2.svg"
          onUploadActiveChange={handleUploadActiveChange}
          requiredOrientation="portrait"
        />;
      case 7: // Habitat analysieren
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
          </div>
        );
      case 8: // Verifizierung
        return (
          <>
            <Summary 
              metadata={metadata}
            />
          </>
        );
      default:
        return null; // Für Schritte 1 und 2 wird LocationDetermination separat gerendert
    }
  };

  return (
    <>
      <div className="container mx-auto p-4 min-h-screen flex flex-col">
        <div className="mb-2" ref={progressBarRef}>
          <Progress value={(aktiverSchritt / (schritte.length - 1)) * 100} className="w-full" />
          <div className="flex justify-between mt-1 px-1">
            {schritte.map((label, index) => (
              <span 
                key={label} 
                className={`
                  text-center 
                  ${index === aktiverSchritt ? "font-bold" : ""}
                `}
                title={label} // Tooltip für mobile Nummern
              >
                {/* Desktop: Volltext für alle Schritte */}
                <span className="hidden md:inline text-sm">
                  {label}
                </span>
                
                {/* Mobile: Aktiver Schritt als Text, andere als Nummern */}
                <span className="md:hidden text-xs">
                  {index === aktiverSchritt ? (
                    <span className="font-bold">{label}</span>
                  ) : (
                    <span className="text-gray-500">{index + 1}</span>
                  )}
                </span>
              </span>
            ))}
          </div>
        </div>
        
        {/* Hauptinhalt - nimmt verfügbaren Platz ein, aber lässt Platz für Navigation */}
        <div className="flex-1 overflow-y-auto pb-32 sm:pb-24" style={{ paddingBottom: 'max(140px, 20vh)' }}>
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
                    aktiverSchritt !== 1 && aktiverSchritt !== 2 && aktiverSchritt !== 3 && aktiverSchritt !== 4 && aktiverSchritt !== 5 ? (
                      <CardHeader>
                        <CardTitle>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <span>{schritte[aktiverSchritt]}</span>
                          </div>
                      </CardTitle>
                    </CardHeader>
                    ) : null
                  )}
                
                {/* Persistente LocationDetermination für Schritte 1 und 2 */}
                {(aktiverSchritt === 1 || aktiverSchritt === 2) ? (
                  <div className="p-0">
                    {isLoading ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <LocationDetermination 
                        key="persistent-location-determination" // Feste Key für persistence
                        metadata={metadata} 
                        setMetadata={setMetadata} 
                        scrollToNext={scrollToNext}
                        mapMode={aktiverSchritt === 1 ? 'navigation' : 'polygon'}
                      />
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
        </div>
      </div>
      
      {/* Navigation - außerhalb des main Containers, immer unten, fixed position */}
      <div 
        ref={navigationRef}
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm py-2 sm:py-2 px-4 border-t border-gray-200 shadow-lg"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10000,
          width: '100%',
          minHeight: '55px',
          paddingBottom: 'env(safe-area-inset-bottom, 6px)'
        }}
      >
        <div className="container mx-auto flex justify-between items-center gap-1">
          <div className="flex gap-2">
              <Button 
                onClick={() => aktiverSchritt === 0 ? router.push('/') : setAktiverSchritt(prev => prev - 1)} 
                disabled={aktiverSchritt === 0 && false}
                variant="outline"
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Zurück
              </Button>
          </div>

          <Button 
            ref={nextButtonRef}
            onClick={() => setAktiverSchritt(prev => prev + 1)} 
            disabled={isNextButtonDisabled(aktiverSchritt, metadata, isAnyUploadActive)}
            className="gap-1"
          >
            Weiter
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Schwebende Sprechblase */}
      {aktiverSchritt >= 0 && (
        <FloatingHelpBubble 
          title={schrittErklaerungen[aktiverSchritt]?.title || "Schritt"}
          description={schrittErklaerungen[aktiverSchritt]?.description || "Beschreibung wird geladen..."}
          isVisible={showHelpBubble}
          onClose={() => setShowHelpBubble(false)}
          navigationHeight={navigationHeight}
          viewportHeight={viewportHeight}
        />
      )}
    </>
  );
} 