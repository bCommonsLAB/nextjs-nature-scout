"use client";

import { NatureScoutData, Bild, PlantNetResult } from "@/types/nature-scout";
import { GetImage } from "./GetImage";
import { useState, useEffect } from "react";
import { useNatureScoutState } from "@/context/nature-scout-context";

interface SingleImageUploadProps {
  metadata: NatureScoutData;
  setMetadata: React.Dispatch<React.SetStateAction<NatureScoutData>>;
  imageKey: string;
  title: string;
  instruction: string;
  doAnalyzePlant: boolean;
  schematicBg?: string;
  onUploadActiveChange?: (isActive: boolean) => void;
  requiredOrientation?: 'landscape' | 'portrait'; // Neue Prop für die gewünschte Orientierung
}

export function SingleImageUpload({ 
  metadata, 
  setMetadata, 
  imageKey,
  title,
  instruction,
  doAnalyzePlant,
  schematicBg,
  onUploadActiveChange,
  requiredOrientation
}: SingleImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  // jobId des aktiven Entwurfs (für serverseitiges Verknüpfen des Bildes, Session 1.3)
  // localSessionId: aktive Offline-Session (Bild lokal ablegen, Session 2.5)
  const { jobId, editJobId, localSessionId } = useNatureScoutState();
  const draftJobId = jobId || editJobId || null;

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
      plantnetResult,
      // Stabile Client-ID je Slot (Idempotenz beim serverseitigen Verknüpfen/Sync)
      clientImageId: imageKey
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
        imageKey={imageKey} // Neuer Parameter
        jobId={draftJobId}
        localSessionId={localSessionId}
        anweisung={instruction}
        onBildUpload={handleBildUpload}
        onDeleteImage={handleDeleteImage}
        existingImage={existingImage}
        doAnalyzePlant={doAnalyzePlant}
        isUploading={isUploading}
        setIsUploading={setIsUploading}
        schematicBg={schematicBg}
        fullHeight={true}
        requiredOrientation={requiredOrientation} // Neue Prop weitergeben
      />
    </div>
  );
}