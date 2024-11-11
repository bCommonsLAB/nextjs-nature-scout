"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Welcome } from "./welcome";
import { GetImage } from "./get-image";
import { Summary } from "./summary";
import { UploadedImageList } from "./uploaded-image-list";
import { ImageAnalysis } from "./image-analysis";
import { Bild, AnalyseErgebnis } from "@/types/nature-scout";

const schritte = [
  "Einführung",
  "Bilder hochladen",
  "Habitat analysieren",
  "Abschlussbewertung"
];

export function NatureScout() {
  const [aktiverSchritt, setAktiverSchritt] = useState(0);
  const [bilder, setBilder] = useState<Bild[]>([]);
  const [analyseErgebnis, setAnalyseErgebnis] = useState<AnalyseErgebnis | null>(null);

  const handleBildUpload = (imageKey: string, filename: string, url: string, analysis: string) => {
    const neuesBild: Bild = {
      imageKey,
      filename,
      url,
      analyse: analysis 
    };
    
    setBilder(prev => {
      // Entferne zuerst alle Bilder mit demselben imageKey
      const gefilterteBilder = prev.filter(bild => bild.imageKey !== imageKey);
      // Füge das neue Bild hinzu
      return [...gefilterteBilder, neuesBild];
    });
  };

  const handleAnalysisComplete = (analysedBilder: Bild[], ergebnis: AnalyseErgebnis) => {
    setBilder(analysedBilder);
    setAnalyseErgebnis(ergebnis);
    //setAktiverSchritt(prev => prev + 1);
  };

  const handlePDFDownload = () => {
    console.log("PDF-Download wurde angefordert");
    // Hier würde die tatsächliche PDF-Generierung und der Download implementiert werden
  };

  const renderSchrittInhalt = (schritt: number) => {
    switch (schritt) {
      case 0:
        return <Welcome />;
      case 1:
        return (
          <div>
            <p>Habitat bestimmen</p>
            <div className="flex flex-wrap justify-center gap-4">
              <GetImage 
                imageTitle="Panoramabild" 
                anweisung="Laden Sie ein Panoramabild des gesamten Habitats hoch." 
                onBildUpload={handleBildUpload}
                existingImage={bilder.find(b => b.imageKey === "Panoramabild")}
              />
              <GetImage 
                imageTitle="Detailbild_1" 
                anweisung="Laden Sie ein Detailbild des Habitats hoch." 
                onBildUpload={handleBildUpload}
                existingImage={bilder.find(b => b.imageKey === "Detailbild_1")}
              />
              <GetImage 
                imageTitle="Detailbild_2" 
                anweisung="Laden Sie ein weiteres Detailbild des Habitats hoch." 
                onBildUpload={handleBildUpload}
                existingImage={bilder.find(b => b.imageKey === "Detailbild_2")}
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <UploadedImageList bilder={bilder} />
            </div>
            <div>
              <ImageAnalysis 
                bilder={bilder} 
                analyseErgebnis={analyseErgebnis}
                onAnalysisComplete={handleAnalysisComplete} 
              />
            </div>
          </div>
        );
      case 3:
        return (
          <Summary 
            analyseErgebnis={analyseErgebnis}
            handlePDFDownload={handlePDFDownload}
          />
        );
      default:
        return "Unbekannter Schritt";
    }
  };

  useEffect(() => {
    console.log("Aktuelle Bilder:", bilder);
  }, [bilder]);

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
    </div>
  );
} 