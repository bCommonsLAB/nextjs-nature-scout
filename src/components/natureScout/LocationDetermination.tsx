"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { NatureScoutData, GeocodingResult } from "@/types/nature-scout";
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { MoveIcon, MapPinCheck, RefreshCw, CircleDashed, LocateFixed } from "lucide-react";
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { InstructionDialog } from "@/components/ui/instruction-dialog";
import type { MapNoSSRHandle } from "@/components/map/MapNoSSR";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useRouter, useSearchParams } from "next/navigation";

// Dynamisch geladene Karte ohne SSR
const MapNoSSR = dynamic(() => import('@/components/map/MapNoSSR'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Karte wird geladen...</div>
});

// Typen für den Map-Modus
type MapMode = 'navigation' | 'polygon' | 'none';

// Hilfsfunktion zur Flächenberechnung für Polygone (vereinfachte Version)
function calculateAreaFromPoints(points: [number, number][]): number {
  // Stellen wir sicher, dass wir genug Punkte haben
  if (!points || points.length < 3) {
    return 0;
  }
  
  try {
    // Vereinfachte Flächenberechnung (ungefähre Schätzung) für ebene Koordinaten
    let area = 0;
    
    // Gaußsche Flächenformel implementieren (für Polygone im ebenen Koordinatensystem)
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const point1 = points[i];
      const point2 = points[j];
      
      if (point1 && point2 && Array.isArray(point1) && Array.isArray(point2) && 
          point1.length >= 2 && point2.length >= 2) {
        area += point1[0] * point2[1];
        area -= point2[0] * point1[1];
      }
    }
    
    // Umrechnung auf Quadratmeter (grobe Näherung)
    area = Math.abs(area) / 2.0;
    // Anpassungsfaktor für geographische Koordinaten
    const scaleFactor = 10000; // grobe Schätzung, abhängig von der Nähe zum Äquator
    
    return Math.round(area * scaleFactor);
  } catch (error) {
    console.error("Fehler bei der Flächenberechnung:", error);
    return 0;
  }
}

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
  // GPS-Standort des Nutzers - unabhängig vom Habitat
  const [currentPosition, setCurrentPosition] = useState<[number, number]>([0, 0]);
  
  // Neuer Zustand für den GPS-Ladestatus
  const [isLoadingGPS, setIsLoadingGPS] = useState<boolean>(true);
  
  // Neuer Zustand für GPS-Statusfeedback
  const [gpsStats, setGpsStats] = useState<{
    accuracy: number | null;
    messagesCount: number;
    lastUpdate: number;
  }>({
    accuracy: null,
    messagesCount: 0,
    lastUpdate: 0
  });
  
  // Zustand für das Anzeigen des GPS-Statusbadges
  const [showGpsStatus, setShowGpsStatus] = useState<boolean>(true);
  
  // Initialposition für die Karte - kann vom Habitat oder Standard-Fallback kommen
  const initialMapPosition: [number, number] = [
    // Für die Kartenzentriernung bei Bearbeitung eines Habitats
    metadata.latitude && metadata.latitude !== 0 ? metadata.latitude : 46.724212, 
    metadata.longitude && metadata.longitude !== 0 ? metadata.longitude : 11.65555
  ];
  
  // Flag, das bestimmt, ob bereits auf GPS-Position gezoomt wurde
  const [hasZoomedToGPS, setHasZoomedToGPS] = useState(false);
  
  // Speichern der letzten GPS-Positionen zur Ausreißer-Eliminierung
  const [recentPositions, setRecentPositions] = useState<Array<{
    position: [number, number], 
    accuracy: number,
    timestamp: number
  }>>([]);
  
  // Watchposition ID für cleanup
  const watchPositionIdRef = useRef<number | null>(null);
  
  // Referenz für den letzten Update-Zeitpunkt (für Throttling)
  const lastUpdateTimeRef = useRef<number>(0);
  
  // Map-Initialisierungsstatus
  const mapInitializedRef = useRef<boolean>(false);
  
  // Debug-Logging nur im Entwicklungsmodus aktivieren
  const isDev = process.env.NODE_ENV === 'development';
  const logDebug = useCallback((...args: any[]) => {
    if (isDev && args[0] === 'IMPORTANT') {
      console.log(...args.slice(1));
    }
  }, [isDev]);
  
  // Initialen Zoom-Level höher setzen, wenn ein existierendes Habitat bearbeitet wird
  const [zoom, setZoom] = useState<number>(() => {
    // Prüfen, ob ein bestehendes Habitat mit Koordinaten vorliegt
    const hasExistingCoordinates = metadata.latitude && metadata.longitude && 
                                  metadata.latitude !== 0 && metadata.longitude !== 0;
    // Bei existierendem Habitat direkter hoher Zoom (20), sonst niedriger Zoom (13)
    return hasExistingCoordinates ? 20 : 13;
  });
  
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

  const [isExpert, setIsExpert] = useState<boolean>(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Experten-Status prüfen
  useEffect(() => {
    async function checkExpertStatus() {
      try {
        const expertResponse = await fetch('/api/users/isExpert');
        const expertData = await expertResponse.json();
        setIsExpert(expertData.isExpert);
      } catch (error) {
        console.error('Fehler beim Überprüfen des Experten-Status:', error);
        setIsExpert(false);
      }
    }
    
    checkExpertStatus();
  }, []);
  
  // Effekt für die initiale Zoom-Einstellung bei Bearbeitung eines bestehenden Habitats
  // Dieser Effekt wird nur einmal ausgeführt und befasst sich nur mit der Anzeige der Informationen
  useEffect(() => {
    // Prüfen, ob wir ein bestehendes Habitat bearbeiten (mit Koordinaten)
    const editJobId = searchParams.get('editJobId');
    const activeStep = searchParams.get('activeStep');
    
    if (editJobId && activeStep === 'location' && Array.isArray(metadata.polygonPoints) && metadata.polygonPoints.length > 0) {
      // Standortinformationen anzeigen für bestehende Habitate
      setShowLocationInfo(true);
    }
  }, [searchParams, metadata.polygonPoints]);

  // Funktion zum Laden bestehender Habitate
  const loadExistingHabitats = useCallback(async () => {
    try {
      setIsLoadingHabitats(true);
      setHabitatLoadError(null);
      
      // Erhöhtes Limit, um mehr Habitate für den aktuellen Bereich zu erhalten
      const response = await fetch('/api/habitat/public?limit=100&verifizierungsstatus=alle');
      
      if (!response.ok) {
        throw new Error(`API-Fehler: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Konvertiere API-Daten in das Format für die Karte
      const validHabitats = data.entries
        .filter((h: HabitatFromAPI) => 
          // Filtere Habitate ohne gültige Geo-Koordinaten
          (h.metadata?.latitude && h.metadata?.longitude) || 
          (h.metadata?.polygonPoints && h.metadata.polygonPoints.length > 0)
        )
        .map(convertToMapHabitat)
        .filter(Boolean); // Entferne null-Werte
      
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
    setShowLocationInfo(true); // Informationsanzeige aktivieren
  }, []);
  
  // Weitere memoized Callbacks
  const handlePolygonChange = useCallback((newPoints: Array<[number, number]>) => {
    setPolygonPoints(newPoints);
    
    // In den Metadaten speichern
    setMetadata(prevMetadata => ({
      ...prevMetadata,
      polygonPoints: newPoints
    }));
  }, [setMetadata]);
  
  const handleAreaChange = useCallback((newArea: number) => {
    // Zusätzliche Validierung
    if (newArea <= 0) {
      return;
    }
    
    // Nur den lokalen State aktualisieren, NICHT die Metadaten
    // Die Metadaten werden erst beim Speichern aktualisiert
    setAreaInSqMeters(newArea);
  }, []);
  
  const handleCenterChange = useCallback((newCenter: [number, number]) => {
    // Nur für Drag-Events, keine Auswirkung auf die gespeicherte Position
  }, []);
  
  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);
  
  const handleMapClick = useCallback(() => {
    if (selectedHabitatId) {
      setSelectedHabitatId(null);
      // Nur die Habitat-Auswahl zurücksetzen, aber Standortinfos weiterhin anzeigen wenn vorhanden
    }
  }, [selectedHabitatId]);

  // Kontinuierliche GPS-Verfolgung - der wichtigste Effekt
  useEffect(() => {
    // Nur aktivieren im Browser
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setIsLoadingGPS(false); // GPS nicht verfügbar, Ladezustand beenden
      return;
    }
    
    console.log('Starte kontinuierliche GPS-Verfolgung');

    // Status-Badge nach 15 Sekunden automatisch ausblenden
    const hideStatusTimeout = setTimeout(() => {
      console.log('GPS-Verfolgung beendet');
      setShowGpsStatus(false);
    }, 15000);
    
    // Starte die kontinuierliche GPS-Verfolgung
    watchPositionIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const now = Date.now();
        
        // Sofort GPS-Status aktualisieren mit jedem Signal
        setGpsStats(prev => ({
          accuracy,
          messagesCount: prev.messagesCount + 1,
          lastUpdate: now
        }));
        
        // Ladezustand beenden, sobald valide Koordinaten empfangen wurden
        if (isLoadingGPS && latitude !== 0 && longitude !== 0) {
          setIsLoadingGPS(false);
        }
        
        // Throttling: Updates nur einmal pro Sekunde verarbeiten
        if (now - lastUpdateTimeRef.current < 1000) {
          return; // Zu schnelles Update ignorieren
        }
        
        // Aktuellen Zeitpunkt speichern
        lastUpdateTimeRef.current = now;
        
        // Neue Position zu den letzten Positionen hinzufügen
        setRecentPositions(prev => {
          // Nur die letzten 30 Positionen behalten (30 Sekunden bei 1s Intervall)
          const updatedPositions = [...prev, { 
            position: [latitude, longitude] as [number, number], 
            accuracy, 
            timestamp: now 
          }];
          
          // Auf 30 Einträge begrenzen
          if (updatedPositions.length > 30) {
            return updatedPositions.slice(updatedPositions.length - 30);
          }
          return updatedPositions;
        });
        
        // WICHTIG: Bei der ersten Messung schon den unfiltered Marker setzen,
        // damit Benutzer sofortiges Feedback bekommt
        if (currentPosition[0] === 0 && currentPosition[1] === 0) {
          setCurrentPosition([latitude, longitude]);
        } else {
          // Gefilterte Position berechnen
          const filteredPosition = calculateFilteredPosition(
            [...recentPositions, { position: [latitude, longitude], accuracy, timestamp: now }]
          );
          
          // Aktuelle Position aktualisieren
          if (filteredPosition) {
            setCurrentPosition(filteredPosition);
          }
        }
      },
      (error) => {
        console.error("Fehler bei GPS-Verfolgung:", error);
        setIsLoadingGPS(false); // Fehler bei GPS, Ladezustand beenden
        
        // Bei Fehler auch den Statustext anpassen
        setGpsStats(prev => ({
          ...prev,
          accuracy: -1 // Negativer Wert bedeutet Fehler
        }));
      },
      { 
        enableHighAccuracy: true,  // GPS-Genauigkeit erzwingen (wichtig für Naturaufnahme)
        timeout: 15000,            // 15 Sekunden Timeout - lieber länger warten als ungenau sein
        maximumAge: 0              // Niemals Cache verwenden, immer neue Koordinaten abrufen
      }
    );
    
    // Nach 5 Sekunden GPS-Ladescreen auf jeden Fall ausblenden (Timeout-Sicherung)
    const timeoutId = setTimeout(() => {
      setIsLoadingGPS(false);
    }, 8000);
    
    // Cleanup
    return () => {
      if (watchPositionIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current);
        watchPositionIdRef.current = null;
      }
      clearTimeout(timeoutId);
      clearTimeout(hideStatusTimeout);
    };
  }, []); // Keine Abhängigkeiten - nur einmal starten und im Hintergrund laufen lassen

  // Effekt zum Aktualisieren des Markers und einmaliger Zentrierung
  useEffect(() => {
    if (!mapRef.current || currentPosition[0] === 0 || currentPosition[1] === 0) {
      return; // Noch keine gültige Position
    }
    
    // 1. Marker auf aktuelle Position setzen (immer)
    mapRef.current.updatePositionMarker(currentPosition[0], currentPosition[1]);
    console.log("Positionsmarker aktualisiert:", currentPosition);
    
    // 2. Einmalige Zentrierung und Zoom (nur beim ersten gültigen GPS-Update)
    if (!hasZoomedToGPS && mapInitializedRef.current) {
      console.log("Einmalige Zentrierung auf GPS-Position:", currentPosition);
      
      // Zentrierung mit hohem Zoom-Level
      mapRef.current.centerMap(currentPosition[0], currentPosition[1], 18);
      
      // Flag setzen, damit dies nur einmal geschieht
      setHasZoomedToGPS(true);
    }
  }, [currentPosition, hasZoomedToGPS]);

  // Vereinfachte Map-Initialisierung - wird nur einmal ausgeführt
  useEffect(() => {
    // Nur einmal ausführen
    if (mapInitializedRef.current) {
      return;
    }
    
    // Karte wird mit niedrigem Zoom-Level initialisiert
    const initialZoom = 13; // Niedriger Zoom-Level zu Beginn
    setZoom(initialZoom);
    
    // Map als initialisiert markieren
    mapInitializedRef.current = true;
    
    console.log('Karte initialisiert mit niedrigem Zoom-Level');
  }, []); // Leere Abhängigkeiten - nur einmal ausführen

  // Funktion zum Zentrieren auf die aktuelle GPS-Position (nur bei Button-Klick)
  const centerToCurrentGPS = useCallback(() => {
    if (navigator.geolocation && mapRef.current && currentPosition[0] !== 0 && currentPosition[1] !== 0) {
      // Auf aktuelle Position zentrieren mit hohem Zoom-Level
      mapRef.current.centerMap(currentPosition[0], currentPosition[1], 18);
      
      // Optionaler Statushinweis
      const statusElement = document.createElement('div');
      statusElement.textContent = 'GPS-Position wird verwendet...';
      statusElement.style.position = 'absolute';
      statusElement.style.top = '50%';
      statusElement.style.left = '50%';
      statusElement.style.transform = 'translate(-50%, -50%)';
      statusElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
      statusElement.style.color = 'white';
      statusElement.style.padding = '8px 12px';
      statusElement.style.borderRadius = '4px';
      statusElement.style.zIndex = '10000';
      
      // Füge das Element zum DOM hinzu
      if (mapContainerRef?.current) {
        mapContainerRef.current.appendChild(statusElement);
      }
      
      // Nach 1 Sekunde ausblenden
      setTimeout(() => {
        if (statusElement.parentNode) {
          statusElement.parentNode.removeChild(statusElement);
        }
      }, 1000);
    }
  }, [currentPosition]);

  // Funktion zum Berechnen der gefilterten Position
  const calculateFilteredPosition = (positions: Array<{
    position: [number, number], 
    accuracy: number,
    timestamp: number
  }>): [number, number] | null => {
    // Mindestens 5 Positionen benötigen für sinnvolle Filterung
    if (positions.length < 5) {
      if (positions.length === 0) return null;
      const lastPos = positions[positions.length - 1];
      return lastPos ? lastPos.position : null;
    }
    
    try {
      // Sortiere Positionen nach Aktualität (neueste zuerst)
      const sortedByTime = [...positions].sort((a, b) => b.timestamp - a.timestamp);
      
      // Nur die letzten 20 Sekunden berücksichtigen
      const threshold = Date.now() - 20000;
      const recentEnough = sortedByTime.filter(p => p.timestamp > threshold);
      
      // Wenn zu wenige aktuelle Messungen, normale Position verwenden
      if (recentEnough.length < 5 && sortedByTime.length > 0) {
        const firstItem = sortedByTime[0];
        return firstItem ? firstItem.position : null;
      }
      
      // Sortiere nach Genauigkeit (beste zuerst)
      const sortedByAccuracy = [...recentEnough].sort((a, b) => a.accuracy - b.accuracy);
      
      // Verwende die besten 66% der Messungen (sortierte Top-Genauigkeiten)
      const goodPositions = sortedByAccuracy.slice(0, Math.ceil(sortedByAccuracy.length * 0.66));
      
      // Mittelwert der guten Positionen berechnen
      const sum = goodPositions.reduce(
        (acc, p) => [acc[0] + p.position[0], acc[1] + p.position[1]] as [number, number], 
        [0, 0] as [number, number]
      );
      
      return [
        sum[0] / goodPositions.length,
        sum[1] / goodPositions.length
      ];
    } catch (error) {
      console.error("Fehler bei der Berechnung der gefilterten Position:", error);
      if (positions.length === 0) return null;
      const lastPos = positions[positions.length - 1];
      return lastPos ? lastPos.position : null;
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
    
    // Standortinformationen im 'none'-Modus immer anzeigen
    if (newMode === 'none') {
      setShowLocationInfo(true);
    }
    
    // Habitat-Auswahl zurücksetzen beim Moduswechsel
    if (selectedHabitatId) {
      setSelectedHabitatId(null);
    }
    
    // Dialog für Polygon-Modus anzeigen, nur wenn "Nicht mehr anzeigen" nicht aktiviert ist
    if (newMode === 'polygon' && !dontShowPolygonAgain) {
      setShowPolygonPopup(true);
    }
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
      
      // Lokaler State für Polygon-Punkte aktualisieren
      setPolygonPoints(currentPoints);
      // HINWEIS: currentPosition (GPS-Standort des Nutzers) wird hier NICHT überschrieben
      // Habitat-Position (centerLat/centerLng) und GPS-Position des Nutzers sind bewusst getrennt,
      // damit der Nutzer sich im Gelände frei bewegen kann, während das Habitat an seinem Ort bleibt
      
      // Standortinformationen für das Habitat abrufen (nicht für den Nutzerstandort)
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
  
  // Referenz für den Map-Container
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Beim ersten Rendern den Container-Ref setzen
  useEffect(() => {
    // Prüfen, ob wir im Browser sind
    if (typeof document !== 'undefined') {
      // Container-Element per Selektor finden
      const containerElement = document.querySelector('.leaflet-container') as HTMLDivElement;
      if (containerElement) {
        mapContainerRef.current = containerElement;
      }
    }
  }, []);

  // Funktion zum manuellen Ein-/Ausblenden des GPS-Status-Badges
  const toggleGpsStatus = useCallback(() => {
    console.log('GPS-Status-Badge angeklickt');
    setShowGpsStatus(prev => !prev);
    // Debugging-Information in der Konsole ausgeben
    console.log('Neuer Status showGpsStatus:', !showGpsStatus);
  }, [showGpsStatus]);

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Map-Container mit relativer Positionierung für überlagerte UI-Elemente */}
      <div className="relative w-full flex-grow">
        <MapNoSSR
          ref={mapRef}
          position={initialMapPosition}
          zoom={zoom}
          onCenterChange={handleCenterChange}
          onZoomChange={handleZoomChange}
          onPolygonChange={handlePolygonChange}
          onAreaChange={handleAreaChange}
          editMode={mapMode === 'polygon'}
          initialPolygon={polygonPoints}
          hasPolygon={Boolean(polygonPoints && polygonPoints.length > 0)}
          showZoomControls={mapMode !== 'polygon'}
          showPositionMarker={true}
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
        
        {/* Verbesserter GPS-Ladehinweis (in der Mitte des Bildschirms mit höherem z-index) */}
        {isLoadingGPS && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-700 text-white py-3 px-6 rounded-lg shadow-xl text-base font-medium flex items-center gap-3 z-[9999]">
            <div className="w-4 h-4 bg-white rounded-full animate-ping"></div>
            GPS-Position wird ermittelt...
          </div>
        )}

        {/* GPS Status-Anzeige (permanent oder durch Klick auf GPS-Icon aufrufbar) */}
        {showGpsStatus && (
          <div 
            className="absolute bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-2 text-xs"
            onClick={toggleGpsStatus}
            style={{
              zIndex: 20000, // Höherer z-index als alle anderen Elemente
              position: 'absolute', // Wieder auf absolute setzen für korrekte Positionierung
              left: '55px', // Neben dem GPS-Button (10px + Buttonbreite + Abstand)
              top: '75px'   // Gleiche Höhe wie der GPS-Button
            }}
          >
            <div className="font-semibold mb-1 flex items-center justify-between">
              <span>GPS-Status</span>
              <button className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Messungen:</span>
                <span className="font-medium">{gpsStats.messagesCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Aktuelle Position:</span>
                <span className="font-medium">{currentPosition[0] !== 0 ? 'Verfügbar' : 'Wird ermittelt...'}</span>
              </div>
              <div className="flex justify-between">
                <span>Genauigkeit:</span>
                <span className={`font-medium ${gpsStats.accuracy && gpsStats.accuracy > 0 && gpsStats.accuracy < 10 ? 'text-green-600' : 
                  (gpsStats.accuracy && gpsStats.accuracy < 20 ? 'text-amber-600' : 'text-red-600')}`}>
                  {gpsStats.accuracy === null ? 'Unbekannt' : 
                   gpsStats.accuracy < 0 ? 'Fehler!' : 
                   `${Math.round(gpsStats.accuracy)}m`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Letzte Aktualisierung:</span>
                <span className="font-medium">
                  {gpsStats.lastUpdate > 0 ? 
                   `${Math.round((Date.now() - gpsStats.lastUpdate) / 1000)}s` : 
                   'Keine'}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Fehleranzeige, falls Habitate nicht geladen werden konnten */}
        {habitatLoadError && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-red-50 py-1 px-3 rounded shadow-md text-sm text-red-500">
            {habitatLoadError}
          </div>
        )}
        
        {/* Standortinformationen/Habitat-Info (unten rechts) */}
        {showLocationInfo && (
          <div className="absolute bottom-11 right-3 z-[10000] bg-gray-800/30 backdrop-blur-sm rounded-lg shadow-lg p-3 max-w-[70vw]">
            <div className="flex justify-between items-start">
              <h3 className="text-[12px] font-semibold mb-1 text-white">
                {selectedHabitatId ? "Bestehendes Habitat" : "Standortinformationen"}
              </h3>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 -mr-1 -mt-1 text-white/70 hover:text-white hover:bg-transparent"
                onClick={() => {
                  if (selectedHabitatId) {
                    setSelectedHabitatId(null);
                  } 
                  setShowLocationInfo(false);
                }}
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

            {selectedHabitatId ? (
              // Anzeige der Habitat-Details
              (() => {
                const habitat = existingHabitats.find(h => h.id === selectedHabitatId);
                if (!habitat) return (
                  <div className="flex items-center justify-center py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
                    <span className="ml-2 text-[12px] text-white">Habitat-Details werden geladen...</span>
                  </div>
                );
                
                return (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12px] text-white">
                    <div className="text-gray-200">Name:</div>
                    <div className="font-medium">{habitat.name}</div>
                    
                    {habitat.metadata?.gemeinde && (
                      <>
                        <div className="text-gray-200">Gemeinde:</div>
                        <div className="font-medium">{habitat.metadata.gemeinde}</div>
                      </>
                    )}
                    
                    {habitat.metadata?.erfasser && (
                      <>
                        <div className="text-gray-200">Erfasser:</div>
                        <div className="font-medium">{habitat.metadata.erfasser}</div>
                      </>
                    )}
                    
                    <div className="text-gray-200">Status:</div>
                    <div className="font-medium flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full mr-1 ${habitat.metadata?.verifiziert ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                      {habitat.metadata?.verifiziert ? 'Verifiziert' : 'Nicht verifiziert'}
                    </div>
                    
                    {/* Standortdaten, wenn verfügbar */}
                    <div className="col-span-2 mt-2 border-t border-gray-600 pt-1">
                      <div className="font-semibold mb-1">Standortdaten</div>
                    </div>
                    
                    {/* Anzeige von Höhe, falls vorhanden */}
                    <div className="text-gray-200">Höhe:</div>
                    <div className="font-medium">
                      {habitat.position ? `~${Math.round(habitat.position[0])} m` : '-'}
                    </div>
                    
                    {/* Falls ein Polygon existiert, Flächenberechnung anzeigen */}
                    {habitat.polygon && habitat.polygon.length > 0 && (
                      <>
                        <div className="text-gray-200">Fläche:</div>
                        <div className="font-medium">
                          {/* Schätzung der Fläche basierend auf Polygon-Punkten */}
                          {calculateAreaFromPoints(habitat.polygon).toLocaleString('de-DE')} m²
                        </div>
                      </>
                    )}
                    
                    {/* Falls ein Polygon existiert, Visualisierung anzeigen */}
                    {habitat.polygon && habitat.polygon.length > 0 && (
                      <div className="col-span-2 text-xs text-gray-300 mt-1">
                        <span className="inline-block w-2 h-2 rounded-full mr-1" style={{backgroundColor: habitat.color}}></span>
                        Das Habitat ist auf der Karte eingezeichnet
                      </div>
                    )}
                    
                    <div className="col-span-2 mt-2 text-red-300 italic">
                      Achtung: Dieses Habitat wurde bereits erfasst. Bitte vermeiden Sie Doppelerfassungen.
                    </div>
                    
                    {/* Verifizieren-Button für Experten */}
                    {isExpert && selectedHabitatId && (
                      <div className="col-span-2 mt-3 flex justify-left gap-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 text-white bg-transparent border-white/40 hover:bg-white/10 hover:text-white"
                          onClick={() => {
                            // Navigation zum Bearbeitungs-Modus mit editJobId
                            const params = new URLSearchParams({
                              editJobId: selectedHabitatId,
                              activeStep: 'location' // Zum Standort-Modul wechseln
                            });
                            
                            router.push(`/naturescout?${params.toString()}`);
                          }}
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            className="w-3 h-3 mr-1"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Bearbeiten
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : isLoadingGeodata ? (
              // Ladeanzeige für Geodaten
              <div className="flex items-center justify-center py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
                <span className="ml-2 text-[12px] text-white">Daten werden geladen...</span>
              </div>
            ) : (
              // Standortinformationen
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12px] text-white">
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
        
        {/* UI-Overlay: Modus-Buttons (unten links) mit Aktions-Buttons */}
        <div className="absolute bottom-0 left-0 right-0 z-[9999] bg-white/20 backdrop-blur-sm p-1 shadow-lg">
          <div className="text-sm font-medium mb-0 px-3">Modus</div>
          <div className="flex items-center justify-between px-3 p-2">
            <div className="flex items-center">
              <ToggleGroup type="single" value={mapMode === 'none' ? undefined : mapMode} className="bg-muted/30 p-1 rounded-md">
                <ToggleGroupItem 
                  value="navigation"
                  onClick={() => toggleMapMode('navigation')}
                  size="icon"
                  className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:bg-secondary data-[state=off]:text-secondary-foreground hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  aria-label="Navigation"
                >
                  <MoveIcon className="h-4 w-4" />
                </ToggleGroupItem>
                
                <ToggleGroupItem 
                  value="polygon"
                  onClick={() => toggleMapMode('polygon')}
                  size="icon"
                  className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:bg-secondary data-[state=off]:text-secondary-foreground hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  aria-label="Polygon"
                >
                  <CircleDashed className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Speichern und Neu als normale Buttons auf der gleichen Höhe */}
              {mapMode === 'polygon' && (
                <>
                  <div className="mx-2" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={savePolygon}
                    disabled={isSavingPolygon}
                    className="h-8 text-xs"
                  >
                    {isSavingPolygon ? 'Speichern...' : 'Speichern'}
                  </Button>
                  
                  <div className="ml-1" />
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={restartPolygon}
                    disabled={isSavingPolygon}
                    className="h-8 text-xs"
                  >
                    Neu
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* UI-Overlay: Aktions-Buttons (oben links) */}
        {mapMode !== 'polygon' && (
        <div className="absolute z-[9999] flex flex-row gap-2 items-center" style={{left: 10, top: 75}}>
            <Button 
              variant="secondary" 
              size="icon" 
              onClick={centerToCurrentGPS} 
              className="h-7 w-7 shadow-lg bg-blue-600 hover:bg-blue-700"
              title="Auf aktuelle GPS-Position zentrieren"
            >
              <LocateFixed className="h-4 w-4 text-white" />
            </Button>
            
            {/* Neuer Button zum Anzeigen des GPS-Status */}
            {!showGpsStatus && (
              <Button 
                variant="secondary" 
                size="icon" 
                onClick={toggleGpsStatus} 
                className="h-7 w-7 shadow-lg bg-gray-600 hover:bg-gray-700"
                title="GPS-Status anzeigen"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </Button>
            )}
          </div>
        )}
        {/* Entferne alte Buttons für Speichern/Neu (wurden nach oben verschoben) */}
        {!showLocationInfo && (
          <></>
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
