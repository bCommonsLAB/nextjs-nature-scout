// components/MapNoSSR.tsx
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapNoSSRProps {
  position: L.LatLngExpression;
  zoom: number;
  onCenterChange: (newCenter: [number, number]) => void;
}

// Komponente als benannte Funktion deklarieren
function MapNoSSR({ position, zoom, onCenterChange }: MapNoSSRProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Debug-Logging für Map-Initialisierung
  useEffect(() => {
    if (mapRef.current === null && mapContainerRef.current !== null) {
      mapRef.current = L.map(mapContainerRef.current).setView(position, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);

      // Fadenkreuz-Overlay erstellen
      const crosshairIcon = L.divIcon({
        className: 'leaflet-crosshair', // Benutzerdefinierte Klasse für CSS-Styling
        iconSize: [20, 20], // Größe des Fadenkreuzes
        iconAnchor: [10, 10] // Punkt des Icons, der genau im Zentrum der Karte sein soll
      });

      // Fadenkreuz in der Mitte der Karte platzieren
      const crosshair = L.marker(mapRef.current.getCenter(), { 
        icon: crosshairIcon, 
        interactive: false 
      });
      crosshair.addTo(mapRef.current);

      // Event-Listener hinzufügen, um die Position zu aktualisieren
      const map = mapRef.current;
      map.on('move', () => {
        const newCenter = map.getCenter();
        onCenterChange([newCenter.lat, newCenter.lng]);
        crosshair.setLatLng(newCenter);
      });
    }

    return () => {
      if (mapRef.current !== null) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [position, zoom, onCenterChange]);

  useEffect(() => {
    if (mapRef.current !== null) {
      mapRef.current.setView(position, zoom);
    }
  }, [position, zoom]);

  return <div ref={mapContainerRef} style={{ width: '100%', height: '500px' }} />;
}

export default React.memo(MapNoSSR);
