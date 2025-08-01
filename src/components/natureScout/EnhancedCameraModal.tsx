"use client";

import { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCw, Zap, ZapOff } from "lucide-react";
import { toast } from "sonner";

interface EnhancedCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title: string;
  requiredOrientation?: 'landscape' | 'portrait';
}

export function EnhancedCameraModal({ 
  isOpen, 
  onClose, 
  onCapture, 
  title,
  requiredOrientation 
}: EnhancedCameraModalProps) {
  const webcamRef = useRef<Webcam>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Kamera-Einstellungen basierend auf Orientierung
  const videoConstraints = {
    facingMode,
    width: requiredOrientation === 'landscape' ? { ideal: 1920 } : { ideal: 1080 },
    height: requiredOrientation === 'landscape' ? { ideal: 1080 } : { ideal: 1920 },
  };

  const handleCapture = useCallback(async () => {
    if (!webcamRef.current) return;
    
    setIsCapturing(true);
    
    try {
      // Screenshot als base64 aufnehmen
      const imageSrc = webcamRef.current.getScreenshot();
      
      if (!imageSrc) {
        toast.error('Foto konnte nicht aufgenommen werden');
        return;
      }

      // Base64 zu File konvertieren
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const file = new File([blob], `camera_${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      onCapture(file);
      onClose();
      
      toast.success('Foto erfolgreich aufgenommen');
    } catch (error) {
      console.error('Fehler beim Foto aufnehmen:', error);
      toast.error('Fehler beim Aufnehmen des Fotos');
    } finally {
      setIsCapturing(false);
    }
  }, [onCapture, onClose]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-lg p-4 max-w-4xl w-full max-h-[95vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Foto aufnehmen - {title}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>
        
        <div className="flex-1 flex flex-col items-center">
          {/* Kamera-Vorschau */}
          <div className="relative bg-black rounded-lg overflow-hidden max-w-full max-h-[70vh]">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.92}
              videoConstraints={videoConstraints}
              className="w-full h-full object-cover"
              style={{ 
                maxWidth: '800px',
                maxHeight: '600px',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
              }}
            />
            
            {/* Orientierungs-Overlay */}
            {requiredOrientation && (
              <div className="absolute top-4 left-4 right-4">
                <div className="bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
                  {requiredOrientation === 'landscape' 
                    ? '📱 Halten Sie das Gerät quer (Panorama)'
                    : '📱 Halten Sie das Gerät aufrecht'
                  }
                </div>
              </div>
            )}
            
            {/* Raster-Overlay für bessere Komposition */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full">
                <div className="absolute top-1/3 left-0 right-0 h-0 border-t border-white/30"></div>
                <div className="absolute top-2/3 left-0 right-0 h-0 border-t border-white/30"></div>
                <div className="absolute top-0 bottom-0 left-1/3 w-0 border-l border-white/30"></div>
                <div className="absolute top-0 bottom-0 left-2/3 w-0 border-l border-white/30"></div>
              </div>
            </div>
          </div>
          
          {/* Kamera-Steuerung */}
          <div className="flex gap-4 mt-6 items-center">
            <Button 
              variant="outline" 
              onClick={toggleCamera}
              className="flex items-center gap-2"
              title="Kamera wechseln"
            >
              <RotateCw className="h-4 w-4" />
              {facingMode === 'environment' ? 'Frontkamera' : 'Rückkamera'}
            </Button>
            
            <Button 
              onClick={handleCapture}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-8"
              disabled={isCapturing}
              size="lg"
            >
              <Camera className="h-5 w-5" />
              {isCapturing ? 'Aufnehmen...' : 'Foto aufnehmen'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Abbrechen
            </Button>
          </div>
        </div>
        
        <div className="text-center text-sm text-gray-500 mt-4">
          <p>Positionieren Sie das Motiv und klicken Sie auf "Foto aufnehmen"</p>
        </div>
      </div>
    </div>
  );
}