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
import { PlantIdentification } from "./plant-identification"
import { Bild, NatureScoutData, AnalyseErgebnis, llmInfo } from "@/types/nature-scout";
import { LocationDetermination } from './locationDetermination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Code, ChevronLeft, ChevronRight } from "lucide-react";

const schritte = [
  "Willkommen",
  "Standort bestimmen",
  "Bilder hochladen",
  "Pflanzen bestimmen",
  "Habitat analysieren",
  "Abschlussbewertung"
];

export function NatureScout() {
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

  const handleBildUpload = (imageKey: string, filename: string, url: string, analysis: string) => {
    const neuesBild: Bild = {
      imageKey,
      filename,
      url,
      analyse: analysis 
    };
      
    setMetadata(prev => ({
      ...prev,
      bilder: [
        ...prev.bilder.filter(bild => bild.imageKey !== imageKey),
        neuesBild
      ]
    }));
  };

  const handleAnalysisComplete = (
    ergebnis: AnalyseErgebnis, 
    llmInfo: llmInfo
  ) => {
    setMetadata(prev => ({
      ...prev,
      analyseErgebnis: ergebnis,
      llmInfo: llmInfo
    }));
  };

  const handlePDFDownload = () => {
    console.log("PDF-Download wurde angefordert");
    // Hier würde die tatsächliche PDF-Generierung und der Download implementiert werden
  };

  const handlePlantIdentification = (updatedBilder: Bild[]) => {
    setMetadata(prev => ({
      ...prev,
      bilder: prev.bilder.map(bild => 
        updatedBilder.find(updated => updated.imageKey === bild.imageKey) || bild
      )
    }));
  };

  const handleKommentarChange = (kommentar: string) => {
    setMetadata(prev => ({
      ...prev,
      kommentar
    }));
  };

  const renderSchrittInhalt = (schritt: number) => {
    switch (schritt) {
      case 0:
        return <Welcome metadata={metadata} setMetadata={setMetadata} />;
      case 1:
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
                existingImage={metadata.bilder.find(b => b.imageKey === "Panoramabild")}
              />
              <GetImage 
                imageTitle="Detailbild_1" 
                anweisung="Laden Sie ein Detailbild des Habitats hoch." 
                onBildUpload={handleBildUpload}
                existingImage={metadata.bilder.find(b => b.imageKey === "Detailbild_1")}
              />
              <GetImage 
                imageTitle="Detailbild_2" 
                anweisung="Laden Sie ein weiteres Detailbild des Habitats hoch." 
                onBildUpload={handleBildUpload}
                existingImage={metadata.bilder.find(b => b.imageKey === "Detailbild_2")}
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <UploadedImageList bilder={metadata.bilder.filter(b => b.imageKey.startsWith("Detailbild"))} />
            </div>
            <div>
              <PlantIdentification 
                bilder={metadata.bilder.filter(b => b.imageKey.startsWith("Detailbild"))}
                onIdentificationComplete={handlePlantIdentification}
              />
            </div>
          </div>
        );
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
          <Summary 
            metadata={metadata}
            handlePDFDownload={handlePDFDownload}
          />
        );
      default:
        return "Unbekannter Schritt";
    }
  };

  // Debug-Komponente, um die aktuellen metadata als JSON anzuzeigen
  useEffect(() => {
    console.log("Aktuelle Bilder:", metadata.bilder);
  }, [metadata.bilder]);


  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <Progress value={(aktiverSchritt / (schritte.length - 1)) * 100} className="w-full" />
        <div className="flex justify-between mt-2">
          {schritte.map((label, index) => (
            <span key={label} className={`text-sm ${index === aktiverSchritt ? "font-bold" : ""}`}>
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>{schritte[aktiverSchritt]}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSchrittInhalt(aktiverSchritt)}
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="flex justify-between items-center mt-4 gap-4">
        <div className="flex gap-2">
          <Button 
            onClick={() => setAktiverSchritt(prev => prev - 1)} 
            disabled={aktiverSchritt === 0}
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
                  Analysierte Daten anzeigen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Analysierte Daten</DialogTitle>
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
          disabled={aktiverSchritt === schritte.length - 1}
          className="gap-2"
        >
          Weiter
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
    </div>
  );
} 