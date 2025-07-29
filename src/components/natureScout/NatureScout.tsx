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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
import { useNatureScoutState } from "@/context/nature-scout-context";

const schritte = [
  "Willkommen",
  "Standort finden",
  "Umriss zeichnen",
  "Bilder erfassen",
  "Habitat analysieren",
  "Verifizierung"
];

// Schritt-Erklärungen für den festen Erklärbereich (basierend auf den echten Hilfetexten)
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
    title: "Bilder erfassen",
    description: "Klicken Sie auf ein Bild und fotografieren Sie es mit der Kamera oder laden Sie ein Bild hoch. Das Prozedere ist je nach Gerät unterschiedlich. Manchmal müssen Sie der Anwendung auch Zugriff auf Ihre Kamera erlauben. Bitte ein Panoramabild, eine Detailansicht und zwei typische Pflanzenarten hochladen. Die Detailbilder von Pflanzen werden automatisch analysiert."
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
    
    case 3: // Bilder hochladen
      return !metadata.bilder.some(b => b.imageKey === "Panoramabild");
    
    case 4: // Habitat analysieren
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
          scrollToNext={scrollToNext}
          onSkipToImages={skipToImagesUpload}
        />;
      case 3:
        return <UploadImages 
          metadata={metadata} 
          setMetadata={setMetadata} 
          scrollToNext={scrollToNext}
          onUploadActiveChange={handleUploadActiveChange}
        />;
      case 4:
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
      case 5:
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
                aktiverSchritt !== 1 && aktiverSchritt !== 2 ? (
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
      
      {/* Fester Erklärbereich unterhalb der Navigation */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              {schrittErklaerungen[aktiverSchritt]?.title || "Schritt"}
            </h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              {schrittErklaerungen[aktiverSchritt]?.description || "Beschreibung wird geladen..."}
            </p>
          </div>
        </div>
      </div>
      
    </div>
  );
} 