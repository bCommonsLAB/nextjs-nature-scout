"use client";

import { useState, useEffect } from "react";
import { Upload, X, RotateCw, Smartphone, Camera, AlertTriangle } from "lucide-react";
import { Progress } from "../ui/progress";
import { Bild, PlantNetResponse, PlantNetResult } from "@/types/nature-scout";
import { toast } from "sonner";
import Image from 'next/image';
import { Button } from "../ui/button";



interface GetImageProps {
  imageTitle: string;
  imageKey: string; // Neuer Parameter für den korrekten imageKey
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
  requiredOrientation?: 'landscape' | 'portrait'; // Neue Prop für die gewünschte Orientierung
}

export function GetImage({ 
  imageTitle, 
  imageKey, // Neuer Parameter
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
  // Verwende die explizit übergebene Orientierung
  const isPanorama = requiredOrientation === 'landscape';
  const isPortrait = requiredOrientation === 'portrait';
  
  const [localUploadProgress, setLocalUploadProgress] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(existingImage?.url || null);
  const [progressPhase, setProgressPhase] = useState<'upload' | 'analyze' | 'complete'>('upload');
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showOrientationDialog, setShowOrientationDialog] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null); // null = noch nicht geprüft
  const [showCameraHint, setShowCameraHint] = useState(false);
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
    } else {
      // Wichtig: uploadedImage zurücksetzen, wenn kein existingImage vorhanden ist
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
    }
  }, [existingImage, schematicBg, isPortrait]);

  // Progress zurücksetzen, wenn sich der Bildschritt ändert
  useEffect(() => {
    setLocalUploadProgress(0);
    setProgressPhase('upload');
  }, [imageKey]); // imageKey ändert sich, wenn wir zu einem neuen Bildschritt wechseln

  // Orientierungserkennung für mobile Geräte
  useEffect(() => {
    const checkOrientation = () => {
      const landscape = window.innerWidth > window.innerHeight;
      const mobile = window.innerWidth <= 1024; // Erweitert für Desktop-Testing (ursprünglich 768)
      
      setIsLandscape(landscape);
      setIsMobile(mobile);
      
      // Debug-Ausgaben
      console.log('🔍 Orientation Check:', {
        imageTitle,
        requiredOrientation,
        isPanorama,
        isPortrait,
        mobile,
        landscape,
        width: window.innerWidth,
        height: window.innerHeight
      });
      
      // Nur für mobile Geräte und wenn eine Orientierung explizit gefordert ist
      if (mobile && requiredOrientation) {
        if (requiredOrientation === 'landscape' && !landscape) {
          // Querformat erforderlich, aber aktuell Hochformat
          console.log('📱 Showing dialog: Landscape required');
          setShowOrientationDialog(true);
        } else if (requiredOrientation === 'portrait' && landscape) {
          // Hochformat erforderlich, aber aktuell Querformat
          console.log('📱 Showing dialog: Portrait required');
          setShowOrientationDialog(true);
        } else {
          console.log('📱 Hiding dialog: Correct orientation');
          setShowOrientationDialog(false);
        }
      } else {
        console.log('💻 Desktop mode or no orientation required: No dialog');
        setShowOrientationDialog(false);
      }
    };

    // Initial prüfen
    checkOrientation();

    // Event Listener für Orientierungsänderungen
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [requiredOrientation, imageTitle]);

  // Kamera-Verfügbarkeitsprüfung
  useEffect(() => {
    async function checkCameraAvailability() {
      try {
        // Überprüfe ob MediaDevices API verfügbar ist
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.log('📱 MediaDevices API nicht verfügbar');
          setCameraAvailable(false);
          return;
        }

        // Überprüfe verfügbare Geräte
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        
        if (!hasCamera) {
          console.log('📱 Keine Videoeingabegeräte gefunden');
          setCameraAvailable(false);
          return;
        }

        // Teste ob wir tatsächlich auf die Kamera zugreifen können
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } // Rückkamera bevorzugen
          });
          
          // Stream sofort wieder freigeben
          stream.getTracks().forEach(track => track.stop());
          
          console.log('📱 Kamera verfügbar und zugänglich');
          setCameraAvailable(true);
        } catch (permissionError) {
          console.log('📱 Kamera vorhanden, aber Zugriff verweigert:', permissionError);
          // Auch bei Berechtigung-verweigerung ist die Kamera technisch verfügbar
          setCameraAvailable(true);
        }
      } catch (error) {
        console.error('📱 Fehler bei Kamera-Verfügbarkeitsprüfung:', error);
        setCameraAvailable(false);
      }
    }

    // Nur auf mobilen Geräten prüfen
    if (isMobile) {
      checkCameraAvailability();
    } else {
      setCameraAvailable(true); // Desktop hat normalerweise eine Kamera oder Dateizugriff
    }
  }, [isMobile]);

  // Orientierungsdialog Komponente
  const OrientationDialog = () => {
    if (!showOrientationDialog) return null;

    const isRequiringLandscape = requiredOrientation === 'landscape';
    const isRequiringPortrait = requiredOrientation === 'portrait';

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
        <div className="bg-white rounded-lg p-6 max-w-sm text-center shadow-xl">
          <div className="flex justify-center mb-4">
            {isRequiringLandscape ? (
              <div className="flex items-center gap-2">
                <Smartphone className="h-8 w-8 text-blue-500 transform -rotate-90" />
                <RotateCw className="h-6 w-6 text-gray-400" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Smartphone className="h-8 w-8 text-blue-500" />
                <RotateCw className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>
          
          <h3 className="text-lg font-semibold mb-2 text-gray-900">
            {isRequiringLandscape ? "Handy quer drehen" : "Handy aufrecht halten"}
          </h3>
          
          <p className="text-gray-600 mb-4">
            {isRequiringLandscape 
              ? "Für das Panoramabild bitte das Handy quer halten, um den besten Überblick zu erhalten."
              : "Für Detail- und Pflanzenbilder bitte das Handy aufrecht halten, um die beste Aufnahme zu erzielen."
            }
          </p>
          
          <p className="text-sm text-gray-500">
            Dieser Dialog verschwindet automatisch, wenn Sie das Handy richtig halten.
          </p>
        </div>
      </div>
    );
  };

  // Kamera-Hinweis-Komponente
  const CameraHintDialog = () => {
    if (!showCameraHint || !isMobile) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
        <div className="bg-white rounded-lg p-6 max-w-sm text-center shadow-xl">
          <div className="flex justify-center mb-4">
            {cameraAvailable === false ? (
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            ) : (
              <Camera className="h-8 w-8 text-blue-500" />
            )}
          </div>
          
          <h3 className="text-lg font-semibold mb-2 text-gray-900">
            {cameraAvailable === false ? "Keine Kamera verfügbar" : "Kamera-Hinweis"}
          </h3>
          
          <div className="text-gray-600 mb-4 space-y-2">
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
            className="w-full"
          >
            Verstanden
          </Button>
        </div>
      </div>
    );
  };

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

  // Clientseitige Bildkomprimierung
  async function compressImageOnClient(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();
      
      img.onload = () => {
        try {
          // Dynamische Komprimierung basierend auf Dateigröße
          const fileSizeMB = file.size / 1024 / 1024;
          
          // Aggressive Komprimierung für sehr große Dateien
          let MAX_WIDTH, MAX_HEIGHT, COMPRESSION_QUALITY;
          
          if (fileSizeMB > 15) {
            // Sehr große Dateien: Starke Komprimierung
            MAX_WIDTH = 1200;
            MAX_HEIGHT = 1200; 
            COMPRESSION_QUALITY = 0.75;
          } else if (fileSizeMB > 8) {
            // Große Dateien: Mittlere Komprimierung
            MAX_WIDTH = 1400;
            MAX_HEIGHT = 1400;
            COMPRESSION_QUALITY = 0.8;
          } else {
            // Normale Dateien: Schonende Komprimierung
            MAX_WIDTH = 1600;
            MAX_HEIGHT = 1600;
            COMPRESSION_QUALITY = 0.85;
          }
          
          let { width, height } = img;
          
          // Seitenverhältnis beibehalten
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }
          
          // Canvas-Größe setzen
          canvas.width = width;
          canvas.height = height;
          
          // Bildqualität verbessern
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Bild auf Canvas zeichnen
            ctx.drawImage(img, 0, 0, width, height);
            
            // Als Blob mit Komprimierung exportieren
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  // Neuen File aus Blob erstellen
                  const compressedFile = new File(
                    [blob], 
                    file.name, 
                    { 
                      type: 'image/jpeg', // Immer JPEG für bessere Komprimierung
                      lastModified: Date.now() 
                    }
                  );
                  
                  const originalSizeMB = (file.size / 1024 / 1024).toFixed(1);
                  const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(1);
                  const compressionRatio = Math.round(compressedFile.size / file.size * 100);
                  
                  console.log(`📱 Bildkomprimierung: ${originalSizeMB}MB → ${compressedSizeMB}MB (${compressionRatio}%)`);
                  
                  // Benutzer über signifikante Komprimierung informieren
                  if (compressionRatio < 30 && file.size > 5 * 1024 * 1024) {
                    toast.success(`Bild komprimiert: ${originalSizeMB}MB → ${compressedSizeMB}MB`);
                  }
                  
                  resolve(compressedFile);
                } else {
                  reject(new Error('Bildkomprimierung fehlgeschlagen'));
                }
              },
              'image/jpeg',
              COMPRESSION_QUALITY
            );
          } else {
            reject(new Error('Canvas-Kontext nicht verfügbar'));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Bild konnte nicht geladen werden'));
      };
      
      // File als Data URL laden
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };
      reader.onerror = () => {
        reject(new Error('Datei konnte nicht gelesen werden'));
      };
      reader.readAsDataURL(file);
    });
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
      // Clientseitige Komprimierung für Dateien > 1MB
      let fileToUpload = imageSource;
      if (imageSource.size > 1024 * 1024) { // Größer als 1MB
        try {
          setLocalUploadProgress(10);
          fileToUpload = await compressImageOnClient(imageSource);
          setLocalUploadProgress(20);
        } catch (compressionError) {
          console.warn('⚠️ Clientseitige Komprimierung fehlgeschlagen, verwende Original:', compressionError);
          // Fallback: Original verwenden
          fileToUpload = imageSource;
        }
      }
      
      const formData = new FormData();
      formData.append("image", fileToUpload);
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
    
    // Informiere über große Dateien
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > 5) {
      console.log(`📱 Große Datei erkannt: ${fileSizeMB.toFixed(1)}MB - Komprimierung wird angewendet`);
      if (fileSizeMB > 10) {
        toast.info(`Großes Bild (${fileSizeMB.toFixed(1)}MB) wird komprimiert...`);
      }
    }
    
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
      
      // Bei bestimmten Fehlern Kamera-Hinweis anzeigen
      if (isMobile && error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('permission') || 
            errorMessage.includes('camera') || 
            errorMessage.includes('access') ||
            errorMessage.includes('denied')) {
          setShowCameraHint(true);
        }
      }
      
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
      
      // Bei bestimmten Fehlern Kamera-Hinweis anzeigen
      if (isMobile && error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('permission') || 
            errorMessage.includes('camera') || 
            errorMessage.includes('access') ||
            errorMessage.includes('denied')) {
          setShowCameraHint(true);
        }
      }
      
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
      imageKey,
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
    <>
      {/* Orientierungsdialog */}
      <OrientationDialog />
      
      {/* Kamera-Hinweis-Dialog */}
      <CameraHintDialog />
      
      <div className={fullHeight ? "h-screen max-h-[70vh] flex flex-col" : ""}>
        <div className={`relative w-full ${
          fullHeight 
            ? isPanorama 
              ? "max-w-4xl" 
              : "max-w-2xl" 
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
          } border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-100 hover:bg-gray-200 p-4 sm:p-6 ${uploadedImage ? "" : "space-y-2"} relative overflow-hidden`}
        >
          {/* Hintergrundbild Container */}
          {backgroundImageStyle.backgroundImage && (
            <div 
              className={`absolute rounded-lg ${
                isPanorama 
                  ? "inset-4 sm:inset-6" 
                  : isPortrait 
                    ? "top-8 bottom-8 left-6 right-6 sm:left-8 sm:right-8"
                    : "inset-4 sm:inset-6"
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
                onDeleteImage(imageKey);
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
                
                {/* Kamera-Status-Anzeige für mobile Geräte */}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 text-amber-600 hover:text-amber-700"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowCameraHint(true);
                          }}
                        >
                          <AlertTriangle className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
                
                <Upload className={`${fullHeight ? "w-16 h-16 sm:w-20 sm:h-20" : "w-8 h-8"} my-4 sm:my-6 text-black`} />
                <p className={`${fullHeight ? "text-base sm:text-lg" : "text-xs"} text-black bg-white/95 px-2 sm:px-3 py-2 rounded-lg shadow-md`}>
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
              capture={isMobile && cameraAvailable ? "environment" : undefined} // Rückkamera bevorzugen auf mobilen Geräten
            />
          </label>
        </div>
        
        {uploadedImage && doAnalyzePlant && (
          <div className="mt-2 text-xs w-full sm:w-[150px]">
            <p className="font-medium">Erkannte Pflanze:</p>
            <p className="text-gray-600">{existingImage?.analyse || "Analyse läuft..."}</p>
          </div>
        )}
        </div>
      </div>
    </>
  );
} 