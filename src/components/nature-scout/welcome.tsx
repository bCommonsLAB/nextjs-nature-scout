"use client";

import { useState, useEffect } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Metadata {
  gemeinde: string;
  flurname: string;
  erfassungsperson: string;
}

export function Welcome() {
  const [metadata, setMetadata] = useState<Metadata>({
    gemeinde: "",
    flurname: "",
    erfassungsperson: ""
  });

  useEffect(() => {
    const savedMetadata = localStorage.getItem("habitatMetadata");
    if (savedMetadata) {
      setMetadata(JSON.parse(savedMetadata));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMetadata(prev => {
      const newMetadata = { ...prev, [name]: value };
      localStorage.setItem("habitatMetadata", JSON.stringify(newMetadata));
      return newMetadata;
    });
  };

  return (
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
              <Label htmlFor="gemeinde">Gemeinde</Label>
              <Input
                type="text"
                id="gemeinde"
                name="gemeinde"
                value={metadata.gemeinde}
                onChange={handleChange}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="flurname">Flurname (Volkskundliche Bezeichnung)</Label>
              <Input
                type="text"
                id="flurname"
                name="flurname"
                value={metadata.flurname}
                onChange={handleChange}
              />
            </div>
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
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
} 