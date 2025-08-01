"use client";

import { useState, useEffect } from "react";
import { Upload, X, Camera, AlertTriangle } from "lucide-react";
import { Progress } from "../ui/progress";
import { Bild, PlantNetResult } from "@/types/nature-scout";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { EnhancedCameraModal } from "./EnhancedCameraModal";

interface GetImageWithEnhancedCameraProps {
  imageTitle: string;
  imageKey: string;
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
  requiredOrientation?: 'landscape' | 'portrait';
}

export function GetImageWithEnhancedCamera({ 
  imageTitle, 
  imageKey,
  anweisung, 
  onBildUpload, 
  onDeleteImage,
  existingImage, 
  doAnalyzePlant = false,
  isUploading,
  setIsUploading,
  schematicBg,
  fullHeight = false,
  requiredOrientation
}: GetImageWithEnhancedCameraProps) {
  const [localUploadProgress, setLocalUploadProgress] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(existingImage?.url || null);
  const [progressPhase, setProgressPhase] = useState<'upload' | 'analyze' | 'complete'>('upload');
  const [isMobile, setIsMobile] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [showEnhancedCamera, setShowEnhancedCamera] = useState(false);
  const [backgroundImageStyle, setBackgroundImageStyle] = useState<React.CSSProperties>({});

  const isPanorama = requiredOrientation === 'landscape';
  const isPortrait = requiredOrientation === 'portrait';

  // Kamera-Verfügbarkeit prüfen
  useEffect(() => {
    const checkCameraAvailability = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraAvailable(false);
          return;
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        setCameraAvailable(true);
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        setCameraAvailable(false);
      }
    };

    checkCameraAvailability();
  }, []);

  // Mobile-Erkennung
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Hintergrundbild setzen
  useEffect(() => {
    if (existingImage?.url) {
      setUploadedImage(existingImage.url);
      setBackgroundImageStyle({
        backgroundImage: `url("${existingImage.lowResUrl || existingImage.url}")`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.3
      });
    } else if (schematicBg) {
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
  }, [existingImage, schematicBg]);

  // Vereinfachte Upload-Funktion (Original-Logik hier einfügen)
  const processImageFile = async (file: File) => {
    setIsUploading(true);
    setProgressPhase('upload');
    setLocalUploadProgress(10);

    try {
      // Hier würde die Original-Upload-Logik aus GetImage.tsx eingefügt werden
      const formData = new FormData();
      formData.append("image", file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error('Upload fehlgeschlagen');
      
      const result = await uploadResponse.json();
      
      setLocalUploadProgress(100);
      onBildUpload(
        imageKey,
        result.filename,
        result.url,
        result.analysis || "",
        undefined,
        result.lowResUrl
      );
      
      toast.success('Bild erfolgreich hochgeladen');
    } catch (error) {
      console.error('Upload-Fehler:', error);
      toast.error('Upload fehlgeschlagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleCameraCapture = (file: File) => {
    processImageFile(file);
  };

  const handleDeleteImage = () => {
    onDeleteImage(imageKey);
    setUploadedImage(null);
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
  };

  return (
    <>
      <div className={`
        ${fullHeight 
          ? isPanorama
            ? "w-full max-w-4xl" 
            : isPortrait
              ? "w-full max-w-md"
              : "w-full max-w-2xl"
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
          } border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-100 hover:bg-gray-200 p-4 sm:p-6 relative overflow-hidden`}
          style={backgroundImageStyle}
        >
          
          {uploadedImage && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 z-20"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteImage();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          <label htmlFor={`dropzone-file-${imageTitle}`} className="flex flex-col items-center justify-center w-full h-full relative z-10">
            {isUploading ? (
              <div className="w-full px-4 sm:px-6 bg-white/95 rounded-lg py-4 sm:py-6 shadow-md">
                <Progress value={localUploadProgress} className="w-full" />
                <p className="text-sm sm:text-base text-center mt-3 text-black font-semibold">
                  {Math.round(localUploadProgress)}% 
                  {progressPhase === 'upload' ? ' hochgeladen' : ' analysiert'}
                </p>
              </div>
            ) : (
              <>
                <h2 className={`${fullHeight ? "text-lg sm:text-2xl" : "text-sm"} font-bold text-center text-black bg-white/95 px-3 sm:px-4 py-2 rounded-lg shadow-md`}>
                  {imageTitle.replace(/_/g, ' ')}
                </h2>
                <p className={`${fullHeight ? "text-base sm:text-lg" : "text-xs"} text-center text-black max-w-md bg-white/95 px-2 sm:px-3 py-2 rounded-lg shadow-md mt-3`}>
                  {uploadedImage ? "Bild ersetzen" : anweisung}
                </p>
                
                {/* Kamera-Status für mobil */}
                {isMobile && cameraAvailable !== null && (
                  <div className={`${fullHeight ? "text-sm" : "text-xs"} bg-white/95 px-2 py-1 rounded-lg shadow-md mt-2 flex items-center justify-center gap-2`}>
                    {cameraAvailable ? (
                      <>
                        <Camera className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Kamera verfügbar</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-amber-600">Nur Galerie verfügbar</span>
                      </>
                    )}
                  </div>
                )}
                
                <Upload className={`${fullHeight ? "w-16 h-16 sm:w-20 sm:h-20" : "w-8 h-8"} my-4 sm:my-6 text-black`} />
                <p className={`${fullHeight ? "text-base sm:text-lg" : "text-xs"} text-black bg-white/95 px-2 sm:px-3 py-2 rounded-lg shadow-md`}>
                  {uploadedImage ? "Klicken zum Ersetzen" : "Klicken zum Hochladen"}
                </p>
                
                {/* Erweiterte Kamera-Schaltfläche */}
                {cameraAvailable && !uploadedImage && (
                  <div className="mt-4 flex gap-2">
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowEnhancedCamera(true);
                      }}
                      variant="outline"
                      className="flex items-center gap-2 bg-white/95 hover:bg-white text-black border-gray-300"
                    >
                      <Camera className="h-4 w-4" />
                      Erweiterte Kamera
                    </Button>
                  </div>
                )}
              </>
            )}
            
            <input 
              id={`dropzone-file-${imageTitle}`} 
              type="file" 
              className="hidden" 
              onChange={handleFileUpload}
              accept="image/*"
              capture={isMobile && cameraAvailable ? "environment" : undefined}
            />
          </label>
        </div>
        
        {uploadedImage && doAnalyzePlant && (
          <div className="mt-2 text-xs w-full">
            <p className="font-medium">Erkannte Pflanze:</p>
            <p className="text-gray-600">{existingImage?.analyse || "Analyse läuft..."}</p>
          </div>
        )}
      </div>

      {/* Erweiterte Kamera-Modal */}
      <EnhancedCameraModal
        isOpen={showEnhancedCamera}
        onClose={() => setShowEnhancedCamera(false)}
        onCapture={handleCameraCapture}
        title={imageTitle.replace(/_/g, ' ')}
        requiredOrientation={requiredOrientation}
      />
    </>
  );
}