"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const MapNoSSR = dynamic(() => import('./mapNoSSR'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100" />
});

// Typdefinition für die Habitat-Daten aus der API
interface HabitatFromAPI {
  jobId: string;
  metadata: {
    latitude: number;
    longitude: number;
    erfassungsperson?: string;
    gemeinde?: string;
    flurname?: string;
    standort?: [number, number][];
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

// Konvertierung von API-Habitat zu internem Habitat-Format
function convertToMapHabitat(apiHabitat: HabitatFromAPI) {
  // Priorität verwenden: verifizierte Daten, dann normale Ergebnisse
  const habitatName = apiHabitat.verifiedResult?.habitattyp || apiHabitat.result?.habitattyp || 'Unbekanntes Habitat';
  const habitatFamily = apiHabitat.verifiedResult?.habitatfamilie || apiHabitat.result?.habitatfamilie;

  // Position aus Standort oder Lat/Long extrahieren
  let position: [number, number];
  let polygon: [number, number][] | undefined;

  // Wenn Standort (Polygon) vorhanden ist, verwenden wir den ersten Punkt als Position
  if (apiHabitat.metadata.standort && 
      Array.isArray(apiHabitat.metadata.standort) && 
      apiHabitat.metadata.standort.length > 0 && 
      Array.isArray(apiHabitat.metadata.standort[0]) && 
      apiHabitat.metadata.standort[0].length === 2) {
    // Explizite Konvertierung zum richtigen Typ
    position = [
      Number(apiHabitat.metadata.standort[0][0]), 
      Number(apiHabitat.metadata.standort[0][1])
    ];
    // Stellen sicher, dass alle Punkte im Polygon gültig sind
    polygon = apiHabitat.metadata.standort.map(point => 
      [Number(point[0]), Number(point[1])] as [number, number]
    );
  } else {
    // Sonst verwenden wir latitude/longitude
    position = [
      Number(apiHabitat.metadata.latitude), 
      Number(apiHabitat.metadata.longitude)
    ];
  }

  // Farbe basierend auf Verifikation und Habitat-Familie
  let color = '#3b82f6'; // Standard: Blau
  if (apiHabitat.verified) {
    // Verifizierte Habitate: Grün
    color = '#22c55e';
  } else if (habitatFamily === 'Wald') {
    // Wald: Dunkelgrün
    color = '#166534';
  } else if (habitatFamily === 'Wiese') {
    // Wiese: Hellgrün
    color = '#4ade80';
  } else if (habitatFamily === 'Gewässer') {
    // Gewässer: Blau
    color = '#0ea5e9';
  }

  return {
    id: apiHabitat.jobId,
    name: habitatName + (apiHabitat.metadata.flurname ? ` (${apiHabitat.metadata.flurname})` : ''),
    position,
    polygon,
    color,
    // Zusätzliche Metadaten für Popup/Details
    metadata: {
      gemeinde: apiHabitat.metadata.gemeinde,
      erfasser: apiHabitat.metadata.erfassungsperson,
      verifiziert: apiHabitat.verified
    }
  };
}

interface MapProps {
  position: [number, number];
  zoom: number;
  onCenterChange: (newCenter: [number, number]) => void;
}

const Map: React.FC<MapProps> = ({ position, zoom, onCenterChange }) => {
  // State für Habitat-Daten und ausgewähltes Habitat
  const [habitats, setHabitats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHabitatId, setSelectedHabitatId] = useState<string | null>(null);
  
  // Habitate vom API-Endpunkt laden
  useEffect(() => {
    const fetchHabitats = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/habitat/public?limit=100&verifizierungsstatus=alle');
        
        if (!response.ok) {
          throw new Error(`API-Fehler: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Habitat-Daten von API geladen:', {
          gesamtAnzahl: data.pagination?.total || 'unbekannt',
          geladeneAnzahl: data.entries?.length || 0
        });
        
        // Konvertiere API-Daten in das Format für die Karte
        const mappedHabitats = data.entries
          .filter((h: HabitatFromAPI) => 
            // Filtere Habitate ohne gültige Geo-Koordinaten
            (h.metadata?.latitude && h.metadata?.longitude) || 
            (h.metadata?.standort && h.metadata.standort.length > 0)
          )
          .map(convertToMapHabitat);
        
        console.log(`${mappedHabitats.length} Habitate für die Kartendarstellung vorbereitet`);
        setHabitats(mappedHabitats);
      } catch (err) {
        console.error('Fehler beim Laden der Habitat-Daten:', err);
        setError('Habitate konnten nicht geladen werden');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHabitats();
  }, []);
  
  // Handler für Klicks auf Habitate
  const handleHabitatClick = (habitatId: string) => {
    console.log(`Habitat ${habitatId} wurde angeklickt`);
    setSelectedHabitatId(habitatId);
    
    // Details zum ausgewählten Habitat loggen
    const habitat = habitats.find(h => h.id === habitatId);
    if (habitat) {
      console.log('Habitat-Details:', habitat);
    }
  };
  
  return (
    <div className="w-full h-full relative">
      <MapNoSSR 
        position={position} 
        zoom={zoom} 
        onCenterChange={onCenterChange}
        habitats={habitats}
        onHabitatClick={handleHabitatClick}
      />
      
      {isLoading && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-white py-1 px-3 rounded shadow-md text-sm">
          Lade Habitate...
        </div>
      )}
      
      {error && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-red-50 py-1 px-3 rounded shadow-md text-sm text-red-500">
          {error}
        </div>
      )}
      
      {/* Info-Panel für ausgewählte Habitate */}
      {selectedHabitatId && (
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded shadow-md text-sm max-w-xs">
          {(() => {
            const habitat = habitats.find(h => h.id === selectedHabitatId);
            if (!habitat) return 'Habitat-Details werden geladen...';
            
            return (
              <div className="space-y-1">
                <h3 className="font-bold text-base">{habitat.name}</h3>
                {habitat.metadata?.gemeinde && (
                  <p>Gemeinde: {habitat.metadata.gemeinde}</p>
                )}
                {habitat.metadata?.erfasser && (
                  <p>Erfasser: {habitat.metadata.erfasser}</p>
                )}
                <p className="flex items-center">
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${habitat.metadata?.verifiziert ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                  {habitat.metadata?.verifiziert ? 'Verifiziert' : 'Nicht verifiziert'}
                </p>
                <p className="text-xs text-gray-500 mt-2">Klicke auf die Karte, um Details auszublenden</p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default Map;

