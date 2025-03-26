"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Welcome } from "./welcome";
import { GetImage } from "./get-image";
import { Summary } from "./summary";
import { UploadedImageList } from "./uploaded-image-list";
import { HabitatAnalysis } from "./habitat-analysis";
import { Bild, NatureScoutData, AnalyseErgebnis, llmInfo, PlantNetResult } from "@/types/nature-scout";
import { LocationDetermination } from './locationDetermination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Code, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';

const schritte = [
  "Willkommen",
  "Standort bestimmen",
  "Bilder hochladen",
  "Habitat analysieren",
  "Verifizierung"
];

function isNextButtonDisabled(schritt: number, metadata: NatureScoutData, isAnyUploadActive: boolean): boolean {
  if (schritt === schritte.length - 1) return true;
  if (isAnyUploadActive) return true;

  switch (schritt) {
    case 0: // Willkommen
      return !metadata.erfassungsperson || !metadata.email;
    
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

// Verschiebe useEffect in einen separaten Client-Komponenten
function DebugLogger({ metadata }: { metadata: NatureScoutData }) {
  useEffect(() => {
    console.log("Aktuelle Bilder:", metadata.bilder);
  }, [metadata.bilder]);
  
  return null;
}

export default function NatureScout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editJobId = searchParams.get('editJobId');
  const [aktiverSchritt, setAktiverSchritt] = useState(0);
  const [metadata, setMetadata] = useState<NatureScoutData>({
    erfassungsperson: "",
    email: "",
    gemeinde: "",
    flurname: "",
    latitude: 0,
    longitude: 0,
    standort: "",
    bilder: [],
    analyseErgebnis: undefined
  });
  const [isJsonDialogOpen, setIsJsonDialogOpen] = useState(false);
  const [activeUploads, setActiveUploads] = useState<Record<string, boolean>>({
    "Panoramabild": false,
    "Detailbild_1": false,
    "Detailbild_2": false
  });
  const [isLoading, setIsLoading] = useState(false);

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
            console.log("Geladene Habitat-Daten:", habitatData);
            
            // Extrahiere polygonPoints aus points oder polygonPoints
            const polygonPoints = habitatData.metadata.polygonPoints || 
                                  habitatData.metadata.points || 
                                  [];
            
            setMetadata({
              erfassungsperson: habitatData.metadata.erfassungsperson || "",
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
              plotsize: habitatData.metadata.plotsize || 0
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

  const isAnyUploadActive = Object.values(activeUploads).some(isUploading => isUploading);

  const setUploadStatus = (imageKey: string, isUploading: boolean) => {
    setActiveUploads(prev => ({
      ...prev,
      [imageKey]: isUploading
    }));
  };

  const handleBildUpload = (imageKey: string, filename: string, url: string, analysis: string, plantnetResult?: PlantNetResult) => {
    const neuesBild: Bild = {
      imageKey,
      filename,
      url,
      analyse: analysis,
      plantnetResult
    };
      
    setMetadata(prev => ({
      ...prev,
      bilder: [...prev.bilder.filter(b => b.imageKey !== imageKey), neuesBild]
    }));
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

  const handleDeleteImage = (imageKey: string) => {
    setMetadata(prev => ({
      ...prev,
      bilder: prev.bilder.filter(b => b.imageKey !== imageKey)
    }));
  };

  const renderSchrittInhalt = (schritt: number) => {
    switch (schritt) {
      case 0:
        return <Welcome metadata={metadata} setMetadata={setMetadata} />;
      case 1:
        console.log("LocationDetermination wird gerendert mit:", { 
          latitude: metadata.latitude, 
          longitude: metadata.longitude,
          polygonPoints: metadata.polygonPoints,
          hasPolygonPoints: metadata.polygonPoints && metadata.polygonPoints.length > 0
        });
        return <LocationDetermination metadata={metadata} setMetadata={setMetadata} />;
      case 2:
        return (
          <div>
            <p>Habitat bestimmen</p>
            <div className="flex flex-wrap justify-center gap-4">
              <GetImage 
                imageTitle="Panoramabild" 
                anweisung="Laden Sie ein Panoramabild des gesamten Habitats hoch." 
                onBildUpload={handleBildUpload}
                onDeleteImage={handleDeleteImage}
                existingImage={metadata.bilder.find(b => b.imageKey === "Panoramabild")}
                doAnalyzePlant={false}
                isUploading={activeUploads["Panoramabild"] ?? false}
                setIsUploading={(value) => setUploadStatus("Panoramabild", value)}
              />
              <GetImage 
                imageTitle="Detailbild_1" 
                anweisung="Laden Sie ein Detailbild hoch, das eine typische Pflanzenart zeigt." 
                onBildUpload={handleBildUpload}
                onDeleteImage={handleDeleteImage}
                existingImage={metadata.bilder.find(b => b.imageKey === "Detailbild_1")}
                doAnalyzePlant={true}
                isUploading={activeUploads["Detailbild_1"] ?? false}
                setIsUploading={(value) => setUploadStatus("Detailbild_1", value)}
              />
              <GetImage 
                imageTitle="Detailbild_2" 
                anweisung="Laden Sie ein weiteres Detailbild hoch, das eine typische Pflanzenart zeigt." 
                onBildUpload={handleBildUpload}
                onDeleteImage={handleDeleteImage}
                existingImage={metadata.bilder.find(b => b.imageKey === "Detailbild_2")}
                doAnalyzePlant={true}
                isUploading={activeUploads["Detailbild_2"] ?? false}
                setIsUploading={(value) => setUploadStatus("Detailbild_2", value)}
              />
            </div>
          </div>
        );
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
          </div>
        );
      case 4:
        return (
          <Summary 
            metadata={metadata}
          />
        );
      default:
        return "Unbekannter Schritt";
    }
  };

  return (
    <div className="container mx-auto p-4">
      <DebugLogger metadata={metadata} />
      <div className="mb-8">
        <Progress value={(aktiverSchritt / (schritte.length - 1)) * 100} className="w-full" />
        <div className="flex justify-between mt-2 px-1">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>
                {editJobId ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span>Bearbeitung von Habitat</span>
                    <span className="text-sm font-normal bg-gray-100 px-2 py-1 rounded">
                      Job-ID: {editJobId}
                    </span>
                  </div>
                ) : (
                  schritte[aktiverSchritt]
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                renderSchrittInhalt(aktiverSchritt)
              )}
            </CardContent>
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
          
          {metadata && (
            <Dialog open={isJsonDialogOpen} onOpenChange={setIsJsonDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Code className="h-4 w-4" />
                  Debug
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>
                    Analysierte Daten
                    {editJobId && (
                      <span className="ml-2 text-sm font-normal bg-gray-100 px-2 py-1 rounded">
                        Job-ID: {editJobId}
                      </span>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                  {JSON.stringify(metadata, null, 2)}
                </pre>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Button 
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