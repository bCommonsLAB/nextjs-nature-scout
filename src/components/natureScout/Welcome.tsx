"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useUser } from "@/context/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NatureScoutData } from "@/types/nature-scout";

import { Button } from "@/components/ui/button";

export function Welcome({ 
  metadata, 
  setMetadata, 
  scrollToNext,
  onSkipToImages
}: { 
  metadata: NatureScoutData; 
  setMetadata: React.Dispatch<React.SetStateAction<NatureScoutData>>;
  scrollToNext?: () => void;
  onSkipToImages?: () => void;
}) {
  const { user, isLoaded } = useUser();
  
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
    </div>
  );
}