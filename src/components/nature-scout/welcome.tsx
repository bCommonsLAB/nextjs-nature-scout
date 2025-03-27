"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NatureScoutData } from "@/types/nature-scout";

export function Welcome({ metadata, setMetadata }: { metadata: NatureScoutData; setMetadata: React.Dispatch<React.SetStateAction<NatureScoutData>> }) {
  const { user, isLoaded } = useUser();
  
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Alert className="h-fit order-2 md:order-1">
        <AlertDescription>
          <div className="space-y-4">
            <div>
              <p className="mb-3">
                {isLoaded && user?.fullName ? `Hallo ${user.fullName},` : 'Hallo,'}
              </p>
              <p className="mb-3">
                in diesem Frageassistenten werden Sie gebeten, einige Standort-Merkmale eines Naturhabitats zu erfassen 
                und mehrere Bilder hochzuladen. Wir werden diese Bilder analysieren, um einzuschätzen, ob das 
                Habitat schützenswert ist.
              </p>
              <p className="mb-3">
                Wenn Sie Ihre Eingaben im letzten Schritt bestätigen, dann wird dieses Habitat Arbeitvon Experten verifiziert 
                und Sie bekommen eine Bestätigungs-E-Mail an: <span className="font-semibold">{metadata.email || (isLoaded && user?.primaryEmailAddress?.emailAddress)}</span>.
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