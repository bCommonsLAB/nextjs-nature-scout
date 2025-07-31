"use client";

import { useState, useEffect } from "react";
import { Upload, X } from "lucide-react";
import { Progress } from "../ui/progress";
import { Bild, PlantNetResponse, PlantNetResult } from "@/types/nature-scout";
import { toast } from "sonner";
import Image from 'next/image';
import { Button } from "../ui/button";



interface GetImageProps {
  imageTitle: string;
  anweisung: string;
  onBildUpload: (
    imageKey: string,
    filename: string,
    url: string,
    bestMatch: string,
    result?: PlantNetResult,
    lowResUrl?: string
  ) => void;
  onDeleteImage: (imageKey: string) => void;
  existingImage: Bild | undefined;
  doAnalyzePlant?: boolean;
  isUploading: boolean;
  setIsUploading: (value: boolean) => void;
  schematicBg?: string;
  fullHeight?: boolean;
}

export function GetImage({ 
  imageTitle, 
  anweisung, 
  onBildUpload, 
  onDeleteImage,
  existingImage, 
  doAnalyzePlant = false,
  isUploading,
  setIsUploading,
  schematicBg,
  fullHeight = false
}: GetImageProps) {
  // Prüfe ob es sich um ein Panoramabild handelt
  const isPanorama = imageTitle.toLowerCase().includes('panorama');
  // Prüfe ob es sich um ein Hochformat-Bild handelt (Detailbild und Pflanzenbilder)
  const isPortrait = imageTitle.toLowerCase().includes('detail') || imageTitle.toLowerCase().includes('pflanzenbild');
  
  const [localUploadProgress, setLocalUploadProgress] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(existingImage?.url || null);
  const [progressPhase, setProgressPhase] = useState<'upload' | 'analyze' | 'complete'>('upload');
  const [backgroundImageStyle, setBackgroundImageStyle] = useState<React.CSSProperties>(
    existingImage?.url ? {
      backgroundImage: `url("${existingImage.lowResUrl || existingImage.url}")`,
      backgroundSize: isPortrait ? 'cover' : 'contain',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      opacity: 0.3
    } : schematicBg ? {
      backgroundImage: `url("${schematicBg}")`,
      backgroundSize: 'contain',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      opacity: 0.08
    } : {}
  );

  useEffect(() => {
    if (existingImage?.url) {
      setUploadedImage(existingImage.url);
      setBackgroundImageStyle({
        backgroundImage: `url("${existingImage.lowResUrl || existingImage.url}")`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.3 // Dezenter für bessere Sichtbarkeit der Upload-Elemente
      });
    } else if (schematicBg) {
      setBackgroundImageStyle({
        backgroundImage: `url("${schematicBg}")`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.08
      });
    }
  }, [existingImage, schematicBg]);

  // Timer für kontinuierliche Fortschrittsanzeige
  useEffect(() => {
    let progressTimer: NodeJS.Timeout | null = null;
    
    if (isUploading) {
      if (progressPhase === 'upload' && localUploadProgress < 60) {
        // Upload-Phase (0-60%)
        progressTimer = setInterval(() => {
          setLocalUploadProgress(prevProgress => {
            if (prevProgress < 10) return 10; // Sofort auf 10% setzen
            if (prevProgress < 30) return prevProgress + 0.8;
            if (prevProgress < 50) return prevProgress + 0.4;
            return Math.min(prevProgress + 0.2, 59); // Maximal 59% bis Upload fertig
          });
        }, 100);
      } else if (progressPhase === 'analyze' && localUploadProgress < 90) {
        // Analyse-Phase (60-90%)
        progressTimer = setInterval(() => {
          setLocalUploadProgress(prevProgress => {
            if (prevProgress < 70) return prevProgress + 0.3;
            if (prevProgress < 80) return prevProgress + 0.2;
            return Math.min(prevProgress + 0.1, 89); // Maximal 89% bis Analyse fertig
          });
        }, 100);
      }
    }
    
    return () => {
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [isUploading, localUploadProgress, progressPhase]);

  async function uploadImage(imageUrl: string, filename: string): Promise<{ url: string; lowResUrl: string; filename: string }> {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const file = new File([blob], filename, { type: blob.type });

    const formData = new FormData();
    formData.append("image", file);

    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) throw new Error('Upload fehlgeschlagen');
    return await uploadResponse.json();
  }

  async function processImage(
    imageSource: File | string,
    originalFileName: string,
    doAnalyzePlant: boolean
  ): Promise<{
    url: string;
    lowResUrl: string;
    filename: string;
    analysis: PlantNetResponse | null;
  }> {
    setProgressPhase('upload');
    setLocalUploadProgress(5);
    
    let uploadResult;
    if (typeof imageSource === 'string') {
      uploadResult = await uploadImage(imageSource, originalFileName);
    } else {
      const formData = new FormData();
      formData.append("image", imageSource);
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        // Verbesserte Fehlerbehandlung
        const errorData = await uploadResponse.json().catch(() => null);
        throw new Error(
          errorData?.error || 
          `Upload fehlgeschlagen mit Status ${uploadResponse.status}`
        );
      }
      uploadResult = await uploadResponse.json();
    }

    setLocalUploadProgress(60);

    let analysis = null;
    if (doAnalyzePlant) {
      setProgressPhase('analyze');
      analysis = await analyzePlants([uploadResult.url]);
      setLocalUploadProgress(90);
    }

    setProgressPhase('complete');
    return { 
      url: uploadResult.url,
      lowResUrl: uploadResult.lowResUrl, 
      filename: uploadResult.filename, 
      analysis 
    };
  }

  const handleBildUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setProgressPhase('upload');
    setLocalUploadProgress(5);

    try {
      const { url, lowResUrl, filename, analysis } = await processImage(
        file,
        file.name,
        doAnalyzePlant
      );

      updateUIWithImage(url, {
        imageTitle,
        filename,
        lowResUrl,
        bestMatch: analysis?.bestMatch || "",
        result: analysis?.results[0]
      });

      setLocalUploadProgress(100);
      toast.success(
        doAnalyzePlant 
          ? 'Bild hochgeladen und Pflanze analysiert'
          : 'Bild hochgeladen'
      );
    } catch (error) {
      console.error("❌ Fehler beim Hochladen oder Analysieren:", error);
      // Detaillierte Fehlermeldung anzeigen
      toast.error(
        error instanceof Error 
          ? `Fehler: ${error.message}`
          : 'Fehler beim Hochladen oder Analysieren des Bildes'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSampleImageClick = async (sampleSrc: string) => {
    setIsUploading(true);
    setProgressPhase('upload');
    setLocalUploadProgress(5);

    try {
      const pathParts = sampleSrc.split('/');
      const originalFileName = pathParts[pathParts.length - 1];

      const { url, lowResUrl, filename, analysis } = await processImage(
        sampleSrc,
        originalFileName || '',
        doAnalyzePlant
      );

      updateUIWithImage(url, {
        imageTitle,
        filename,
        lowResUrl,
        bestMatch: analysis?.bestMatch || "",
        result: analysis?.results[0]
      });

      setLocalUploadProgress(100);
      toast.success(
        doAnalyzePlant 
          ? 'Beispielbild hochgeladen und Pflanze analysiert'
          : 'Beispielbild hochgeladen'
      );
    } catch (error) {
      console.error("Fehler beim Verarbeiten des Beispielbildes:", error);
      // Detaillierte Fehlermeldung anzeigen
      toast.error(
        error instanceof Error 
          ? `Fehler: ${error.message}`
          : 'Fehler beim Verarbeiten des Beispielbildes'
      );
    } finally {
      setIsUploading(false);
    }
  };

  function updateUIWithImage(
    url: string, 
    data: { 
      imageTitle: string;
      filename: string;
      lowResUrl: string;
      bestMatch: string;
      result?: PlantNetResult;
    }
  ) {
    setUploadedImage(url);
    // Für hochgeladene Bilder verwenden wir die Low-Res Version als Hintergrund
    setBackgroundImageStyle({
      backgroundImage: `url("${data.lowResUrl || url}")`,
      backgroundSize: 'contain',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      opacity: 0.3 // Dezenter für bessere Sichtbarkeit der Upload-Elemente
    });

    onBildUpload(
      data.imageTitle,
      data.filename,
      url,
      data.bestMatch,
      data.result,
      data.lowResUrl
    );
  }

  async function analyzePlants(imageUrls: string[]) {
    const response = await fetch('/api/analyze/plants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrls }),
    });

    if (!response.ok) {
      throw new Error('Analyse fehlgeschlagen');
    }

    return await response.json() as PlantNetResponse;
  }

  return (
    <div className={fullHeight ? "h-screen max-h-[70vh] flex flex-col" : ""}>
      <div className={`relative ${
        fullHeight 
          ? isPanorama 
            ? "flex-1 max-w-4xl" 
            : "flex-1 max-w-2xl" 
          : "max-w-xs"
      } mx-auto`}>
        <div 
          className={`flex flex-col items-center justify-center ${
            fullHeight 
              ? isPanorama
                ? "h-full min-h-[50vh] w-full aspect-video max-h-[60vh]" 
                : isPortrait
                  ? "h-full min-h-[60vh] w-full aspect-[9/16] max-w-md mx-auto"
                  : "h-full min-h-[60vh] w-full" 
              : "h-[150px] w-[150px]"
          } border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-100 hover:bg-gray-200 p-6 ${uploadedImage ? "" : "space-y-2"} relative overflow-hidden`}
        >
          {/* Hintergrundbild Container */}
          {backgroundImageStyle.backgroundImage && (
            <div 
              className={`absolute rounded-lg ${
                isPanorama 
                  ? "inset-6" 
                  : isPortrait 
                    ? "inset-8 top-8 bottom-8 left-1/2 transform -translate-x-1/2 w-3/4"
                    : "inset-6"
              }`}
              style={{
                ...backgroundImageStyle,
                zIndex: 1
              }}
            />
          )}
          
          {uploadedImage && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 z-20"
              onClick={(e) => {
                e.preventDefault();
                onDeleteImage(imageTitle);
                setUploadedImage(null);
                // Zurück zum Schema-Bild falls vorhanden
                if (schematicBg) {
                  setBackgroundImageStyle({
                    backgroundImage: `url("${schematicBg}")`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    opacity: 0.08
                  });
                } else {
                  setBackgroundImageStyle({});
                }
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          <label htmlFor={`dropzone-file-${imageTitle}`} className="flex flex-col items-center justify-center w-full h-full relative z-10">
            {isUploading ? (
              <div className="w-full px-6 bg-white/95 rounded-lg py-6 shadow-md">
                <Progress value={localUploadProgress} className="w-full" />
                <p className="text-base text-center mt-3 text-black font-semibold">
                  {Math.round(localUploadProgress)}% 
                  {progressPhase === 'analyze' ? ' analysiert' : ' hochgeladen'}
                </p>
              </div>
            ) : (
              <>
                <h2 className={`${fullHeight ? "text-2xl" : "text-sm"} font-bold text-center text-black bg-white/95 px-4 py-2 rounded-lg shadow-md`}>
                  {imageTitle.replace(/_/g, ' ')}
                </h2>
                <p className={`${fullHeight ? "text-lg" : "text-xs"} text-center text-black max-w-md bg-white/95 px-3 py-2 rounded-lg shadow-md mt-3`}>
                  {uploadedImage ? "Bild ersetzen" : anweisung}
                </p>
                <Upload className={`${fullHeight ? "w-20 h-20" : "w-8 h-8"} my-6 text-black`} />
                <p className={`${fullHeight ? "text-lg" : "text-xs"} text-black bg-white/95 px-3 py-2 rounded-lg shadow-md`}>
                  {uploadedImage ? "Klicken zum Ersetzen" : "Klicken zum Hochladen"}
                </p>
              </>
            )}
            <input 
              id={`dropzone-file-${imageTitle}`} 
              type="file" 
              className="hidden" 
              onChange={handleBildUpload}
              accept="image/*"
            />
          </label>
        </div>
        
        {uploadedImage && doAnalyzePlant && (
          <div className="mt-2 text-xs w-[150px]">
            <p className="font-medium">Erkannte Pflanze:</p>
            <p className="text-gray-600">{existingImage?.analyse || "Analyse läuft..."}</p>
          </div>
        )}
      </div>
    </div>
  );
} 