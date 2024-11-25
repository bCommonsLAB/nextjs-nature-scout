import { useState, useEffect, useCallback, useRef } from "react";
import Map from '../map/maps';
import { GeocodingResult, NatureScoutData } from "@/types/nature-scout";

export function LocationDetermination({ metadata, setMetadata }: { metadata: NatureScoutData; setMetadata: React.Dispatch<React.SetStateAction<NatureScoutData>> }) {
  // Initialisiere initialPosition direkt mit den Metadaten-Werten
  const [initialPosition, setInitialPosition] = useState<[number, number]>([metadata.latitude || 46.724212, metadata.longitude || 11.65555]);
  const [currentPosition, setCurrentPosition] = useState<[number, number]>([metadata.latitude || 46.724212, metadata.longitude || 11.65555]);
  
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Vereinfachter useEffect, der nur einmal beim Mount ausgeführt wird
  useEffect(() => {
    if (metadata.latitude === 0 && metadata.longitude === 0) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentPosition([latitude, longitude]);
          setInitialPosition([latitude, longitude]);
          setMetadata(prevMetadata => ({
            ...prevMetadata,
            latitude,
            longitude
          }));
          getAddressFromCoordinates(latitude, longitude);
        },
        () => {
          // Bei Fehler werden die Default-Werte verwendet (bereits im State gesetzt)
          getAddressFromCoordinates(initialPosition[0], initialPosition[1]);
        }
      );
    } else {
      getAddressFromCoordinates(metadata.latitude, metadata.longitude);
    }
  }, []); // Leere Dependency Array - wird nur beim Mount ausgeführt

  async function getAddressFromCoordinates(lat: number, lon: number) {
    try {
      const apiUrl = `/api/googlemaps?lat=${lat}&lon=${lon}`
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data: GeocodingResult = await response.json();

      if (!data.standort) {
        throw new Error('Keine Adressdaten gefunden');
      }
      
      setMetadata(prev => ({
        ...prev,
        standort: data.standort,
        gemeinde: data.gemeinde,
        flurname: data.flurname
      }));
    } catch (error) {
      console.error('Detaillierter Fehler:', {
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
        error: error
      });
      
      setMetadata(prev => ({
        ...prev,
        standort: 'Adresse konnte nicht ermittelt werden',
        gemeinde: 'unbekannt',
        flurname: 'unbekannt'
      }));
    }
  }
  
  
  // Debounced Version der getAddressFromCoordinates
  const debouncedGetAddress = useCallback((lat: number, lon: number) => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      getAddressFromCoordinates(lat, lon);
    }, 1000); // 1 Sekunden Verzögerung
  }, []);

  // Handler für die Zentrumsänderung der Karte
  const handleCenterChange = useCallback((newCenter: [number, number]) => {
    setCurrentPosition(newCenter);
    setMetadata(prevMetadata => ({
      ...prevMetadata,
      latitude: newCenter[0],
      longitude: newCenter[1],
    }));
    
    // Verwende die gedebouncte Version
    debouncedGetAddress(newCenter[0], newCenter[1]);
  }, [debouncedGetAddress]);

  // Cleanup beim Unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="h-[400px] rounded-lg overflow-hidden">
        <Map position={initialPosition} zoom={13} onCenterChange={handleCenterChange} />
      </div>
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <p className="text-sm font-medium">Aktuelle Position:</p>
        <p className="text-sm">Lat: {currentPosition[0]?.toFixed(6)}</p>
        <p className="text-sm">Lng: {currentPosition[1]?.toFixed(6)}</p>
        <p className="text-sm">Gemeinde: {metadata.gemeinde}</p>
        <p className="text-sm">Standort: {metadata.standort}</p>
      </div>
    </div>
  );
}
