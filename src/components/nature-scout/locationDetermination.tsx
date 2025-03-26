"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GeocodingResult, NatureScoutData } from "@/types/nature-scout";
import MapNoSSR from '../map/mapNoSSR';
import { Button } from "@/components/ui/button";

export function LocationDetermination({ metadata, setMetadata }: { metadata: NatureScoutData; setMetadata: React.Dispatch<React.SetStateAction<NatureScoutData>> }) {
  console.log('LocationDetermination RENDER', { 
    time: new Date().toISOString(),
    hasExistingPolygon: metadata.polygonPoints && metadata.polygonPoints.length > 0
  });

  const [currentPosition, setCurrentPosition] = useState<[number, number]>([metadata.latitude || 46.724212, metadata.longitude || 11.65555]);
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [polygonPoints, setPolygonPoints] = useState<Array<[number, number]>>(metadata.polygonPoints || []);
  const [uiState, setUiState] = useState<'welcome' | 'drawing' | 'complete'>(
    metadata.polygonPoints && metadata.polygonPoints.length > 0 ? 'complete' : 'welcome'
  );
  const [showInstructions, setShowInstructions] = useState<boolean>(true);
  const [areaInSqMeters, setAreaInSqMeters] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(13);
  
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Vereinfachter useEffect, der nur einmal beim Mount ausgeführt wird
  useEffect(() => {
    // GPS-Position nur abrufen, wenn keine Koordinaten gesetzt sind
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
        () => {
          // Bei Fehler werden die Default-Werte verwendet (bereits im State gesetzt)
        }
      );
    } else {
      // Geodaten nur abrufen, wenn bereits ein Polygon existiert (vorherige Bearbeitung)
      if (metadata.polygonPoints && metadata.polygonPoints.length > 0) {
        getGeoDataFromCoordinates(metadata.latitude, metadata.longitude);
      }
    }
  }, []); // Leere Dependency Array - wird nur beim Mount ausgeführt

  // Neue Funktion zum Abbrechen des Zeichnens
  const cancelDrawing = () => {
    console.log('cancelDrawing aufgerufen');
    setPolygonPoints([]);
    setIsDrawing(false);
    setUiState('welcome');
    console.log('Zeichnen abgebrochen', { isDrawing: false, uiState: 'welcome', polygonPoints: [] });
  };

  // Neue Funktion zum Neustarten des Zeichnens
  const restartDrawing = () => {
    console.log('restartDrawing aufgerufen');
    setPolygonPoints([]);
    setIsDrawing(true);
    setMetadata(prevMetadata => ({
      ...prevMetadata,
      polygonPoints: []
    }));
    console.log('Zeichnen neu gestartet', { isDrawing: true, polygonPoints: [] });
  };

  // Neue Funktion zum direkten Speichern des Umrisses mit übergebenen Punkten
  const savePolygonWithPoints = useCallback((points: Array<[number, number]>) => {
    console.log('savePolygonWithPoints aufgerufen mit Punkten:', points);
    
    if (!points || points.length < 3) {
      console.log('Nicht genug Punkte zum Speichern', { pointCount: points?.length || 0 });
      return;
    }

    // Polygon schließen, falls nötig
    const finalPoints = [...points];
    const lastIndex = finalPoints.length - 1;
    
    if (finalPoints[0] && finalPoints[lastIndex] &&
        (finalPoints[0][0] !== finalPoints[lastIndex][0] || 
         finalPoints[0][1] !== finalPoints[lastIndex][1])) {
      finalPoints.push(finalPoints[0]);
    }

    // Mittelpunkt berechnen
    const centerLat = finalPoints.reduce((sum, point) => sum + point[0], 0) / finalPoints.length;
    const centerLng = finalPoints.reduce((sum, point) => sum + point[1], 0) / finalPoints.length;

    // Metadaten aktualisieren
    setMetadata(prev => ({
      ...prev,
      coordinates: {
        latitude: centerLat,
        longitude: centerLng
      },
      points: finalPoints
    }));

    // Punkte im State aktualisieren
    setPolygonPoints(finalPoints);

    // Edit-Modus beenden
    setIsDrawing(false);
    setUiState('complete');
    console.log('Polygon gespeichert', { 
      isDrawing: false, 
      uiState: 'complete', 
      centerLat,
      centerLng,
      finalPoints 
    });
    
    // Standortinformationen automatisch abrufen
    getGeoDataFromCoordinates(centerLat, centerLng);
  }, []);

  // Polygonpunkte-Handler
  const handlePolygonChange = useCallback((newPoints: Array<[number, number]>) => {
    console.log('handlePolygonChange aufgerufen', { newPoints });
    setPolygonPoints(newPoints);
  }, []);

  // Neue Funktion zum Speichern des Umrisses mit automatischem Schließen
  const savePolygon = useCallback(() => {
    // Aktuelle Punkte aus dem State UND aus der Map holen
    const points = polygonPoints;
    console.log('savePolygon aufgerufen', { points });
    
    if (!points || points.length < 3) {
      console.log('Nicht genug Punkte zum Speichern', { pointCount: points?.length || 0 });
      return;
    }

    // Polygon schließen, falls nötig
    const finalPoints = [...points];
    const lastIndex = finalPoints.length - 1;
    
    if (finalPoints[0] && finalPoints[lastIndex] &&
        (finalPoints[0][0] !== finalPoints[lastIndex][0] || 
         finalPoints[0][1] !== finalPoints[lastIndex][1])) {
      finalPoints.push(finalPoints[0]);
    }

    // Mittelpunkt berechnen
    const centerLat = finalPoints.reduce((sum, point) => sum + point[0], 0) / finalPoints.length;
    const centerLng = finalPoints.reduce((sum, point) => sum + point[1], 0) / finalPoints.length;

    // Metadaten aktualisieren
    setMetadata(prev => ({
      ...prev,
      coordinates: {
        latitude: centerLat,
        longitude: centerLng
      },
      points: finalPoints
    }));

    // Edit-Modus beenden
    setIsDrawing(false);
    setUiState('complete');
    console.log('Polygon gespeichert', { 
      isDrawing: false, 
      uiState: 'complete', 
      centerLat,
      centerLng,
      finalPoints 
    });
  }, [polygonPoints]);

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

  // Zoom-Änderung verfolgen
  const handleZoomChange = useCallback((newZoom: number) => {
    console.log('ZOOM ÄNDERUNG', { 
      currentZoom: zoom,
      newZoom,
      time: new Date().toISOString()
    });
    setZoom(newZoom);
  }, [zoom]);

  // Handler für die Zentrumsänderung der Karte
  const handleCenterChange = useCallback((newCenter: [number, number]) => {
    console.log('CENTER ÄNDERUNG', { 
      currentPosition,
      newCenter,
      time: new Date().toISOString()
    });
    setCurrentPosition(newCenter);
    setMetadata(prevMetadata => ({
      ...prevMetadata,
      latitude: newCenter[0],
      longitude: newCenter[1],
    }));
  }, [currentPosition, setMetadata]);

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
          <p>Falls notwendig, verschieben Sie den Kartenausschnitt zu Ihrem aktuellen Standort und zoomen Sie so weit wie möglich hinein. Wenn Sie bereit sind, klicken Sie auf &quot;Habitatumriss erfassen&quot;, um fortzufahren.</p>
        </div>
      )}

      {uiState === 'drawing' && showInstructions && (
        <div className="bg-yellow-50 p-3 rounded-md mt-2 mb-4">
          <p className="text-sm">Zeichnen Sie eine Umrisslinie um das Habitat. Wählen sie als letzten Punkt den ersten aus, dann ist die Umrisslinie geschlossen. Klicken Sie dann auf &quot;Umrisslinie speichern&quot;</p>
        </div>
      )}

      <div className="relative w-full h-[calc(100vh-6rem)]">
        <MapNoSSR
          position={currentPosition}
          zoom={zoom}
          onCenterChange={handleCenterChange}
          onZoomChange={handleZoomChange}
          onPolygonChange={handlePolygonChange}
          onAreaChange={(area) => {
            console.log('Neue Fläche berechnet:', area);
            setAreaInSqMeters(area);
          }}
          initialPolygon={polygonPoints}
          editMode={isDrawing}
          onStartDrawing={() => {
            console.log('onStartDrawing von MapNoSSR aufgerufen');
            setIsDrawing(true);
            setShowInstructions(true);
            console.log('Zeichenmodus aktiviert von MapNoSSR', { 
              isDrawing: true, 
              showInstructions: true 
            });
          }}
          onSavePolygon={savePolygon}
          onSavePolygonWithPoints={savePolygonWithPoints}
          onRestartDrawing={restartDrawing}
          onCancelDrawing={cancelDrawing}
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        {polygonPoints.length > 0 && (
          <div className="text-sm text-gray-600 mb-4">
            {polygonPoints.length} {polygonPoints.length === 1 ? 'Punkt' : 'Punkte'} definiert
            {polygonPoints.length < 3 && (
              <span className="text-amber-600 ml-2">(mindestens 3 Punkte erforderlich)</span>
            )}
          </div>
        )}

        {/* Geodaten in einem Grid-Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Linke Spalte: Basisinformationen */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Aktuelle Position</h3>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <p className="text-sm">Breitengrad: {currentPosition[0]?.toFixed(6)}°</p>
              <p className="text-sm">Längengrad: {currentPosition[1]?.toFixed(6)}°</p>
              {areaInSqMeters > 0 && (
                <p className="text-sm mt-2">Fläche: {areaInSqMeters.toLocaleString('de-DE')} m²</p>
              )}
            </div>
          </div>

          {/* Rechte Spalte: Geodaten */}
          {uiState === 'complete' && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Standortinformationen</h3>
              <div className="bg-white p-3 rounded-md shadow-sm space-y-2">
                {metadata.gemeinde !== 'unbekannt' && (
                  <div>
                    <p className="text-xs text-gray-500">Gemeinde</p>
                    <p className="text-sm font-medium">{metadata.gemeinde}</p>
                  </div>
                )}
                {metadata.standort !== 'Standort konnte nicht ermittelt werden' && (
                  <div>
                    <p className="text-xs text-gray-500">Standort</p>
                    <p className="text-sm font-medium">{metadata.standort}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div>
                    <p className="text-xs text-gray-500">Höhe</p>
                    <p className="text-sm font-medium">{metadata.elevation !== 'unbekannt' ? metadata.elevation : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Hangneigung</p>
                    <p className="text-sm font-medium">{metadata.slope !== 'unbekannt' ? metadata.slope : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Exposition</p>
                    <p className="text-sm font-medium">{metadata.exposition !== 'unbekannt' ? metadata.exposition : '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
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
