"use client";

import { NatureScoutData, Bild, PlantNetResult } from "@/types/nature-scout";
import { GetImage } from "./get-image";
import { InstructionDialog } from "@/components/ui/instruction-dialog";
import { useState, useEffect } from "react";

interface UploadImagesProps {
  metadata: NatureScoutData;
  setMetadata: React.Dispatch<React.SetStateAction<NatureScoutData>>;
  showHelp?: boolean;
  onHelpShown?: () => void;
  scrollToNext?: () => void;
  onUploadActiveChange?: (isActive: boolean) => void;
}

export function UploadImages({ 
  metadata, 
  setMetadata, 
  showHelp, 
  onHelpShown,
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
  
  // States für den Dialog
  const [showBilderPopup, setShowBilderPopup] = useState(false);
  const [dontShowBilderAgain, setDontShowBilderAgain] = useState(false);
  
  // Bei erstem Rendern prüfen, ob der Dialog bereits angezeigt wurde
  useEffect(() => {
    const dontShowDialogAgain = localStorage.getItem('dontShowBilderUploadDialog') === 'true';
    setDontShowBilderAgain(dontShowDialogAgain);
    
    // Beim ersten Laden die Einstellung berücksichtigen
    if (!dontShowDialogAgain) {
      setShowBilderPopup(true);
    }
  }, []); // Leere Abhängigkeitsliste -> wird nur einmal beim Mounten ausgeführt
  
  // Separater useEffect für showHelp-Änderungen
  useEffect(() => {
    // Wenn der Hilfe-Button geklickt wurde, Dialog anzeigen
    if (showHelp === true) {
      setShowBilderPopup(true);
    }
  }, [showHelp]);
  
  // Speichere die Benutzereinstellung für "Nicht mehr anzeigen"
  const saveBilderDialogPreference = (dontShowAgain: boolean) => {
    setDontShowBilderAgain(dontShowAgain);
    localStorage.setItem('dontShowBilderUploadDialog', dontShowAgain.toString());
  };

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

  const handleBildUpload = (imageKey: string, filename: string, url: string, analysis: string, plantnetResult?: PlantNetResult) => {
    const neuesBild: Bild = {
      imageKey,
      filename,
      url,
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
        <h2 className="text-lg font-medium mb-3">Habitat übersicht erfassen</h2>
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
          />
        </div>
      </div>
      
      <div>
        <h2 className="text-lg font-medium mb-3">Typische Pflanzen erfassen</h2>
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
          />
        </div>
      </div>
      
      {/* Bilder-Upload-Dialog */}
      <InstructionDialog
        open={showBilderPopup}
        onOpenChange={(open) => {
          setShowBilderPopup(open);
          // Wenn der Dialog geschlossen wird und es war ein Hilfe-Klick, den onHelpShown-Callback aufrufen
          if (!open && showHelp && onHelpShown) {
            onHelpShown();
          }
        }}
        title="Bilder erfassen"
        content="Klicken sie auf ein Bild und fotografieren es mit der Kamera oder laden sie ein Bild hoch. Das Prozedere ist je nach Gerät unterschiedlich. Manchmal müssen sie der Anwendung auch Zugriff auf ihre Kamera erlauben. Bitte ein Panoramabild, eine Detailansicht und zwei typische Pflanzenarten hoch. Die Detailbilder von Pflanzen werden automatisch analysiert, um bei der Bestimmung des Habitattyps zu helfen."
        dontShowAgain={dontShowBilderAgain}
        onDontShowAgainChange={saveBilderDialogPreference}
        skipDelay={showHelp === true}
        showDontShowAgain={true}
      />
    </div>
  );
} 