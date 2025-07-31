"use client";

import { NatureScoutData, Bild, PlantNetResult } from "@/types/nature-scout";
import { GetImage } from "./GetImage";
import { useState, useEffect } from "react";

interface SingleImageUploadProps {
  metadata: NatureScoutData;
  setMetadata: React.Dispatch<React.SetStateAction<NatureScoutData>>;
  imageKey: string;
  title: string;
  instruction: string;
  doAnalyzePlant: boolean;
  schematicBg?: string;
  onUploadActiveChange?: (isActive: boolean) => void;
}

export function SingleImageUpload({ 
  metadata, 
  setMetadata, 
  imageKey,
  title,
  instruction,
  doAnalyzePlant,
  schematicBg,
  onUploadActiveChange
}: SingleImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  
  // Upload-Status an übergeordnete Komponente weiterleiten
  useEffect(() => {
    if (onUploadActiveChange) {
      onUploadActiveChange(isUploading);
    }
  }, [isUploading, onUploadActiveChange]);

  const handleBildUpload = (
    imageKey: string, 
    filename: string, 
    url: string, 
    analysis: string, 
    plantnetResult?: PlantNetResult, 
    lowResUrl?: string
  ) => {
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
  };

  const handleDeleteImage = (imageKey: string) => {
    setMetadata(prev => ({
      ...prev,
      bilder: prev.bilder.filter(b => b.imageKey !== imageKey)
    }));
  };

  const existingImage = metadata.bilder.find(b => b.imageKey === imageKey);

  return (
    <div className="h-full">
      <GetImage 
        imageTitle={title} 
        anweisung={instruction}
        onBildUpload={handleBildUpload}
        onDeleteImage={handleDeleteImage}
        existingImage={existingImage}
        doAnalyzePlant={doAnalyzePlant}
        isUploading={isUploading}
        setIsUploading={setIsUploading}
        schematicBg={schematicBg}
        fullHeight={true}
      />
    </div>
  );
}