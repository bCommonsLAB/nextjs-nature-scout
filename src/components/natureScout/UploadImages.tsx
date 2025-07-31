"use client";

import { NatureScoutData, Bild, PlantNetResult } from "@/types/nature-scout";
import { GetImage } from "./GetImage";

import { useState, useEffect } from "react";

interface UploadImagesProps {
  metadata: NatureScoutData;
  setMetadata: React.Dispatch<React.SetStateAction<NatureScoutData>>;
  scrollToNext?: () => void;
  onUploadActiveChange?: (isActive: boolean) => void;
}

export function UploadImages({ 
  metadata, 
  setMetadata, 
  scrollToNext,
  onUploadActiveChange
}: UploadImagesProps) {
  // Zustand für aktive Uploads
  const [activeUploads, setActiveUploads] = useState<Record<string, boolean>>({
    "Panoramabild": false,
    "Detailansicht": false,
    "Detailbild_1": false,
    "Detailbild_2": false
  });
  


  const setUploadStatus = (imageKey: string, isUploading: boolean) => {
    setActiveUploads(prev => ({
      ...prev,
      [imageKey]: isUploading
    }));
  };
  
  // Bei Änderungen des activeUploads-Status den übergeordneten Komponente informieren
  useEffect(() => {
    // Prüfen, ob irgendein Upload aktiv ist und an die übergeordnete Komponente melden
    if (onUploadActiveChange) {
      const isAnyActive = Object.values(activeUploads).some(status => status);
      onUploadActiveChange(isAnyActive);
    }
  }, [activeUploads, onUploadActiveChange]);

  const handleBildUpload = (imageKey: string, filename: string, url: string, analysis: string, plantnetResult?: PlantNetResult, lowResUrl?: string) => {
    const neuesBild: Bild = {
      imageKey,
      filename,
      url,
      lowResUrl,
      analyse: analysis,
      plantnetResult
    };
      
    setMetadata(prev => ({
      ...prev,
      bilder: [...prev.bilder.filter(b => b.imageKey !== imageKey), neuesBild]
    }));

    // Optional: Nach erfolgreichem Upload zum Weiter-Button scrollen
    if (scrollToNext && imageKey === "Panoramabild") {
      setTimeout(() => {
        scrollToNext();
      }, 500);
    }
  };

  const handleDeleteImage = (imageKey: string) => {
    setMetadata(prev => ({
      ...prev,
      bilder: prev.bilder.filter(b => b.imageKey !== imageKey)
    }));
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-medium mb-3 text-black">Habitat übersicht erfassen</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <GetImage 
            imageTitle="Panoramabild" 
            anweisung="Panoramabild des gesamten Habitats" 
            onBildUpload={handleBildUpload}
            onDeleteImage={handleDeleteImage}
            existingImage={metadata.bilder.find(b => b.imageKey === "Panoramabild")}
            doAnalyzePlant={false}
            isUploading={activeUploads["Panoramabild"] ?? false}
            setIsUploading={(value) => setUploadStatus("Panoramabild", value)}
            schematicBg="/images/schema-panorama.svg"
          />
          <GetImage 
            imageTitle="Detailansicht" 
            anweisung="Detailansicht des Habitats" 
            onBildUpload={handleBildUpload}
            onDeleteImage={handleDeleteImage}
            existingImage={metadata.bilder.find(b => b.imageKey === "Detailansicht")}
            doAnalyzePlant={false}
            isUploading={activeUploads["Detailansicht"] ?? false}
            setIsUploading={(value) => setUploadStatus("Detailansicht", value)}
            schematicBg="/images/schema-detail.svg"
          />
        </div>
      </div>
      
      <div>
        <h2 className="text-lg font-medium mb-3 text-black">Typische Pflanzen erfassen</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <GetImage 
            imageTitle="Detailbild_1" 
            anweisung="zeige eine typische Pflanzenart" 
            onBildUpload={handleBildUpload}
            onDeleteImage={handleDeleteImage}
            existingImage={metadata.bilder.find(b => b.imageKey === "Detailbild_1")}
            doAnalyzePlant={true}
            isUploading={activeUploads["Detailbild_1"] ?? false}
            setIsUploading={(value) => setUploadStatus("Detailbild_1", value)}
            schematicBg="/images/schema-plant1.svg"
          />
          <GetImage 
            imageTitle="Detailbild_2" 
            anweisung="ein weitere typische Pflanzenart" 
            onBildUpload={handleBildUpload}
            onDeleteImage={handleDeleteImage}
            existingImage={metadata.bilder.find(b => b.imageKey === "Detailbild_2")}
            doAnalyzePlant={true}
            isUploading={activeUploads["Detailbild_2"] ?? false}
            setIsUploading={(value) => setUploadStatus("Detailbild_2", value)}
            schematicBg="/images/schema-plant2.svg"
          />
        </div>
      </div>
      

    </div>
  );
} 