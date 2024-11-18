"use client";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationMetadata } from "@/types/nature-scout";
import { useState } from "react";
import Map from '../map/maps';


export function Welcome() {
  const [metadata, setMetadata] = useState<LocationMetadata>({
    erfassungsperson: "",
    gemeinde: "",
    flurname: "",
    latitude: 0,
    longitude: 0,
    standort: ""
  });

  const [initialPosition, setInitialPosition] = useState<[number, number] | null>(() => {
    const savedMetadata = localStorage.getItem("habitatMetadata");
    if (savedMetadata) {
      const savedMetadataParsed = JSON.parse(savedMetadata) as LocationMetadata;
      if (savedMetadataParsed.latitude && savedMetadataParsed.longitude) {
        return [savedMetadataParsed.latitude, savedMetadataParsed.longitude];
      }
    }
    return null;
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMetadata(prev => {
      const newMetadata = { ...prev, [name]: value };
      localStorage.setItem("habitatMetadata", JSON.stringify(newMetadata));
      return newMetadata;
    });
  };

  const zoom = 13;

  const handleCenterChange = (newCenter: [number, number]) => {
    // Aktualisieren Sie Ihre Metadaten mit der neuen Position
    console.log(metadata);
    //setMetadata({ ...metadata, latitude: newCenter[0], longitude: newCenter[1] });
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
            </div>
          </div>
        </AlertDescription>
      </Alert>
      
      <div className="space-y-4">
      {initialPosition && 
        <div className="h-[400px] rounded-lg overflow-hidden">
          <Map position={initialPosition} zoom={zoom} onCenterChange={handleCenterChange} />
        </div>
        }
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">Aktuelle Position:</p>
          <p className="text-sm">Lat: {metadata.latitude?.toFixed(6)}</p>
          <p className="text-sm">Lng: {metadata.longitude?.toFixed(6)}</p>
          <p className="text-sm">Standort: {metadata.standort}</p>
        </div>
      </div>
    </div>
  );
} 