import { useState, useEffect, useCallback, useRef } from "react";
import Map from '../map/maps';
import { GeocodingResult, LocationMetadata } from "@/types/nature-scout";



export function LocationDetermination({ metadata, setMetadata }: { metadata: LocationMetadata; setMetadata: React.Dispatch<React.SetStateAction<LocationMetadata>> }) {
  // Lokaler Zustand für die initiale Position der Karte
  const [initialPosition, setInitialPosition] = useState<[number, number]>([metadata.latitude, metadata.longitude]);
  // Lokaler Zustand für die aktuelle Position der Karte
  const [currentPosition, setCurrentPosition] = useState<[number, number]>([metadata.latitude, metadata.longitude]);
  
  // Debounce Timer Ref
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Definieren Sie Standardwerte für Breiten- und Längengrad
    const defaultLatitude = 46.724212; // Beispielwert für Brixen
    const defaultLongitude = 11.65555; // Beispielwert für Brixen

    // Setzen der initialen Position basierend auf den Metadaten oder der aktuellen Geolocation
    if (metadata.latitude === 0 && metadata.longitude === 0) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentPosition([latitude, longitude]);
          setMetadata(prevMetadata => ({
            ...prevMetadata,
            latitude,
            longitude
          }));
        },
        (error) => {
          console.error("Fehler beim Abrufen der Geolocation", error);
          // Setzen der Fallback-Position mit den definierten Standardwerten
          setCurrentPosition([defaultLatitude, defaultLongitude]);
        }
      );
    } else {
      // Setzen Sie initialPosition nur, wenn sie noch nicht gesetzt wurde
      if (initialPosition[0] === 0 && initialPosition[1] === 0) {
        setInitialPosition([metadata.latitude, metadata.longitude]);
      }
    }
  }, [metadata, setMetadata]);

  // Debug-Logging für State-Changes
  useEffect(() => {
    console.log('LocationDetermination: initialPosition geändert:', initialPosition);
  }, [initialPosition]);

  useEffect(() => {
    console.log('LocationDetermination: currentPosition geändert:', currentPosition);
  }, [currentPosition]);

  useEffect(() => {
    console.log('LocationDetermination: metadata geändert:', metadata);
  }, [metadata]);

  
  async function getAddressFromCoordinates(lat: number, lon: number) {
    try {

      //const apiUrl = `/api/geocoding?lat=${lat}&lon=${lon}`
      const apiUrl = `/api/googlemaps?lat=${lat}&lon=${lon}`
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data: GeocodingResult = await response.json();
      console.log('Geocoding erfolgreich:', data);

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
      console.error('Fehler beim Geocoding:', error);
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
    }, 2000); // 2 Sekunden Verzögerung
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
        <p className="text-sm">Lat: {metadata.latitude?.toFixed(6)}</p>
        <p className="text-sm">Lng: {metadata.longitude?.toFixed(6)}</p>
        <p className="text-sm">Gemeinde: {metadata.gemeinde}</p>
        <p className="text-sm">Standort: {metadata.standort}</p>
      </div>
    </div>
  );
}
