"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NatureScoutData } from "@/types/nature-scout";
import { InstructionDialog } from "@/components/ui/instruction-dialog";

export function Welcome({ metadata, setMetadata }: { metadata: NatureScoutData; setMetadata: React.Dispatch<React.SetStateAction<NatureScoutData>> }) {
  const { user, isLoaded } = useUser();
  
  // State für den Willkommens-Dialog
  const [showWelcomeGuide, setShowWelcomeGuide] = useState<boolean>(false);
  
  // Status für "Nicht mehr anzeigen" Checkbox
  const [dontShowWelcomeGuideAgain, setDontShowWelcomeGuideAgain] = useState<boolean>(
    // Versuche aus localStorage zu laden
    typeof window !== 'undefined' ? localStorage.getItem('dontShowWelcomeGuideAgain') === 'true' : false
  );
  
  // Timer-Referenz für das verzögerte Anzeigen des Dialogs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // useEffect für den Timer - Zeige Dialog nach 3 Sekunden
  useEffect(() => {
    // Wenn "Nicht mehr anzeigen" aktiviert ist, keinen Timer starten
    if (dontShowWelcomeGuideAgain) return;
    
    // Timer starten für 3 Sekunden
    timerRef.current = setTimeout(() => {
      setShowWelcomeGuide(true);
    }, 3000);
    
    // Cleanup-Funktion
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [dontShowWelcomeGuideAgain]);
  
  // useEffect um dontShowWelcomeGuideAgain im localStorage zu speichern
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dontShowWelcomeGuideAgain', dontShowWelcomeGuideAgain.toString());
      
      // Wenn "Nicht mehr anzeigen" aktiviert ist, Popup nicht anzeigen und Timer löschen
      if (dontShowWelcomeGuideAgain) {
        setShowWelcomeGuide(false);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    }
  }, [dontShowWelcomeGuideAgain]);
  
  // Lade Benutzerdaten vom aktuellen angemeldeten Benutzer
  useEffect(() => {
    if (isLoaded && user) {
      // Automatisch Daten vom angemeldeten Benutzer übernehmen
      setMetadata(prev => ({
        ...prev,
        erfassungsperson: user.fullName || "",
        email: user.primaryEmailAddress?.emailAddress || ""
      }));
    }
  }, [setMetadata, isLoaded, user]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Alert className="h-fit order-2 md:order-1">
        <AlertDescription>
          <div className="space-y-4">
            <div>
              <p className="mb-3">
                {isLoaded && user?.fullName ? `Hallo ${user.fullName},` : 'Hallo,'}
              </p>
              <p className="mb-3">
                in diesem Frageassistenten werden Sie gebeten, einige Standort-Merkmale eines Naturhabitats zu erfassen 
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
      
      {/* Anleitung Popup - nach 3 Sekunden anzeigen */}
      <InstructionDialog
        open={showWelcomeGuide}
        onOpenChange={setShowWelcomeGuide}
        title="Schritt für Schritt"
        content="Gehen sie ganz einfach jeden Schritt durch und beenden sie ihn mit der Taste 'Weiter' am unteren Seitenende."
        dontShowAgain={dontShowWelcomeGuideAgain}
        onDontShowAgainChange={setDontShowWelcomeGuideAgain}
      />
    </div>
  );
}