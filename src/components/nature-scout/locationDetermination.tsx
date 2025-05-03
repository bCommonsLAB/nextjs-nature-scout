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

// Typdefinition für die Habitat-Daten aus der API
interface HabitatFromAPI {
  jobId: string;
  metadata: {
    latitude: number;
    longitude: number;
    erfassungsperson?: string;
    gemeinde?: string;
    flurname?: string;
    standort?: string;
    polygonPoints?: [number, number][];  // Polygon-Punkte sind hier gespeichert
  };
  result?: {
    habitattyp: string;
    habitatfamilie?: string;
    schutzstatus?: string;
  };
  verifiedResult?: {
    habitattyp?: string;
    habitatfamilie?: string;
  };
  verified?: boolean;
}

// Typdefinition für anzeigbare Habitate auf der Karte
interface MapHabitat {
  id: string;
  name: string;
  position: [number, number];
  polygon?: [number, number][];
  color: string;
  transparenz: number;
  metadata?: {
    gemeinde?: string;
    erfasser?: string;
    verifiziert?: boolean;
  };
}

// Konvertierung von API-Habitat zu internem Habitat-Format
function convertToMapHabitat(apiHabitat: HabitatFromAPI): MapHabitat | null {
  console.log('convertToMapHabitat wird ausgeführt');

  // Sicherstellen, dass wir gültige Koordinaten haben
  if ((!apiHabitat.metadata?.latitude || !apiHabitat.metadata?.longitude) && 
      (!apiHabitat.metadata?.polygonPoints || !Array.isArray(apiHabitat.metadata.polygonPoints) || apiHabitat.metadata.polygonPoints.length === 0)) {
    return null;
  }

  // Priorität verwenden: verifizierte Daten, dann normale Ergebnisse
  const habitatName = apiHabitat.verifiedResult?.habitattyp || apiHabitat.result?.habitattyp || 'Unbekanntes Habitat';
  const habitatFamily = apiHabitat.verifiedResult?.habitatfamilie || apiHabitat.result?.habitatfamilie;

  // Standardposition aus Lat/Lng
  const position: [number, number] = [
    Number(apiHabitat.metadata.latitude || 0), 
    Number(apiHabitat.metadata.longitude || 0)
  ];
  
  // Polygon als undefined initialisieren
  let polygon: [number, number][] | undefined = undefined;

  // Prüfen, ob wir gültige Polygondaten haben
  if (apiHabitat.metadata.polygonPoints && 
      Array.isArray(apiHabitat.metadata.polygonPoints) && 
      apiHabitat.metadata.polygonPoints.length >= 3) {
    
    try {
      // Vereinfachter Ansatz: Wir konvertieren die Punkte, unabhängig von ihrer Struktur
      const points: [number, number][] = [];
      
      for (let i = 0; i < apiHabitat.metadata.polygonPoints.length; i++) {
        const point = apiHabitat.metadata.polygonPoints[i];
        
        // Werte aus dem Punkt extrahieren und als Zahlen sicherstellen
        let lat: number | null = null;
        let lng: number | null = null;
        
        // Fall 1: Punkt ist ein Array
        if (Array.isArray(point) && point.length >= 2) {
          // Verwende die ersten beiden Werte als lat/lng
          lat = Number(point[0]);
          lng = Number(point[1]);
        } 
        // Fall 2: Versuche, es als ein Objekt zu behandeln und lat/lng zu extrahieren
        else if (point && typeof point === 'object') {
          // Sicherstellen, dass wir keine TypeScript-Fehler bekommen
          const obj = point as any;
          
          if (typeof obj.lat === 'number' || typeof obj.lat === 'string') {
            lat = Number(obj.lat);
          } else if (typeof obj.latitude === 'number' || typeof obj.latitude === 'string') {
            lat = Number(obj.latitude);
          }
          
          if (typeof obj.lng === 'number' || typeof obj.lng === 'string') {
            lng = Number(obj.lng);
          } else if (typeof obj.longitude === 'number' || typeof obj.longitude === 'string') {
            lng = Number(obj.longitude);
          }
        }
        
        // Nur gültige Koordinaten hinzufügen
        if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
          // Testen, ob wir die Koordinaten tauschen müssen (Leaflet erwartet [lat, lng])
          if (Math.abs(lat) > 90) {
            // Lat ist außerhalb des gültigen Bereichs, Koordinaten tauschen
            points.push([lng, lat] as [number, number]);
          } else {
            points.push([lat, lng] as [number, number]);
          }
        }
      }
      
      // Nur fortfahren, wenn wir genug gültige Punkte haben
      if (points.length >= 3) {
        // Prüfen, ob das Polygon geschlossen ist (erster und letzter Punkt identisch)
        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];
        
        const isPolygonClosed = 
          points.length >= 2 && 
          firstPoint && lastPoint &&
          firstPoint[0] === lastPoint[0] && 
          firstPoint[1] === lastPoint[1];
        
        // Polygon schließen, wenn nötig
        if (!isPolygonClosed && points.length >= 3 && firstPoint) {
          // Ersten Punkt am Ende anhängen
          points.push([firstPoint[0], firstPoint[1]]);
        }
        
        // Polygon zuweisen
        polygon = points;
      }
    } catch (error) {
      console.error(`Fehler bei der Verarbeitung des Polygons für Habitat ${apiHabitat.jobId}:`, error);
    }
  }

  let color = '#22c55e'; // Grün für niederwertige Flächen (Standard)
  let transparenz = 0.5;
  // Farbe basierend auf Schutzstatus bestimmen
  if (apiHabitat.result?.schutzstatus === 'gesetzlich geschützt') {
    color = '#ef4444'; // Rot für geschützte Flächen
  } else if (apiHabitat.result?.schutzstatus === 'ökologisch hochwertig') {
    color = '#eab308'; // Gelb für hochwertige Flächen
  }
  if (apiHabitat.verified) {
    transparenz=0.9;
  }  

  return {
    id: apiHabitat.jobId,
    name: habitatName + (apiHabitat.metadata.flurname ? ` (${apiHabitat.metadata.flurname})` : ''),
    position,
    polygon,
    color,
    transparenz,
    // Zusätzliche Metadaten für Popup/Details
    metadata: {
      gemeinde: apiHabitat.metadata.gemeinde,
      erfasser: apiHabitat.metadata.erfassungsperson,
      verifiziert: apiHabitat.verified
    }
  };
}

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
  
  // Zustände für bestehende Habitate
  const [existingHabitats, setExistingHabitats] = useState<MapHabitat[]>([]);
  const [isLoadingHabitats, setIsLoadingHabitats] = useState<boolean>(false);
  const [habitatLoadError, setHabitatLoadError] = useState<string | null>(null);
  const [selectedHabitatId, setSelectedHabitatId] = useState<string | null>(null);
  
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
  const [dontShowWelcomeAgain, setDontShowWelcomeAgain] = useState<boolean>(
    typeof window !== 'undefined' ? localStorage.getItem('dontShowWelcomeAgain') === 'true' : false
  );
  const [dontShowPolygonAgain, setDontShowPolygonAgain] = useState<boolean>(
    typeof window !== 'undefined' ? localStorage.getItem('dontShowPolygonAgain') === 'true' : false
  );
  
  // Dialog-Zustände - initial auf false setzen, wenn "Nicht mehr anzeigen" aktiviert ist
  const [showWelcomePopup, setShowWelcomePopup] = useState<boolean>(!dontShowWelcomeAgain);
  const [showPolygonPopup, setShowPolygonPopup] = useState<boolean>(false);

  // Funktion zum Laden bestehender Habitate
  const loadExistingHabitats = useCallback(async () => {
    try {
      setIsLoadingHabitats(true);
      setHabitatLoadError(null);
      
      console.log('Lade Habitate - API-Aufruf wird gestartet...');
      
      // Erhöhtes Limit, um mehr Habitate für den aktuellen Bereich zu erhalten
      const response = await fetch('/api/habitat/public?limit=100');
      
      if (!response.ok) {
        throw new Error(`API-Fehler: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`${data.entries.length} Habitate vom Server geladen`);
      
      // Konvertiere API-Daten in das Format für die Karte
      const validHabitats = data.entries
        .filter((h: HabitatFromAPI) => 
          // Filtere Habitate ohne gültige Geo-Koordinaten
          (h.metadata?.latitude && h.metadata?.longitude) || 
          (h.metadata?.polygonPoints && h.metadata.polygonPoints.length > 0)
        )
        .map(convertToMapHabitat)
        .filter(Boolean); // Entferne null-Werte
      
      console.log(`${validHabitats.length} gültige Habitate für die Karte vorbereitet`);
      setExistingHabitats(validHabitats);
      
    } catch (err) {
      console.error('Fehler beim Laden der bestehenden Habitate:', err);
      setHabitatLoadError('Bestehende Habitate konnten nicht geladen werden');
    } finally {
      setIsLoadingHabitats(false);
    }
  }, []);

  // Handler für Klicks auf Habitate
  const handleHabitatClick = useCallback((habitatId: string) => {
    setSelectedHabitatId(habitatId);
  }, []);

  // Klick außerhalb eines Habitats schließt das Info-Panel
  const handleMapClick = useCallback(() => {
    if (selectedHabitatId) {
      setSelectedHabitatId(null);
    }
  }, [selectedHabitatId]);

  // Funktion zum Zentrieren der Karte auf die gespeicherte Position
  const centerMapToCurrentPosition = useCallback(() => {
    // Direkte Methode aufrufen, um die Karte zu zentrieren
    if (mapRef.current) {
      mapRef.current.centerMap(currentPosition[0], currentPosition[1], 18);
    } else {
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
          
          // Position aktualisieren
          setCurrentPosition([latitude, longitude]);
          
          // Zoom-Level aktualisieren
          setZoom(18);
        },
        (error) => {
          // Ausführlichere Fehlerinformationen ausgeben
          const errorMessages: Record<number, string> = {
            1: "Der Zugriff auf den Standort wurde verweigert. Bitte überprüfen Sie Ihre Browser-Berechtigungen.",
            2: "Die Standortinformationen sind nicht verfügbar. Bitte überprüfen Sie, ob GPS aktiviert ist.",
            3: "Zeitüberschreitung bei der Standortermittlung. Bitte versuchen Sie es erneut."
          };
          
          const errorCode = error.code || 0;
          const errorMessage = errorMessages[errorCode] || `Unbekannter Fehler (${errorCode}): ${error.message}`;
          
          console.error("Fehler bei der Standortermittlung:", {
            code: errorCode,
            message: errorMessage,
            originalError: error
          });
          
          // Optional: Dem Benutzer eine Nachricht anzeigen
          alert(`Standort konnte nicht ermittelt werden: ${errorMessage}\n\nBitte wählen Sie Ihren Standort manuell auf der Karte.`);
        },
        // Zusätzliche Optionen für die Standortermittlung
        {
          enableHighAccuracy: true,  // Hohe Genauigkeit anfordern
          timeout: 10000,           // 10 Sekunden Timeout
          maximumAge: 0             // Keinen Cache verwenden
        }
      );
    } else {
      console.error("Geolocation wird von diesem Browser nicht unterstützt.");
      alert("Die Standortermittlung wird von Ihrem Browser nicht unterstützt. Bitte wählen Sie Ihren Standort manuell auf der Karte.");
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
      
      // Setze die geografischen Daten
      setMetadata(prev => ({
        ...prev,
        standort: data.standort || 'Standort konnte nicht ermittelt werden',
        gemeinde: data.gemeinde || 'unbekannt',
        flurname: data.flurname || 'unbekannt',
        elevation: data.elevation || 'unbekannt',
        exposition: data.exposition || 'unbekannt',
        slope: data.slope || 'unbekannt',
        kataster: data.kataster // Katasterdaten speichern, wenn vorhanden
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
        slope: 'unbekannt',
        kataster: undefined // Katasterdaten zurücksetzen
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
    
    // Habitat-Auswahl zurücksetzen beim Moduswechsel
    if (selectedHabitatId) {
      setSelectedHabitatId(null);
    }
    
    // Dialog für Polygon-Modus anzeigen, nur wenn "Nicht mehr anzeigen" nicht aktiviert ist
    if (newMode === 'polygon' && !dontShowPolygonAgain) {
      setShowPolygonPopup(true);
    }
  };

  // Handler für Flächenänderungen
  const handleAreaChange = (newArea: number) => {
    // Zusätzliche Validierung
    if (newArea <= 0) {
      return;
    }
    
    // Nur den lokalen State aktualisieren, NICHT die Metadaten
    // Die Metadaten werden erst beim Speichern aktualisiert
    setAreaInSqMeters(newArea);
    
    // WICHTIG: Keine Aktualisierung der Metadaten hier, um Endlosschleifen zu vermeiden
    // setMetadata ruft einen Re-Render hervor, der wieder zu handleAreaChange führt
  };

  // Polygonpunkte aktualisieren
  const handlePolygonChange = (newPoints: Array<[number, number]>) => {
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
  
  // Einfacher Effekt zum einmaligen Laden der Habitate beim Komponenten-Mount
  useEffect(() => {
    let isMounted = true;
    
    // Habitate nur laden, wenn noch keine geladen wurden
    if (existingHabitats.length === 0 && !isLoadingHabitats) {
      console.log('Initialisiere Habitat-Ladung');
      
      // Async IIFE für sauberes Error-Handling
      (async () => {
        try {
          // Wrapper um loadExistingHabitats, der prüft, ob die Komponente noch mounted ist
          await loadExistingHabitats();
        } catch (error) {
          if (isMounted) {
            console.error('Fehler beim Laden der Habitate im Mount-Effekt:', error);
          }
        }
      })();
    }
    
    // Cleanup-Funktion
    return () => {
      isMounted = false;
    };
  }, []); // Leeres Dependency-Array für einmalige Ausführung beim Mount

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
          habitats={existingHabitats}
          onHabitatClick={handleHabitatClick}
          onClick={handleMapClick}
        />
        
        {/* Status-Anzeige während Habitate geladen werden */}
        {isLoadingHabitats && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-white/80 py-1 px-3 rounded shadow-md text-sm">
            Lade bestehende Habitate...
          </div>
        )}
        
        {/* Fehleranzeige, falls Habitate nicht geladen werden konnten */}
        {habitatLoadError && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-red-50 py-1 px-3 rounded shadow-md text-sm text-red-500">
            {habitatLoadError}
          </div>
        )}
        
        {/* Info-Panel für ausgewähltes Habitat aus der Datenbank */}
        {selectedHabitatId && (
          <div className="absolute top-14 right-3 z-[9999] bg-white p-3 rounded-lg shadow-lg max-w-xs">
            {(() => {
              const habitat = existingHabitats.find(h => h.id === selectedHabitatId);
              if (!habitat) return 'Habitat-Details werden geladen...';
              
              return (
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-base">Bestehendes Habitat:</h3>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 -mr-1 -mt-1"
                      onClick={() => setSelectedHabitatId(null)}
                    >
                      <span className="sr-only">Schließen</span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </Button>
                  </div>
                  <p className="text-sm">{habitat.name}</p>
                  {habitat.metadata?.gemeinde && (
                    <p className="text-xs">Gemeinde: {habitat.metadata.gemeinde}</p>
                  )}
                  {habitat.metadata?.erfasser && (
                    <p className="text-xs">Erfasser: {habitat.metadata.erfasser}</p>
                  )}
                  <div className="flex items-center text-xs">
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${habitat.metadata?.verifiziert ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                    {habitat.metadata?.verifiziert ? 'Verifiziert' : 'Nicht verifiziert'}
                  </div>
                  <p className="text-xs italic text-red-500 mt-1">
                    Achtung: Dieses Habitat wurde bereits erfasst. Bitte vermeiden Sie Doppelerfassungen.
                  </p>
                </div>
              );
            })()}
          </div>
        )}
        
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
                
                {/* Katasterdaten */}
                {metadata.kataster && (
                  <>
                    <div className="col-span-2 mt-1 border-t border-gray-600 pt-1">
                      <div className="font-semibold mb-0.5">Kataster</div>
                    </div>
                    {metadata.kataster.parzellennummer && (
                      <>
                        <div className="text-gray-200">Parzelle:</div>
                        <div className="font-medium">{metadata.kataster.parzellennummer}</div>
                      </>
                    )}
                    {metadata.kataster.flaeche && (
                      <>
                        <div className="text-gray-200">Katasterfläche:</div>
                        <div className="font-medium">{metadata.kataster.flaeche.toLocaleString('de-DE')} m²</div>
                      </>
                    )}
                    {metadata.kataster.katastralgemeinde && (
                      <>
                        <div className="text-gray-200">Katastralgemeinde:</div>
                        <div className="font-medium">{metadata.kataster.katastralgemeinde}</div>
                      </>
                    )}
                    {metadata.kataster.katastralgemeindeKodex && (
                      <>
                        <div className="text-gray-200">K.G. Kodex:</div>
                        <div className="font-medium">{metadata.kataster.katastralgemeindeKodex}</div>
                      </>
                    )}
                  </>
                )}
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
