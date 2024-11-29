"use client";

import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NatureScoutData } from "@/types/nature-scout";

interface UserData {
  erfassungsperson: string;
  email: string;
}

export function Welcome({ metadata, setMetadata }: { metadata: NatureScoutData; setMetadata: React.Dispatch<React.SetStateAction<NatureScoutData>> }) {
  // Lade gespeicherte Benutzerdaten beim ersten Render
  useEffect(() => {
    const savedUserData = localStorage.getItem('NatureScoutUserData');
    if (savedUserData) {
      try {
        const userData: UserData = JSON.parse(savedUserData);
        setMetadata(prev => ({
          ...prev,
          erfassungsperson: userData.erfassungsperson,
          email: userData.email
        }));
      } catch (e) {
        console.error('Fehler beim Laden der Benutzerdaten:', e);
      }
    }
  }, [setMetadata]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMetadata(prev => {
      const newMetadata = { ...prev, [name]: value };
      
      // Speichere nur Benutzerdaten im localStorage
      const userDataToSave: UserData = {
        erfassungsperson: name === 'erfassungsperson' ? value : newMetadata.erfassungsperson,
        email: name === 'email' ? value : newMetadata.email
      };
      localStorage.setItem('NatureScoutUserData', JSON.stringify(userDataToSave));
      
      return newMetadata;
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Alert>
        <AlertDescription>
          <div className="space-y-4">
            <p className="mt-4">
              In diesem Frageassistent werden Sie gebeten, einige Merkmale eines Naturhabitats zu erfassen und mehrere Bilder hochzuladen. 
              Wir werden diese Bilder analysieren, um einzuschätzen, ob das Habitat schützenswert ist.
            </p>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="erfassungsperson">Name der Erfassungsperson</Label>
                <Input
                  type="text"
                  id="erfassungsperson"
                  name="erfassungsperson"
                  value={metadata.erfassungsperson}
                  onChange={handleChange}
                  autoComplete="name"
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="email">Email Adresse</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={metadata.email}
                  onChange={handleChange}
                  placeholder="name@beispiel.de"
                  autoComplete="email"
                />
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
} 