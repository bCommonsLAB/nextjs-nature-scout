"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useUser } from "@/context/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NatureScoutData } from "@/types/nature-scout";
import { InstructionDialog } from "@/components/ui/instruction-dialog";
import { Button } from "@/components/ui/button";

export function Welcome({ 
  metadata, 
  setMetadata, 
  showHelp, 
  onHelpShown,
  scrollToNext,
  onSkipToImages
}: { 
  metadata: NatureScoutData; 
  setMetadata: React.Dispatch<React.SetStateAction<NatureScoutData>>;
  showHelp?: boolean;
  onHelpShown?: () => void;
  scrollToNext?: () => void;
  onSkipToImages?: () => void;
}) {
  const { user, isLoaded } = useUser();
  
  // State für den Willkommens-Dialog
  const [showWelcomeGuide, setShowWelcomeGuide] = useState<boolean>(false);
  
  // Status für "Nicht mehr anzeigen" Checkbox
  const [dontShowWelcomeGuideAgain, setDontShowWelcomeGuideAgain] = useState<boolean>(
    // Versuche aus localStorage zu laden
    typeof window !== 'undefined' ? localStorage.getItem('dontShowWelcomeGuideAgain') === 'true' : false
  );
  
  // Beim ersten Laden Dialog anzeigen, wenn "Nicht mehr anzeigen" nicht aktiviert ist
  useEffect(() => {
    // Wenn "Nicht mehr anzeigen" aktiviert ist, Dialog nicht anzeigen
    if (dontShowWelcomeGuideAgain) return;
    
    // Sonst den Dialog sofort aktivieren, die Verzögerung erfolgt in der InstructionDialog-Komponente
    setShowWelcomeGuide(true);
  }, [dontShowWelcomeGuideAgain]);
  
  // useEffect um dontShowWelcomeGuideAgain im localStorage zu speichern
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dontShowWelcomeGuideAgain', dontShowWelcomeGuideAgain.toString());
      
      // Wenn "Nicht mehr anzeigen" aktiviert ist, Popup nicht anzeigen
      if (dontShowWelcomeGuideAgain) {
        setShowWelcomeGuide(false);
      }
    }
  }, [dontShowWelcomeGuideAgain]);
  
  // Lade Benutzerdaten aus der MongoDB über den API-Endpunkt
  useEffect(() => {
    async function fetchUserData() {
      if (isLoaded && user) {
        try {
          // API-Anfrage an unseren Endpunkt mit der E-Mail-Adresse
          const response = await fetch(`/api/users/${encodeURIComponent(user.email)}`);
          
          if (!response.ok) {
            console.error("Fehler beim Abrufen der Benutzerdaten:", response.statusText);
            return;
          }
          
          const userData = await response.json();
          console.log("Benutzerdaten aus MongoDB geladen:", userData);
          
          // Daten aus unserem MongoDB-Nutzerprofil übernehmen
          setMetadata(prev => ({
            ...prev,
            erfassungsperson: userData.name || user.name || "",
            organizationId: userData.organizationId || "",
            organizationName: userData.organizationName || "",
            organizationLogo: userData.organizationLogo || "",
            email: userData.email || ""
          }));
        } catch (error) {
          console.error("Fehler beim Abrufen der Benutzerdaten:", error);
        }
      }
    }
    
    fetchUserData();
  }, [setMetadata, isLoaded, user]);

  // Effekt für den Hilfe-Button
  useEffect(() => {
    if (showHelp) {
      setShowWelcomeGuide(true);
      // Den onHelpShown-Callback nicht sofort aufrufen!
      // Er wird später durch onOpenChange in InstructionDialog aufgerufen
    }
  }, [showHelp]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Alert className="h-fit order-2 md:order-1">
        <AlertDescription>
          <div className="space-y-4">
            <div>
              <p className="mb-3">
                {isLoaded && user?.name ? `Hallo ${user.name},` : 'Hallo,'}
              </p>
              <p className="mb-3">
                in diesem Frageassistenten werden Sie gebeten, vor Ort einige Standort-Merkmale eines Naturhabitats zu erfassen 
                und mehrere Bilder hochzuladen. Wir werden diese Daten analysieren, um einzuschätzen, ob das 
                Habitat schützenswert ist.
              </p>
              <p className="mb-3">
                Vielen Dank für diese wertvolle und gewissenhafte Erfassung.<br/>
                Ihr NatureScout Team
              </p>

            </div>
          </div>
        </AlertDescription>
      </Alert>

      <div className="relative aspect-video overflow-hidden rounded-lg shadow-md order-1 md:order-2">
        <Image 
          src="/images/welcome-nature.jpg" 
          alt="Willkommensbild" 
          fill
          className="object-cover"
          priority
        />
      </div>
      
      {/* Anleitung Popup */}
      <InstructionDialog
        open={showWelcomeGuide}
        onOpenChange={(open) => {
          setShowWelcomeGuide(open);
          // Wenn der Dialog angezeigt wurde und es war ein Hilfe-Klick, den onHelpShown-Callback aufrufen
          if (!open && showHelp && onHelpShown) {
            onHelpShown();
          }
        }}
        title="Schritt für Schritt"
        content="Gehen sie ganz einfach jeden Schritt durch und beenden sie ihn mit der Taste 'Weiter' am unteren Seitenende."
        dontShowAgain={dontShowWelcomeGuideAgain}
        onDontShowAgainChange={setDontShowWelcomeGuideAgain}
        skipDelay={!!showHelp} // Verzögerung überspringen wenn über Hilfe-Button geöffnet
      />
    </div>
  );
}