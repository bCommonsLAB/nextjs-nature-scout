"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GeocodingResult, NatureScoutData } from "@/types/nature-scout";
import MapNoSSR from '../map/mapNoSSR';
import { Button } from "@/components/ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

export function LocationDetermination({ metadata, setMetadata }: { metadata: NatureScoutData; setMetadata: React.Dispatch<React.SetStateAction<NatureScoutData>> }) {
  // Initialisiere initialPosition direkt mit den Metadaten-Werten
  const [initialPosition, setInitialPosition] = useState<[number, number]>([metadata.latitude || 46.724212, metadata.longitude || 11.65555]);
  const [currentPosition, setCurrentPosition] = useState<[number, number]>([metadata.latitude || 46.724212, metadata.longitude || 11.65555]);
  const [elevation, setElevation] = useState<string>("unbekannt");
  const [exposition, setExposition] = useState<string>("unbekannt");
  const [slope, setSlope] = useState<string>("unbekannt");
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [polygonPoints, setPolygonPoints] = useState<Array<[number, number]>>(metadata.polygonPoints || []);
  
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
          getGeoDataFromCoordinates(latitude, longitude);
        },
        () => {
          // Bei Fehler werden die Default-Werte verwendet (bereits im State gesetzt)
          getGeoDataFromCoordinates(initialPosition[0], initialPosition[1]);
        }
      );
    } else {
      getGeoDataFromCoordinates(metadata.latitude, metadata.longitude);
    }
  }, []); // Leere Dependency Array - wird nur beim Mount ausgeführt

  // Polygonpunkte-Handler
  const handlePolygonChange = useCallback((newPoints: Array<[number, number]>) => {
    setPolygonPoints(newPoints);
    setMetadata(prevMetadata => ({
      ...prevMetadata,
      polygonPoints: newPoints
    }));
  }, [setMetadata]);

  async function getGeoDataFromCoordinates(lat: number, lon: number) {
    try {
      const apiUrl = `/api/geobrowser?lat=${lat}&lon=${lon}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data: GeocodingResult = await response.json();
      
      if (!data) {
        throw new Error('Keine Geodaten gefunden');
      }
      
      console.log('Erhaltene Geodaten:', data);
      
      // Setze die geografischen Daten
      setMetadata(prev => ({
        ...prev,
        standort: data.standort || 'Standort konnte nicht ermittelt werden',
        gemeinde: data.gemeinde || 'unbekannt',
        flurname: data.flurname || 'unbekannt',
        // Speichere Höhe und Exposition auch im Metadata-Objekt
        elevation: data.elevation || 'unbekannt',
        exposition: data.exposition || 'unbekannt',
        slope: data.slope || 'unbekannt'
      }));

      // Setze die Werte als lokale State-Werte für die UI-Anzeige
      setElevation(data.elevation || 'unbekannt');
      setExposition(data.exposition || 'unbekannt');
      setSlope(data.slope || 'unbekannt');
    } catch (error) {
      console.error('Fehler bei der Geo-Datenermittlung:', error);
      
      setMetadata(prev => ({
        ...prev,
        standort: 'Standort konnte nicht ermittelt werden',
        gemeinde: 'unbekannt',
        flurname: 'unbekannt',
        elevation: 'unbekannt',
        exposition: 'unbekannt',
        slope: 'unbekannt'
      }));
      
      setElevation('unbekannt');
      setExposition('unbekannt');
      setSlope('unbekannt');
    }
  }
  
  // Debug-Funktion: GeoBrowser-API mit Debug-Flag aufrufen
  async function testGeoBrowserApi() {
    setIsLoading(true);
    setDebugInfo(null);
    
    try {
      const lat = currentPosition[0];
      const lon = currentPosition[1];
      const apiUrl = `/api/geobrowser?lat=${lat}&lon=${lon}&debug=true`;
      
      console.log('Test GeoBrowser API mit URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      console.log('GeoBrowser API Debug-Antwort:', data);
      setDebugInfo(data);
    } catch (error) {
      console.error('Fehler beim API-Test:', error);
      setDebugInfo({ error: String(error) });
    } finally {
      setIsLoading(false);
    }
  }
  
  // Debounced Version der getGeoDataFromCoordinates
  const debouncedGetGeoData = useCallback((lat: number, lon: number) => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      getGeoDataFromCoordinates(lat, lon);
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
    debouncedGetGeoData(newCenter[0], newCenter[1]);
  }, [debouncedGetGeoData]);

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
      <div className="h-[50vh] min-h-[400px] rounded-lg overflow-hidden relative">
        <div className="absolute inset-0">
          <MapNoSSR 
            position={initialPosition} 
            zoom={13} 
            onCenterChange={handleCenterChange} 
            initialPolygon={polygonPoints}
            onPolygonChange={handlePolygonChange}
            editMode={editMode}
          />
        </div>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Switch 
              id="edit-mode" 
              checked={editMode}
              onCheckedChange={setEditMode}
            />
            <Label htmlFor="edit-mode">Fläche zeichnen</Label>
          </div>
          {polygonPoints.length > 0 && (
            <div className="text-sm text-gray-600">
              {polygonPoints.length} Punkte definiert
            </div>
          )}
        </div>
        
        <p className="text-sm font-medium">Aktuelle Position:</p>
        <p className="text-sm">Lat: {currentPosition[0]?.toFixed(6)}</p>
        <p className="text-sm">Lng: {currentPosition[1]?.toFixed(6)}</p>
        <p className="text-sm">Gemeinde: {metadata.gemeinde}</p>
        <p className="text-sm">Standort: {metadata.standort}</p>
        <p className="text-sm">Höhe über Meer: {metadata.elevation || elevation}</p>
        <p className="text-sm">Hangneigung: {metadata.slope || slope}</p>
        <p className="text-sm">Exposition: {metadata.exposition || exposition}</p>
        
        <div className="pt-4">
          <Button 
            onClick={testGeoBrowserApi} 
            disabled={isLoading}
            className="text-sm"
            variant="outline"
          >
            {isLoading ? 'Wird getestet...' : 'GeoBrowser-API testen'}
          </Button>
        </div>
        
        {debugInfo && (
          <div className="mt-4 p-4 bg-gray-100 rounded-md">
            <h3 className="text-sm font-medium mb-2">API Debug-Informationen:</h3>
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">Exposition API</summary>
              <p className="mt-1"><strong>URL:</strong> <a href={debugInfo.debug?.expositionUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 break-all">{debugInfo.debug?.expositionUrl}</a></p>
              <p className="mt-1"><strong>Status:</strong> {debugInfo.debug?.expositionResponse?.status} {debugInfo.debug?.expositionResponse?.statusText}</p>
              <p className="mt-1"><strong>Content-Type:</strong> {debugInfo.debug?.expositionResponse?.contentType}</p>
              <pre className="mt-2 p-2 bg-gray-200 rounded overflow-auto max-h-40">
                {JSON.stringify(debugInfo.debug?.parsedData?.exposition, null, 2)}
              </pre>
            </details>
            
            <details className="text-xs mt-4">
              <summary className="cursor-pointer font-medium">Hangneigung API</summary>
              <p className="mt-1"><strong>URL:</strong> <a href={debugInfo.debug?.slopeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 break-all">{debugInfo.debug?.slopeUrl}</a></p>
              <p className="mt-1"><strong>Status:</strong> {debugInfo.debug?.slopeResponse?.status} {debugInfo.debug?.slopeResponse?.statusText}</p>
              <p className="mt-1"><strong>Content-Type:</strong> {debugInfo.debug?.slopeResponse?.contentType}</p>
              <pre className="mt-2 p-2 bg-gray-200 rounded overflow-auto max-h-40">
                {JSON.stringify(debugInfo.debug?.parsedData?.slope, null, 2)}
              </pre>
            </details>
            
            <details className="text-xs mt-4">
              <summary className="cursor-pointer font-medium">Gemeinde API</summary>
              <p className="mt-1"><strong>URL:</strong> <a href={debugInfo.debug?.municipalityUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 break-all">{debugInfo.debug?.municipalityUrl}</a></p>
              <p className="mt-1"><strong>Status:</strong> {debugInfo.debug?.municipalityResponse?.status} {debugInfo.debug?.municipalityResponse?.statusText}</p>
              <p className="mt-1"><strong>Content-Type:</strong> {debugInfo.debug?.municipalityResponse?.contentType}</p>
              <pre className="mt-2 p-2 bg-gray-200 rounded overflow-auto max-h-40">
                {JSON.stringify(debugInfo.debug?.parsedData?.municipality, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
