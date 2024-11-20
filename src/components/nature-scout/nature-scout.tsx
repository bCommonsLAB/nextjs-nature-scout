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
import { Bild, NatureScoutData, AnalyseErgebnis } from "@/types/nature-scout";
import { LocationDetermination } from './locationDetermination';

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

  const handleAnalysisComplete = (analysedBilder: Bild[], ergebnis: AnalyseErgebnis) => {
    setMetadata(prev => ({
      ...prev,
      bilder: analysedBilder,
      analyseErgebnis: ergebnis
    }));
    //setAktiverSchritt(prev => prev + 1);
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

  const DebugMetadata = ({ metadata }: { metadata: NatureScoutData }) => (
    <pre className="bg-gray-200 p-2 rounded text-xs">
      {JSON.stringify(metadata, null, 2)}
    </pre>
  );

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
      <div className="flex justify-between mt-4">
        <Button 
          onClick={() => setAktiverSchritt(prev => prev - 1)} 
          disabled={aktiverSchritt === 0}
        >
          Zurück
        </Button>
        <Button 
          onClick={() => setAktiverSchritt(prev => prev + 1)} 
          disabled={aktiverSchritt === schritte.length - 1}
        >
          Weiter
        </Button>
      </div>
      <DebugMetadata metadata={metadata} />
    </div>
  );
} 