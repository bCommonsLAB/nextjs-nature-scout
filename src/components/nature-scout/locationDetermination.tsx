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
  // Neuer Status für die UI-Steuerung
  const [uiState, setUiState] = useState<'welcome' | 'drawing' | 'complete'>(
    metadata.polygonPoints && metadata.polygonPoints.length > 0 ? 'complete' : 'welcome'
  );
  const [showInstructions, setShowInstructions] = useState<boolean>(true);
  
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Vereinfachter useEffect, der nur einmal beim Mount ausgeführt wird
  useEffect(() => {
    // GPS-Position nur abrufen, wenn keine Koordinaten gesetzt sind
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
          
          // Keine automatische Geodatenermittlung beim ersten Laden
          // getGeoDataFromCoordinates(latitude, longitude);
        },
        () => {
          // Bei Fehler werden die Default-Werte verwendet (bereits im State gesetzt)
          // Keine automatische Geodatenermittlung beim ersten Laden
          // getGeoDataFromCoordinates(initialPosition[0], initialPosition[1]);
        }
      );
    } else {
      // Vorhandene Koordinaten verwenden, aber keine Geodaten abrufen
      // getGeoDataFromCoordinates(metadata.latitude, metadata.longitude);
      
      // Geodaten nur abrufen, wenn bereits ein Polygon existiert (vorherige Bearbeitung)
      if (metadata.polygonPoints && metadata.polygonPoints.length > 0) {
        getGeoDataFromCoordinates(metadata.latitude, metadata.longitude);
      }
    }
  }, []); // Leere Dependency Array - wird nur beim Mount ausgeführt

  // Neue Funktion zum Starten des Zeichenmodus
  const startDrawingMode = (e: React.MouseEvent) => {
    // Verhindere Standard-Formularverhalten
    e.preventDefault();
    
    setEditMode(true);
    setUiState('drawing');
  };

  // Neue Funktion zum Abschließen des Polygons
  const handlePolygonComplete = (e: React.MouseEvent) => {
    // Verhindere Standard-Formularverhalten
    e.preventDefault();
    
    // Berechne Mittelpunkt des Polygons
    if (polygonPoints.length > 0) {
      const centerPoint = calculatePolygonCenter(polygonPoints);
      setCurrentPosition(centerPoint);
      setInitialPosition(centerPoint);
      
      // Metadaten aktualisieren
      setMetadata(prevMetadata => ({
        ...prevMetadata,
        latitude: centerPoint[0],
        longitude: centerPoint[1],
      }));
      
      // Geodaten für den Mittelpunkt erst jetzt abrufen
      getGeoDataFromCoordinates(centerPoint[0], centerPoint[1]);
    }
    setUiState('complete');
    setEditMode(false); // Zeichenmodus beenden
  };

  // Hilfsfunktion zur Berechnung des Mittelpunkts
  const calculatePolygonCenter = (points: Array<[number, number]>): [number, number] => {
    const latSum = points.reduce((sum, point) => sum + point[0], 0);
    const lngSum = points.reduce((sum, point) => sum + point[1], 0);
    return [latSum / points.length, lngSum / points.length];
  };

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
    
    // Entferne die automatische Geo-Datenermittlung während der Kartenbewegung
    // debouncedGetGeoData(newCenter[0], newCenter[1]);
  }, [debouncedGetGeoData, setMetadata]);

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
      {/* Willkommensnachricht */}
      {showInstructions && uiState === 'welcome' && (
        <div className="rounded-lg bg-blue-50 p-4 mb-4 text-sm">
          <h3 className="font-medium mb-2">Willkommen bei der Standortbestimmung</h3>
          <p>Falls notwendig, verschieben Sie den Kartenausschnitt zu Ihrem aktuellen Standort und zoomen Sie so weit wie möglich hinein. Wenn Sie bereit sind, klicken Sie auf "Habitatumriss erfassen", um fortzufahren.</p>
        </div>
      )}

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
            {uiState === 'welcome' ? (
              <>
                <Button 
                  onClick={startDrawingMode}
                  variant="default"
                  type="button"
                >
                  Habitatumriss erfassen
                </Button>
              </>
            ) : (
              <>
                <Switch 
                  id="edit-mode" 
                  checked={editMode}
                  onCheckedChange={(checked) => {
                    setEditMode(checked);
                    if (checked) {
                      setUiState('drawing');
                    }
                  }}
                />
                <Label htmlFor="edit-mode">Habitatumriss bearbeiten</Label>
              </>
            )}
          </div>
          {polygonPoints.length > 0 && (
            <div className="text-sm text-gray-600">
              {polygonPoints.length} Punkte definiert
            </div>
          )}
        </div>

        {/* Anleitung im Zeichenmodus */}
        {uiState === 'drawing' && showInstructions && (
          <div className="bg-yellow-50 p-3 rounded-md mt-2 mb-4">
            <p className="text-sm">Zeichnen Sie jetzt eine Umrisslinie um das Habitat, einfach durch Auswahl von Eckpunkten im Uhrzeigersinn. Wenn Sie fertig sind, klicken Sie unten auf "Umriss fertig".</p>
          </div>
        )}
        
        {/* Button zum Abschließen des Umrisses */}
        {editMode && polygonPoints.length > 0 && (
          <Button 
            className="w-full mt-4 mb-4" 
            onClick={handlePolygonComplete}
            type="button"
          >
            Umriss fertig
          </Button>
        )}
        
        {/* Basisinformationen - immer anzeigen */}
        <p className="text-sm font-medium">Aktuelle Position:</p>
        <p className="text-sm">Lat: {currentPosition[0]?.toFixed(6)}</p>
        <p className="text-sm">Lng: {currentPosition[1]?.toFixed(6)}</p>
        
        {/* Detaillierte Geoinformationen - nur anzeigen, wenn sie verfügbar sind oder nach Polygon-Erstellung */}
        {uiState === 'complete' && (
          <>
            <p className="text-sm">Gemeinde: {metadata.gemeinde !== 'unbekannt' ? metadata.gemeinde : ''}</p>
            <p className="text-sm">Standort: {metadata.standort !== 'Standort konnte nicht ermittelt werden' ? metadata.standort : ''}</p>
            <p className="text-sm">Höhe über Meer: {metadata.elevation !== 'unbekannt' ? metadata.elevation : 'unbekannt'}</p>
            <p className="text-sm">Hangneigung: {metadata.slope !== 'unbekannt' ? metadata.slope : 'unbekannt'}</p>
            <p className="text-sm">Exposition: {metadata.exposition !== 'unbekannt' ? metadata.exposition : 'unbekannt'}</p>
          </>
        )}
        
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
