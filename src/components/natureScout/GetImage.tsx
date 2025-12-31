"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, X, RotateCw, Smartphone, Camera, AlertTriangle } from "lucide-react";
import { Progress } from "../ui/progress";
import { Bild, PlantNetResponse, PlantNetResult } from "@/types/nature-scout";
import { toast } from "sonner";
import Image from 'next/image';
import { Button } from "../ui/button";
import { detectBrowserEnvironment } from "@/lib/utils";

interface GetImageProps {
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

export function GetImage({ 
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
}: GetImageProps) {
  const isPanorama = requiredOrientation === 'landscape';
  const isPortrait = requiredOrientation === 'portrait';
  
  const [localUploadProgress, setLocalUploadProgress] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(existingImage?.url || null);
  const [progressPhase, setProgressPhase] = useState<'upload' | 'analyze' | 'complete'>('upload');
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showOrientationDialog, setShowOrientationDialog] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [showCameraHint, setShowCameraHint] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [backgroundImageStyle, setBackgroundImageStyle] = useState<React.CSSProperties>(
    existingImage?.url ? {
      backgroundImage: `url("${existingImage.lowResUrl || existingImage.url}")`,
      backgroundSize: isPortrait ? '85%' : '85%',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      opacity: 0.3
    } : schematicBg ? {
      backgroundImage: `url("${schematicBg}")`,
      backgroundSize: '80%',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      opacity: 0.08
    } : {}
  );

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

  // Mobile-Erkennung und Orientierung
  // Verwendet detectBrowserEnvironment() für zuverlässige Mobile-Erkennung
  // Zeigt Orientierungshinweis nur auf echten Mobile-Geräten an, nicht auf Desktop
  useEffect(() => {
    const checkOrientation = () => {
      const landscape = window.innerWidth > window.innerHeight;
      // Verwende detectBrowserEnvironment() für zuverlässige Mobile-Erkennung
      const { isMobile: isMobileDevice } = detectBrowserEnvironment();
      
      setIsLandscape(landscape);
      setIsMobile(isMobileDevice);
      
      // Zeige Dialog nur auf echten Mobile-Geräten, nicht auf Desktop
      if (isMobileDevice && requiredOrientation) {
        if (requiredOrientation === 'landscape' && !landscape) {
          setShowOrientationDialog(true);
        } else if (requiredOrientation === 'portrait' && landscape) {
          setShowOrientationDialog(true);
        } else {
          setShowOrientationDialog(false);
        }
      } else {
        // Auf Desktop immer ausblenden
        setShowOrientationDialog(false);
      }
    };
    
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [requiredOrientation]);

  // Hintergrundbild setzen
  useEffect(() => {
    if (existingImage?.url) {
      setUploadedImage(existingImage.url);
      setBackgroundImageStyle({
        backgroundImage: `url("${existingImage.lowResUrl || existingImage.url}")`,
        backgroundSize: '85%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.3
      });
    } else {
      setUploadedImage(null);
      if (schematicBg) {
        setBackgroundImageStyle({
          backgroundImage: `url("${schematicBg}")`,
          backgroundSize: '80%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.08
        });
      } else {
        setBackgroundImageStyle({});
      }
    }
  }, [existingImage, schematicBg]);

  // Progress zurücksetzen
  useEffect(() => {
    setLocalUploadProgress(0);
    setProgressPhase('upload');
  }, [imageKey]);

  // Timer für Fortschritt
  useEffect(() => {
    let progressTimer: NodeJS.Timeout | null = null;
    
    if (isUploading) {
      if (progressPhase === 'upload' && localUploadProgress < 60) {
        progressTimer = setInterval(() => {
          setLocalUploadProgress(prevProgress => {
            if (prevProgress < 10) return 10;
            if (prevProgress < 30) return prevProgress + 0.8;
            if (prevProgress < 50) return prevProgress + 0.4;
            return Math.min(prevProgress + 0.2, 59);
          });
        }, 100);
      } else if (progressPhase === 'analyze' && localUploadProgress < 90) {
        progressTimer = setInterval(() => {
          setLocalUploadProgress(prevProgress => {
            if (prevProgress < 70) return prevProgress + 0.3;
            if (prevProgress < 80) return prevProgress + 0.2;
            return Math.min(prevProgress + 0.1, 89);
          });
        }, 100);
      }
    }
    
    return () => {
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [isUploading, localUploadProgress, progressPhase]);

  // Standard Kamera-Funktionen
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setShowCameraModal(true);
    } catch (error) {
      console.error('Fehler beim Starten der Kamera:', error);
      toast.error('Kamera konnte nicht gestartet werden.');
      setShowCameraHint(true);
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
  }

  async function capturePhoto(): Promise<File | null> {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Kamera nicht bereit');
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      toast.error('Canvas nicht verfügbar');
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const timestamp = Date.now();
          const file = new File([blob], `camera_${timestamp}.jpg`, {
            type: 'image/jpeg',
            lastModified: timestamp
          });
          resolve(file);
        } else {
          toast.error('Foto konnte nicht aufgenommen werden');
          resolve(null);
        }
      }, 'image/jpeg', 0.92);
    });
  }

  // Upload und Verarbeitung
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

  async function compressImageOnClient(file: File): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();
      
      img.onload = () => {
        const fileSizeMB = file.size / 1024 / 1024;
        
        let MAX_WIDTH, MAX_HEIGHT, COMPRESSION_QUALITY;
        
        if (fileSizeMB > 10) {
          MAX_WIDTH = 1600;
          MAX_HEIGHT = 1600;
          COMPRESSION_QUALITY = 0.7;
        } else if (fileSizeMB > 5) {
          MAX_WIDTH = 2000;
          MAX_HEIGHT = 2000;
          COMPRESSION_QUALITY = 0.8;
        } else {
          MAX_WIDTH = 2400;
          MAX_HEIGHT = 2400;
          COMPRESSION_QUALITY = 0.85;
        }

        let { width, height } = img;
        
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', COMPRESSION_QUALITY);
      };
      
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }

  async function processImage(file: File, filename: string, doAnalyzePlant: boolean) {
    setProgressPhase('upload');
    
    const compressedFile = await compressImageOnClient(file);
    
    setLocalUploadProgress(20);
    
    const imageUrl = URL.createObjectURL(compressedFile);
    const { url, lowResUrl, filename: uploadedFilename } = await uploadImage(imageUrl, filename);
    
    setLocalUploadProgress(60);
    
    let analysis: { bestMatch: string; results: PlantNetResult[] } = { bestMatch: "", results: [] };
    
    if (doAnalyzePlant) {
      setProgressPhase('analyze');
      setLocalUploadProgress(65);
      
      try {
        const plantResponse = await analyzePlants([url]);
        if (plantResponse.results && plantResponse.results.length > 0) {
          const bestMatch = plantResponse.results[0];
          analysis = {
            bestMatch: bestMatch?.species?.scientificNameWithoutAuthor || "Unbekannte Pflanze",
            results: plantResponse.results
          };
        }
      } catch (error) {
        console.error("Fehler bei der Pflanzenanalyse:", error);
        analysis = { bestMatch: "Analyse fehlgeschlagen", results: [] };
      }
    }
    
    URL.revokeObjectURL(imageUrl);
    
    return {
      url,
      lowResUrl,
      filename: uploadedFilename,
      analysis
    };
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
    setBackgroundImageStyle({
      backgroundImage: `url("${data.lowResUrl || url}")`,
      backgroundSize: '85%',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      opacity: 0.3
    });

    onBildUpload(
      imageKey,
      data.filename,
      url,
      data.bestMatch,
      data.result,
      data.lowResUrl
    );
  }

  // Event Handlers
  const handleBildUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
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
          : 'Bild erfolgreich hochgeladen'
      );
    } catch (error) {
      console.error("Upload-Fehler:", error);
      toast.error('Upload fehlgeschlagen');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  async function handleCameraCapture() {
    const file = await capturePhoto();
    if (file) {
      stopCamera();
      
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
            ? 'Foto aufgenommen und Pflanze analysiert'
            : 'Foto aufgenommen'
        );
      } catch (error) {
        console.error("Kamera-Fehler:", error);
        toast.error('Fehler beim Verarbeiten des Fotos');
      } finally {
        setIsUploading(false);
      }
    }
  }

  // Dialoge und UI-Komponenten
  // Orientierungs-Dialog: Zeigt Hinweis für Quer-/Hochformat
  // Kann vom Nutzer geschlossen werden, falls Datei-Upload statt Foto-Aufnahme gewünscht ist
  const OrientationDialog = () => {
    if (!showOrientationDialog) return null;

    const isRequiringLandscape = requiredOrientation === 'landscape';

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 max-w-sm text-center shadow-xl relative">
          {/* Schließen-Button oben rechts */}
          <button
            onClick={() => setShowOrientationDialog(false)}
            className="absolute top-2 right-2 text-white/70 hover:text-white transition-colors"
            aria-label="Dialog schließen"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex justify-center mb-4">
            <Smartphone 
              className={`h-12 w-12 text-white transition-transform duration-500 ${
                isRequiringLandscape ? 'rotate-90' : 'rotate-0'
              }`} 
            />
          </div>
          
          <h3 className="text-lg font-semibold mb-2 text-white">
            {isRequiringLandscape ? "Querformat benötigt" : "Hochformat benötigt"}
          </h3>
          
          <p className="text-gray-200 mb-4">
            {isRequiringLandscape 
              ? "Bitte drehen Sie Ihr Gerät ins Querformat für die bestmögliche Aufnahme des Panoramabilds."
              : "Bitte drehen Sie Ihr Gerät ins Hochformat für die optimale Aufnahme."
            }
          </p>
          
          {/* Schließen-Button unten */}
          <Button 
            onClick={() => setShowOrientationDialog(false)}
            variant="outline"
            className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30"
          >
            Überspringen
          </Button>
        </div>
      </div>
    );
  };

  const CameraHintDialog = () => {
    if (!showCameraHint || !isMobile) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 max-w-sm text-center shadow-xl">
          <div className="flex justify-center mb-4">
            {cameraAvailable === false ? (
              <AlertTriangle className="h-8 w-8 text-white" />
            ) : (
              <Camera className="h-8 w-8 text-white" />
            )}
          </div>
          
          <h3 className="text-lg font-semibold mb-2 text-white">
            {cameraAvailable === false ? "Keine Kamera verfügbar" : "Kamera-Hinweis"}
          </h3>
          
          <div className="text-gray-200 mb-4 space-y-2">
            {cameraAvailable === false ? (
              <>
                <p>Auf diesem Gerät wurde keine Kamera gefunden.</p>
                <p className="text-sm">Sie können trotzdem Bilder aus der Galerie auswählen.</p>
              </>
            ) : (
              <>
                <p>Wenn die Kamera nicht funktioniert:</p>
                <ul className="text-sm text-left space-y-1">
                  <li>• Kamera-Berechtigung erteilen</li>
                  <li>• Browser neu laden</li>
                  <li>• Bilder aus Galerie wählen</li>
                </ul>
              </>
            )}
          </div>
          
          <Button 
            onClick={() => setShowCameraHint(false)}
            className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30"
          >
            Verstanden
          </Button>
        </div>
      </div>
    );
  };

  const CameraModal = () => {
    if (!showCameraModal) return null;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10000] p-4">
        <div className="bg-white rounded-lg p-4 max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Foto aufnehmen - {imageTitle.replace(/_/g, ' ')}
            </h3>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={stopCamera}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          <div className="flex-1 flex flex-col items-center">
            <div className="relative bg-black rounded-lg overflow-hidden max-w-full max-h-[60vh]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ 
                  transform: 'scaleX(-1)',
                  maxWidth: '800px',
                  maxHeight: '600px'
                }}
              />
              
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full border-2 border-white/20">
                  <div className="absolute top-1/3 left-0 right-0 h-0 border-t border-white/20"></div>
                  <div className="absolute top-2/3 left-0 right-0 h-0 border-t border-white/20"></div>
                  <div className="absolute top-0 bottom-0 left-1/3 w-0 border-l border-white/20"></div>
                  <div className="absolute top-0 bottom-0 left-2/3 w-0 border-l border-white/20"></div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 mt-6">
              <Button 
                variant="outline" 
                onClick={stopCamera}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Abbrechen
              </Button>
              
              <Button 
                onClick={handleCameraCapture}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                disabled={isUploading}
              >
                <Camera className="h-4 w-4" />
                {isUploading ? 'Verarbeitet...' : 'Foto aufnehmen'}
              </Button>
            </div>
            
            <canvas
              ref={canvasRef}
              className="hidden"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <OrientationDialog />
      <CameraHintDialog />
      <CameraModal />
      
      <div className={`
        ${fullHeight 
          ? isPanorama
            ? "w-full max-w-4xl" 
            : isPortrait
              ? "w-full max-w-md"
              : "w-full max-w-2xl"
          : "max-w-xs"
        } mx-auto`}>
        
        {/* Upload-Anzeigebereich */}
        <div 
          className={`flex flex-col items-center justify-center ${
            fullHeight 
              ? isPanorama
                ? "h-full min-h-[50vh] w-full aspect-video max-h-[60vh]" 
                : isPortrait
                  ? "h-full min-h-[60vh] w-full aspect-[9/16] max-w-md mx-auto"
                  : "h-full min-h-[60vh] w-full" 
              : "h-[150px] w-[150px]"
          } border-2 border-dashed border-gray-300 rounded-xl bg-gray-100 p-4 sm:p-6 relative overflow-hidden`}
        >
          {/* Hintergrundbild - separates Element für korrekte Opacity */}
          {backgroundImageStyle.backgroundImage && (
            <div 
              className="absolute inset-0 rounded-xl"
              style={{
                backgroundImage: backgroundImageStyle.backgroundImage,
                backgroundSize: backgroundImageStyle.backgroundSize,
                backgroundPosition: backgroundImageStyle.backgroundPosition,
                backgroundRepeat: backgroundImageStyle.backgroundRepeat,
                opacity: backgroundImageStyle.opacity,
                zIndex: 1
              }}
            />
          )}
          {/* Kamera-Status oben rechts */}
          <div className="absolute top-2 right-2 z-20">
            <div className="text-xs bg-white/95 px-2 py-1 rounded-lg shadow-md flex items-center gap-1">
              {cameraAvailable !== null && (
                <>
                  {cameraAvailable ? (
                    <>
                      <Camera className="w-3 h-3 text-green-600" />
                      <span className="text-green-600">Kamera</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span className="text-amber-600">Galerie</span>
                    </>
                  )}
                </>
              )}
              <span className="text-gray-500 ml-1">
                {isMobile ? "📱" : "💻"}
              </span>
            </div>
          </div>

          {/* Delete Button für hochgeladene Bilder */}
          {uploadedImage && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 left-2 z-20"
              onClick={(e) => {
                e.preventDefault();
                onDeleteImage(imageKey);
                setUploadedImage(null);
                if (schematicBg) {
                  setBackgroundImageStyle({
                    backgroundImage: `url("${schematicBg}")`,
                    backgroundSize: '80%',
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

          {/* Content - über dem Hintergrundbild */}
          <label htmlFor={`dropzone-file-${imageTitle}`} className="relative z-10 flex flex-col items-center justify-center w-full h-full cursor-pointer">
            {isUploading ? (
              <div className="w-full px-4 sm:px-6 bg-white/95 rounded-lg py-4 sm:py-6 shadow-md">
                <Progress value={localUploadProgress} className="w-full" />
                <p className="text-sm sm:text-base text-center mt-3 text-black font-semibold">
                  {Math.round(localUploadProgress)}% 
                  {progressPhase === 'upload' && localUploadProgress <= 20 && localUploadProgress > 5 
                    ? ' komprimiert' 
                    : progressPhase === 'analyze' 
                      ? ' analysiert' 
                      : ' hochgeladen'
                  }
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
                <Upload className={`${fullHeight ? "w-24 h-24 sm:w-32 sm:h-32" : "w-12 h-12"} my-4 sm:my-6 text-black`} />
                <p className={`${fullHeight ? "text-base sm:text-lg" : "text-xs"} text-black bg-white/95 px-2 sm:px-3 py-2 rounded-lg shadow-md`}>
                  {uploadedImage ? "Klicken zum Ersetzen" : "Klicken zum Hochladen"}
                </p>
              </>
            )}
          </label>
          {/* File Input */}
          <input 
            id={`dropzone-file-${imageTitle}`} 
            type="file" 
            className="hidden" 
            onChange={handleBildUpload}
            accept="image/*"
            capture={isMobile && cameraAvailable ? "environment" : undefined} 
          />
        </div>
        
        {/* Pflanzen-Analyse Info */}
        {uploadedImage && doAnalyzePlant && (
          <div className="mt-2 text-xs w-full">
            <p className="font-medium">Erkannte Pflanze:</p>
            <p className="text-gray-600">{existingImage?.analyse || "Analyse läuft..."}</p>
          </div>
        )}
      </div>

    </>
  );
}