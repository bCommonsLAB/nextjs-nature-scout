"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { NatureScoutData, GeocodingResult } from "@/types/nature-scout";
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { MoveIcon, MapPinCheck, RefreshCw, CircleDashed, LocateFixed } from "lucide-react";
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { InstructionDialog } from "@/components/ui/instruction-dialog";
import type { MapNoSSRHandle } from "@/components/map/mapNoSSR";

// Dynamisch geladene Karte ohne SSR
const MapNoSSR = dynamic(() => import('@/components/map/mapNoSSR'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Karte wird geladen...</div>
});

// Typen für den Map-Modus
type MapMode = 'navigation' | 'polygon' | 'none';

export function LocationDetermination({ 
  metadata, 
  setMetadata,
  showHelp,
  onHelpShown,
  scrollToNext
}: { 
  metadata: NatureScoutData; 
  setMetadata: React.Dispatch<React.SetStateAction<NatureScoutData>>;
  showHelp?: boolean;
  onHelpShown?: () => void;
  scrollToNext?: () => void;
}) {
  // Grundlegende Zustände für die Map
  const [currentPosition, setCurrentPosition] = useState<[number, number]>([
    // Fallback-Wert für latitude verwenden, wenn undefined oder 0
    metadata.latitude && metadata.latitude !== 0 ? metadata.latitude : 46.724212, 
    // Fallback-Wert für longitude verwenden, wenn undefined oder 0
    metadata.longitude && metadata.longitude !== 0 ? metadata.longitude : 11.65555
  ]);
  const [zoom, setZoom] = useState<number>(13);
  const [mapMode, setMapMode] = useState<MapMode>('navigation');
  const [polygonPoints, setPolygonPoints] = useState<Array<[number, number]>>(
    metadata.polygonPoints || []
  );
  
  // Referenz auf die Map-Instanz für direkte Steuerung
  const mapRef = useRef<MapNoSSRHandle>(null);
  
  // Zustand für Geodaten und Ladestatus
  const [isLoadingGeodata, setIsLoadingGeodata] = useState<boolean>(false);
  const [showLocationInfo, setShowLocationInfo] = useState<boolean>(false);
  const [isSavingPolygon, setIsSavingPolygon] = useState<boolean>(false);
  
  // Zustand für die berechnete Fläche
  const [areaInSqMeters, setAreaInSqMeters] = useState<number>(
    metadata.plotsize || 0
  );
  
  // Hilfsdialog-Zustände
  const [showWelcomePopup, setShowWelcomePopup] = useState<boolean>(true);
  const [showPolygonPopup, setShowPolygonPopup] = useState<boolean>(false);
  const [dontShowWelcomeAgain, setDontShowWelcomeAgain] = useState<boolean>(
    typeof window !== 'undefined' ? localStorage.getItem('dontShowWelcomeAgain') === 'true' : false
  );
  const [dontShowPolygonAgain, setDontShowPolygonAgain] = useState<boolean>(
    typeof window !== 'undefined' ? localStorage.getItem('dontShowPolygonAgain') === 'true' : false
  );

  // Funktion zum Zentrieren der Karte auf die gespeicherte Position
  const centerMapToCurrentPosition = useCallback(() => {
    console.log('Zentriere Karte auf gespeicherte Position:', currentPosition);
    
    // Direkte Methode aufrufen, um die Karte zu zentrieren
    if (mapRef.current) {
      mapRef.current.centerMap(currentPosition[0], currentPosition[1], 18);
    } else {
      console.warn('Map-Referenz nicht verfügbar');
      
      // Fallback: Nur Zoom ändern, falls keine direkte Methode verfügbar ist
      setZoom(18);
    }
  }, [currentPosition]);

  // Aktuelle GPS-Position abrufen und als currentPosition setzen
  // Diese Funktion wird nur bei der Initialisierung eines neuen Habitats verwendet
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Debug-Ausgabe
          console.log('GPS-Position ermittelt:', { latitude, longitude });
          
          // Position aktualisieren
          setCurrentPosition([latitude, longitude]);
          
          // Zoom-Level aktualisieren
          setZoom(18);
        },
        (error) => {
          console.error("Fehler bei der Standortermittlung:", error);
        }
      );
    }
  };

  // Geodaten vom Server abrufen
  const getGeoDataFromCoordinates = async (lat: number, lng: number) => {
    setIsLoadingGeodata(true);
    try {
      const apiUrl = `/api/geobrowser?lat=${lat}&lon=${lng}`;
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
        elevation: data.elevation || 'unbekannt',
        exposition: data.exposition || 'unbekannt',
        slope: data.slope || 'unbekannt'
      }));
      
      // Anzeige der Standortinformationen aktivieren
      setShowLocationInfo(true);
      
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
    } finally {
      setIsLoadingGeodata(false);
    }
  };

  // Modus wechseln
  const toggleMapMode = (mode: MapMode) => {
    // Wenn der aktuelle Modus bereits der gewählte Modus ist, auf 'none' setzen
    const newMode = mapMode === mode ? 'none' : mode;
    
    setMapMode(newMode);
    
    // Standortinformationen nur im 'none'-Modus anzeigen
    setShowLocationInfo(newMode === 'none');
    
    // Dialog für Polygon-Modus anzeigen
    if (newMode === 'polygon' && !dontShowPolygonAgain) {
      setShowPolygonPopup(true);
    }
  };

  // Handler für Flächenänderungen
  const handleAreaChange = (newArea: number) => {
    console.log('LocationDetermination: handleAreaChange aufgerufen mit Fläche:', newArea, 'm²');
    
    // Zusätzliche Validierung
    if (newArea <= 0) {
      console.warn('Ungültige Fläche erhalten:', newArea);
      return;
    }
    
    // Alte Fläche zur Debugging-Zwecken loggen
    console.log('Alte Fläche war:', areaInSqMeters, 'm²');
    
    // Nur den lokalen State aktualisieren, NICHT die Metadaten
    // Die Metadaten werden erst beim Speichern aktualisiert
    setAreaInSqMeters(newArea);
    
    // WICHTIG: Keine Aktualisierung der Metadaten hier, um Endlosschleifen zu vermeiden
    // setMetadata ruft einen Re-Render hervor, der wieder zu handleAreaChange führt
  };

  // Polygonpunkte aktualisieren
  const handlePolygonChange = (newPoints: Array<[number, number]>) => {
    console.log('Polygon-Punkte aktualisiert:', newPoints.length, 'Punkte');
    setPolygonPoints(newPoints);
    
    // In den Metadaten speichern
    setMetadata(prevMetadata => ({
      ...prevMetadata,
      polygonPoints: newPoints
    }));
  };

  // Polygon abschließen
  const savePolygon = async () => {
    setIsSavingPolygon(true);
    try {
      // Aktuelle Polygon-Punkte von der Map holen
      
      // Im Bearbeitungsmodus die aktuellen Punkte direkt aus der Karte extrahieren
      const currentPoints = mapRef.current?.getCurrentPolygonPoints() || [];
      console.log('Speichere Polygon mit', currentPoints.length, 'Punkten und Fläche:', areaInSqMeters, 'm²');
      
      const message = 
          "Der Habitat-Umriss ist noch nicht geschlossen.\n\n" +
          "Bitte klicken Sie zum Abschluss wieder auf den ersten Punkt, damit ein geschlossenes Polygon entsteht. " +
          "Ein korrekt geschlossener Umriss ist wichtig für die Berechnung der Fläche und die Lagebestimmung.";
        
      // Prüfen, ob genug Punkte vorhanden sind
      if (currentPoints.length < 3) {
        setIsSavingPolygon(false);
        alert(message);
        return;
      }
      
      // Sicherstellen, dass der Polygonzug geschlossen ist (erster und letzter Punkt identisch)
      const firstPoint = currentPoints[0];
      const lastPoint = currentPoints[currentPoints.length - 1];
      
      
      console.log('Speichere Polygon mit Punkten:', currentPoints.length);
      
      // Mittelpunkt berechnen
      const centerLat = currentPoints.reduce((sum, point) => sum + point[0], 0) / currentPoints.length;
      const centerLng = currentPoints.reduce((sum, point) => sum + point[1], 0) / currentPoints.length;
      
      // Finale Metadaten mit aktualisierten Werten
      const updatedMetadata = {
        ...metadata,
        latitude: centerLat,
        longitude: centerLng,
        polygonPoints: currentPoints,
        plotsize: areaInSqMeters // Sicherstellen, dass die aktuelle Fläche verwendet wird
      };
      
      console.log('Finales Update der Metadaten mit Fläche:', updatedMetadata.plotsize);
      
      // Metadaten in einem Schritt aktualisieren
      setMetadata(updatedMetadata);
      
      // Lokaler State für Polygon-Punkte und Position aktualisieren
      setPolygonPoints(currentPoints);
      setCurrentPosition([centerLat, centerLng]);
      
      // Standortinformationen abrufen
      await getGeoDataFromCoordinates(centerLat, centerLng);
      
      // Explizit den "none"-Modus setzen, um anzuzeigen, dass wir fertig sind
      setMapMode('none');
      
      // Zum Weiter-Button scrollen, nachdem alles gespeichert wurde
      if (scrollToNext) {
        // Kurze Verzögerung, damit die UI Zeit hat, sich zu aktualisieren
        setTimeout(() => {
          scrollToNext();
        }, 500);
      }
    } catch (error) {
      console.error("Fehler beim Speichern des Polygons:", error);
      setIsSavingPolygon(false);
      alert("Beim Speichern des Habitats ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.");
    } finally {
      setIsSavingPolygon(false);
    }
  };

  // Polygon neu beginnen
  const restartPolygon = () => {
    setPolygonPoints([]);
    setMetadata(prevMetadata => ({
      ...prevMetadata,
      polygonPoints: []
    }));
    
    // Standortinformationsanzeige ausblenden
    setShowLocationInfo(false);
  };

  // "Nicht mehr anzeigen" Einstellungen speichern
  const saveWelcomePreference = (value: boolean) => {
    setDontShowWelcomeAgain(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dontShowWelcomeAgain', value.toString());
    }
  };

  const savePolygonPreference = (value: boolean) => {
    setDontShowPolygonAgain(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dontShowPolygonAgain', value.toString());
    }
  };

  // Beim Laden prüfen, ob bereits Geodaten vorhanden sind
  useEffect(() => {
    if (metadata.standort && 
        metadata.standort !== 'Standort konnte nicht ermittelt werden' && 
        metadata.standort !== 'unbekannt') {
      setShowLocationInfo(true);
    }
  }, [metadata.standort]);
  
  // Bei der ersten Initialisierung ohne gültige Position GPS verwenden
  useEffect(() => {
    if (!metadata.latitude && !metadata.longitude) {
      // Nur bei der Initialisierung ohne gültige Position die GPS-Position abrufen
      getCurrentLocation();
    }
  }, [metadata.latitude, metadata.longitude]);

  // Effekt für den Hilfe-Button
  useEffect(() => {
    if (showHelp) {
      // Je nach aktuellem Modus den entsprechenden Dialog anzeigen
      if (mapMode === 'polygon') {
        setShowPolygonPopup(true);
      } else {
        setShowWelcomePopup(true);
      }
      
      // Nach dem Anzeigen das Help-Flag NICHT sofort zurücksetzen
      // Wird stattdessen beim Schließen des Dialogs gemacht
    }
  }, [showHelp, mapMode]);

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      {/* Map-Container mit relativer Positionierung für überlagerte UI-Elemente */}
      <div className="relative w-full flex-grow">
        <MapNoSSR
          ref={mapRef}
          position={currentPosition}
          zoom={zoom}
          onCenterChange={(newCenter) => {
            // Diese Funktion setzt die currentPosition nur bei Drag der Karte
            // Soll keine Auswirkung auf die gespeicherte Position haben
          }}
          onZoomChange={setZoom}
          onPolygonChange={handlePolygonChange}
          onAreaChange={handleAreaChange}
          editMode={mapMode === 'polygon'}
          initialPolygon={polygonPoints}
          hasPolygon={polygonPoints && polygonPoints.length > 0}
          showZoomControls={mapMode !== 'polygon'}
          showPositionMarker={mapMode === 'navigation'}
        />
        
        {/* Standortinformationen (unten rechts) */}
        {showLocationInfo && (
          <div className="absolute bottom-11 right-3 z-[9999] bg-gray-800/30 backdrop-blur-sm rounded-lg shadow-lg p-3 max-w-[60vw]">
            <h3 className="text-[10px] font-semibold mb-1 text-white">Standortinformationen</h3>
            {isLoadingGeodata ? (
              <div className="flex items-center justify-center py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
                <span className="ml-2 text-[10px] text-white">Daten werden geladen...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-white">
                {metadata.gemeinde && metadata.gemeinde !== 'unbekannt' && (
                  <>
                    <div className="text-gray-200">Gemeinde:</div>
                    <div className="font-medium">{metadata.gemeinde}</div>
                  </>
                )}
                {metadata.standort && metadata.standort !== 'Standort konnte nicht ermittelt werden' && (
                  <>
                    <div className="text-gray-200">Standort:</div>
                    <div className="font-medium">{metadata.standort}</div>
                  </>
                )}
                <div className="text-gray-200">Höhe:</div>
                <div className="font-medium">{metadata.elevation && metadata.elevation !== 'unbekannt' ? metadata.elevation : '-'}</div>
                <div className="text-gray-200">Hangneigung:</div>
                <div className="font-medium">{metadata.slope && metadata.slope !== 'unbekannt' ? metadata.slope : '-'}</div>
                <div className="text-gray-200">Exposition:</div>
                <div className="font-medium">{metadata.exposition && metadata.exposition !== 'unbekannt' ? metadata.exposition : '-'}</div>
                <div className="text-gray-200">Fläche:</div>
                <div className="font-medium">{metadata.plotsize ? `${metadata.plotsize.toLocaleString('de-DE')} m²` : '-'}</div>
              </div>
            )}
          </div>
        )}
        
        {/* UI-Overlay: Modus-Buttons (unten links) */}
        <div className="absolute bottom-11 left-3 z-[9999] flex flex-row gap-2">
          <Button 
            variant={mapMode === 'navigation' ? 'outline' : 'default'} 
            size="icon"
            onClick={() => toggleMapMode('navigation')}
            className="h-8 w-8 shadow-lg"
          >
            <MoveIcon className="h-6 w-6" />
          </Button>
          
          <Button 
            variant={mapMode === 'polygon' ? 'outline' : 'default'} 
            size="icon"
            onClick={() => toggleMapMode('polygon')}
            className="h-8 w-8 shadow-lg"
          >
            <CircleDashed className="h-6 w-6" />
          </Button>
        </div>
        
        {/* UI-Overlay: Aktions-Buttons (oben links) */}
        {mapMode !== 'polygon' && (
        <div className="absolute z-[9999] flex flex-row gap-2 items-center" style={{left: 10, top: 75}}>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={centerMapToCurrentPosition} 
              className="h-7 w-7 shadow-lg"
              title="Karte auf gespeicherte Position zentrieren"
            >
              <LocateFixed className="h-6 w-6" />
            </Button>
          </div>
        )}
        {!showLocationInfo && (
          <>
            
            {mapMode === 'polygon' && (
              <div className="absolute bottom-11 right-3 z-[9999] flex flex-row gap-2 items-center">
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={savePolygon}
                  className="shadow-lg flex items-center gap-1 h-8"
                  disabled={isSavingPolygon}
                >
                  {isSavingPolygon ? (
                    <div className="flex items-center gap-1">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-foreground"></div>
                      <span>Speichern...</span>
                    </div>
                  ) : (
                    <>
                      <MapPinCheck className="h-8 w-8" />
                      <span>Speichern</span>
                    </>
                  )}
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={restartPolygon}
                  className="shadow-lg flex items-center gap-1 h-8"
                  disabled={isSavingPolygon}
                >
                  <RefreshCw className="h-8 w-8" />
                  <span>Neu</span>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Willkommens-Dialog */}
      <InstructionDialog
        open={showWelcomePopup}
        onOpenChange={(open) => {
          setShowWelcomePopup(open);
          // Wenn der Dialog geschlossen wird und es war ein Hilfe-Klick, den onHelpShown-Callback aufrufen
          if (!open && showHelp && onHelpShown) {
            onHelpShown();
          }
        }}
        title="Modus 'Karte verschieben'"
        content="Verschieben Sie den Kartenausschnitt zu Ihrem Habitat und zoomen Sie so weit wie möglich hinein. Wechsel Sie unten links dann den Modus 'Habitat eingrenzen'."
        dontShowAgain={dontShowWelcomeAgain}
        onDontShowAgainChange={saveWelcomePreference}
        skipDelay={!!showHelp}
      />
      
      {/* Polygon-Dialog */}
      <InstructionDialog
        open={showPolygonPopup}
        onOpenChange={(open) => {
          setShowPolygonPopup(open);
          // Wenn der Dialog geschlossen wird und es war ein Hilfe-Klick, den onHelpShown-Callback aufrufen
          if (!open && showHelp && onHelpShown) {
            onHelpShown();
          }
        }}
        title="Modus 'Habitat eingrenzen'"
        content="Klicken Sie auf die Karte, um Eckpunkte des Habitat-Umrisses im Uhrzeigersinn zu setzen. Sie benötigen mindestens 3 Punkte. Abschließend klicken Sie auf das 'Speichern'-Symbol."
        dontShowAgain={dontShowPolygonAgain}
        onDontShowAgainChange={savePolygonPreference}
        skipDelay={!!showHelp}
      />
      
      {/* Vollbild-Overlay während des Speichervorgangs */}
      {isSavingPolygon && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
            <div className="mt-3 text-white font-medium">Standortdaten werden ermittelt...</div>
          </div>
        </div>
      )}
    </div>
  );
}
