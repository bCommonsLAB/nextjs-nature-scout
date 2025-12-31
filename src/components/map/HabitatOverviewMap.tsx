"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Dynamisch laden der Map-Komponente ohne SSR
const MapNoSSR = dynamic(() => import('./MapNoSSR'), {
  ssr: false,
  loading: () => <div className="flex justify-center items-center h-96">Karte wird geladen...</div>
});

// Typdefinition für Habitat-Daten aus der API
interface HabitatFromAPI {
  jobId: string;
  metadata: {
    latitude: number;
    longitude: number;
    erfassungsperson?: string;
    gemeinde?: string;
    flurname?: string;
    polygonPoints?: [number, number][];
    elevation?: string | number;
    [key: string]: unknown;
  };
  result?: {
    habitattyp?: string;
    habitatfamilie?: string;
    schutzstatus?: string;
  };
  verifiedResult?: {
    habitattyp?: string;
    habitatfamilie?: string;
    schutzstatus?: string;
  };
  verified?: boolean;
  protectionStatus?: 'red' | 'yellow' | 'green';
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
    flurname?: string;
    erfasser?: string;
    verifiziert?: boolean;
    elevation?: string | number;
    schutzstatus?: string;
  };
}

// Konvertierung von API-Habitat zu internem Habitat-Format
// Diese Funktion ist identisch mit der in LocationDetermination.tsx
function convertToMapHabitat(apiHabitat: HabitatFromAPI): MapHabitat | null {
  // Sicherstellen, dass wir gültige Koordinaten haben
  if ((!apiHabitat.metadata?.latitude || !apiHabitat.metadata?.longitude) && 
      (!apiHabitat.metadata?.polygonPoints || !Array.isArray(apiHabitat.metadata.polygonPoints) || apiHabitat.metadata.polygonPoints.length === 0)) {
    return null;
  }

  // Priorität verwenden: verifizierte Daten, dann normale Ergebnisse
  const habitatName = apiHabitat.verifiedResult?.habitattyp || apiHabitat.result?.habitattyp || 'Habitat';
  const habitatFamily = apiHabitat.verifiedResult?.habitatfamilie || apiHabitat.result?.habitatfamilie;

  // Standardposition aus Lat/Lng
  let position: [number, number] | undefined = undefined;
  const lat = Number(apiHabitat.metadata.latitude);
  const lng = Number(apiHabitat.metadata.longitude);
  
  // Nur setzen, wenn beide Werte gültig sind
  if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && 
      Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    position = [lat, lng];
  }
  
  // Polygon als undefined initialisieren
  let polygon: [number, number][] | undefined = undefined;

  // Prüfen, ob wir gültige Polygondaten haben
  if (apiHabitat.metadata.polygonPoints && 
      Array.isArray(apiHabitat.metadata.polygonPoints) && 
      apiHabitat.metadata.polygonPoints.length >= 3) {
    
    try {
      const points: [number, number][] = [];
      
      for (let i = 0; i < apiHabitat.metadata.polygonPoints.length; i++) {
        const point = apiHabitat.metadata.polygonPoints[i];
        
        let lat: number | null = null;
        let lng: number | null = null;
        
        // Fall 1: Punkt ist ein Array
        if (Array.isArray(point) && point.length >= 2) {
          lat = Number(point[0]);
          lng = Number(point[1]);
        } 
        // Fall 2: Versuche, es als ein Objekt zu behandeln
        else if (point && typeof point === 'object') {
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
          if (Math.abs(lat) > 90) {
            points.push([lng, lat] as [number, number]);
          } else {
            points.push([lat, lng] as [number, number]);
          }
        }
      }
      
      // Nur fortfahren, wenn wir genug gültige Punkte haben
      if (points.length >= 3) {
        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];
        
        const isPolygonClosed = 
          points.length >= 2 && 
          firstPoint && lastPoint &&
          firstPoint[0] === lastPoint[0] && 
          firstPoint[1] === lastPoint[1];
        
        // Polygon schließen, wenn nötig
        if (!isPolygonClosed && points.length >= 3 && firstPoint) {
          points.push([firstPoint[0], firstPoint[1]]);
        }
        
        polygon = points;
      }
    } catch (error) {
      console.error(`Fehler bei der Verarbeitung des Polygons für Habitat ${apiHabitat.jobId}:`, error);
    }
  }

  // Verwende protectionStatus direkt - kein Fallback mehr
  // WICHTIG: Wenn protectionStatus nicht gesetzt ist, wird das Habitat nicht gefiltert
  const protectionStatus: 'red' | 'yellow' | 'green' | undefined = apiHabitat.protectionStatus;
  
  let color = '#22c55e'; // Grün für niederwertige Flächen (Standard)
  let transparenz = 0.5;
  
  // Farbe basierend auf protectionStatus bestimmen
  if (protectionStatus === 'red') {
    color = '#ef4444'; // Rot für geschützte Flächen
  } else if (protectionStatus === 'yellow') {
    color = '#eab308'; // Gelb für hochwertige Flächen
  } else if (protectionStatus === 'green') {
    color = '#22c55e'; // Grün für niederwertige Flächen
  }
  
  if (apiHabitat.verified) {
    transparenz = 0.9;
  }
  
  // Schutzstatus für Metadaten (für Anzeige)
  const schutzstatus = apiHabitat.verifiedResult?.schutzstatus || apiHabitat.result?.schutzstatus;  

  // Position muss vorhanden sein ODER Polygon muss vorhanden sein
  if (!position && !polygon) {
    return null;
  }

  return {
    id: apiHabitat.jobId,
    name: habitatName + (apiHabitat.metadata.flurname ? ` (${apiHabitat.metadata.flurname})` : ''),
    position: position || (polygon && polygon.length > 0 ? polygon[0] : undefined),
    polygon,
    color,
    transparenz,
    metadata: {
      gemeinde: apiHabitat.metadata.gemeinde,
      flurname: apiHabitat.metadata.flurname,
      erfasser: apiHabitat.metadata.erfassungsperson,
      verifiziert: apiHabitat.verified,
      elevation: apiHabitat.metadata.elevation,
      schutzstatus: schutzstatus
    }
  };
}

interface HabitatOverviewMapProps {
  /** Höhe der Karte in CSS-Einheiten (z.B. '600px', '50vh') */
  height?: string;
  /** Zusätzliche CSS-Klassen */
  className?: string;
  /** Optionale Filter-Parameter für die Habitat-Suche */
  filters?: {
    search?: string;
    gemeinde?: string[];
    habitat?: string[];
    habitatfamilie?: string[];
    protectionStatus?: string[]; // Verwende protectionStatus statt schutzstatus
    person?: string[];
    organization?: string[];
    verifizierungsstatus?: string;
  };
}

/**
 * Leichtgewichtige Kartenkomponente für die Übersicht aller Habitate
 * Zeigt alle Habitate auf Zoom Level 9 an (Übersichtsansicht)
 * Keine Polygon-Zeichnung, nur Anzeige
 * Unterstützt optionale Filter-Parameter für gefilterte Anzeige
 */
export function HabitatOverviewMap({ height = '600px', className = '', filters }: HabitatOverviewMapProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = !!session?.user;
  
  // Zustände für Habitat-Daten
  const [habitats, setHabitats] = useState<MapHabitat[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHabitatId, setSelectedHabitatId] = useState<string | null>(null);
  
  // Zoom-Level State für dynamischen Display-Mode
  const [currentZoom, setCurrentZoom] = useState<number>(9);
  
  // Zentrale Position für Südtirol (Zoom Level 9 für Übersicht)
  const initialPosition: [number, number] = useMemo(() => [46.724212, 11.65555], []);
  const initialZoom = 9;
  
  // Display-Mode basierend auf Zoom-Level: ab Zoom 13 Polygone anzeigen
  const displayMode = useMemo(() => {
    return currentZoom <= 13 ? 'markers' : 'polygons';
  }, [currentZoom]);
  
  // Handler für Zoom-Änderungen
  const handleZoomChange = useCallback((newZoom: number) => {
    setCurrentZoom(newZoom);
  }, []);
  
  // Handler für Klicks auf Habitate
  // WICHTIG: Navigation zur Detailseite nur für eingeloggte Benutzer
  const handleHabitatClick = useCallback((habitatId: string) => {
    setSelectedHabitatId(habitatId);
    
    // Nur navigieren, wenn der Benutzer eingeloggt ist
    if (isAuthenticated) {
      router.push(`/habitat/${habitatId}`);
    }
    // Wenn nicht eingeloggt, wird nur das Tooltip angezeigt (keine Navigation)
  }, [router, isAuthenticated]);
  
  // Handler für Klicks auf die Karte (außerhalb von Habitaten)
  const handleMapClick = useCallback(() => {
    setSelectedHabitatId(null);
  }, []);
  
  // Serialisiere Filter für Dependency-Vergleich
  const filtersKey = useMemo(() => {
    if (!filters) return 'no-filters';
    return JSON.stringify({
      search: filters.search || '',
      gemeinde: filters.gemeinde?.join(',') || '',
      habitat: filters.habitat?.join(',') || '',
      habitatfamilie: filters.habitatfamilie?.join(',') || '',
      protectionStatus: filters.protectionStatus?.join(',') || '',
      person: filters.person?.join(',') || '',
      organization: filters.organization?.join(',') || '',
      verifizierungsstatus: filters.verifizierungsstatus || 'alle'
    });
  }, [filters]);
  
  // Alle Habitate beim ersten Laden abrufen (mit optionalen Filtern)
  useEffect(() => {
    const loadAllHabitats = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Query-Parameter zusammenstellen
        const queryParams = new URLSearchParams({
          limit: '500',
          view: 'map'
        });
        
        // Filter-Parameter hinzufügen, falls vorhanden
        if (filters) {
          if (filters.search) queryParams.set('search', filters.search);
          if (filters.gemeinde && filters.gemeinde.length > 0) {
            queryParams.set('gemeinde', filters.gemeinde.join(','));
          }
          if (filters.habitat && filters.habitat.length > 0) {
            queryParams.set('habitat', filters.habitat.join(','));
          }
          if (filters.habitatfamilie && filters.habitatfamilie.length > 0) {
            queryParams.set('habitatfamilie', filters.habitatfamilie.join(','));
          }
          if (filters.protectionStatus && filters.protectionStatus.length > 0) {
            queryParams.set('protectionStatus', filters.protectionStatus.join(','));
          }
          if (filters.person && filters.person.length > 0) {
            queryParams.set('person', filters.person.join(','));
          }
          if (filters.organization && filters.organization.length > 0) {
            queryParams.set('organization', filters.organization.join(','));
          }
          if (filters.verifizierungsstatus) {
            queryParams.set('verifizierungsstatus', filters.verifizierungsstatus);
          } else {
            // Standard: alle Habitate anzeigen (auch nicht-verifizierte)
            queryParams.set('verifizierungsstatus', 'alle');
          }
        } else {
          // Keine Filter: alle Habitate anzeigen
          queryParams.set('verifizierungsstatus', 'alle');
        }
        
        const url = `/api/habitat/public?${queryParams.toString()}`;
        
        // Debug: Logge die URL um zu sehen, welche Filter gesendet werden
        console.log('HabitatOverviewMap - Lade Habitate mit URL:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`API-Fehler: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Konvertiere API-Daten in das Format für die Karte
        const validHabitats = data.entries
          .map(convertToMapHabitat)
          .filter(Boolean); // Entferne null-Werte
        
        setHabitats(validHabitats);
      } catch (err) {
        console.error('Fehler beim Laden der Habitate:', err);
        setError('Habitate konnten nicht geladen werden');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAllHabitats();
  }, [filtersKey, filters]);
  
  return (
    <div className={`w-full relative ${className}`} style={{ height }}>
      {/* Karten-Container */}
      <div className="w-full h-full relative">
        <MapNoSSR
          position={initialPosition}
          zoom={initialZoom}
          onCenterChange={() => {}} // Keine Aktion bei Positionsänderung nötig
          onZoomChange={handleZoomChange} // Zoom-Level verfolgen für Display-Mode
          editMode={false} // Kein Bearbeitungsmodus
          hasPolygon={false} // Kein Polygon-Zeichnen
          showZoomControls={true} // Zoom-Controls anzeigen
          showPositionMarker={false} // Kein GPS-Positionsmarker
          habitats={habitats}
          displayMode={displayMode} // Dynamisch: Marker bis Zoom 13, dann Polygone
          onHabitatClick={handleHabitatClick}
          onClick={handleMapClick}
        />
        
        {/* Ladeanzeige */}
        {isLoading && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-white/90 py-2 px-4 rounded shadow-md text-sm z-[1000]">
            Lade Habitate...
          </div>
        )}
        
        {/* Fehleranzeige */}
        {error && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-red-50 py-2 px-4 rounded shadow-md text-sm text-red-600 z-[1000]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

