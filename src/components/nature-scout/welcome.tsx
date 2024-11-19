"use client";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationMetadata } from "@/types/nature-scout";


export function Welcome({ metadata, setMetadata }: { metadata: LocationMetadata; setMetadata: React.Dispatch<React.SetStateAction<LocationMetadata>> }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMetadata(prev => {
      const newMetadata = { ...prev, [name]: value };
      localStorage.setItem("habitatMetadata", JSON.stringify(newMetadata));
      return newMetadata;
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Alert>
        <AlertTitle>Willkommen zur Habitat-Bewertung</AlertTitle>
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
                />
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>
      
    </div>
  );
} 