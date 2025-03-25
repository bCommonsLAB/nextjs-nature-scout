// components/MapNoSSR.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet-draw';

// Typendefinitionen für Leaflet Draw
declare module 'leaflet' {
  namespace Control {
    interface DrawConstructorOptions {
      position?: string;
      draw?: {
        polyline?: boolean | any;
        polygon?: boolean | {
          allowIntersection?: boolean;
          showArea?: boolean;
          drawError?: {
            color?: string;
            message?: string;
          };
          shapeOptions?: {
            color?: string;
            weight?: number;
            dashArray?: string;
          };
        };
        rectangle?: boolean | any;
        circle?: boolean | any;
        marker?: boolean | any;
        circlemarker?: boolean | any;
      };
      edit?: {
        featureGroup: L.FeatureGroup;
        remove?: boolean;
      };
    }

    class Draw extends L.Control {
      constructor(options?: DrawConstructorOptions);
    }
  }

  namespace Draw {
    namespace Event {
      const CREATED: string;
      const EDITED: string;
      const DELETED: string;
    }
  }
}

interface MapNoSSRProps {
  position: L.LatLngExpression;
  zoom: number;
  onCenterChange: (newCenter: [number, number]) => void;
  onPolygonChange?: (polygonPoints: Array<[number, number]>) => void;
  initialPolygon?: Array<[number, number]>;
  editMode?: boolean;
}

// Komponente als benannte Funktion deklarieren
function MapNoSSR({ 
  position, 
  zoom, 
  onCenterChange, 
  onPolygonChange,
  initialPolygon = [],
  editMode = false 
}: MapNoSSRProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const wmsLayerRef = useRef<L.TileLayer.WMS | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

  // Debug-Logging für Map-Initialisierung
  useEffect(() => {
    if (mapRef.current === null && mapContainerRef.current !== null) {
      // Leaflet-Map initialisieren
      mapRef.current = L.map(mapContainerRef.current, {
        maxZoom: 19, // Erlaubt einen sehr hohen Zoom-Level
        minZoom: 3
      }).setView(position, zoom);
      
      // Basis OpenStreetMap Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);

      // Mapbox Satellite Layer für höhere Zoom-Level
      L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA', {
        attribution: '&copy; Mapbox',
        maxZoom: 22
      }).addTo(mapRef.current);

      // Südtiroler WMS-Layer hinzufügen für aktuelle Orthofotos
      try {
        wmsLayerRef.current = L.tileLayer.wms('https://geoservices.buergernetz.bz.it/mapproxy/ows', {
          layers: 'p_bz-Orthoimagery:Aerial-2023-RGB', // Aktuelles Orthofoto
          format: 'image/png',
          transparent: true,
          version: '1.3.0',
          opacity: 0.7, // 60% Deckkraft für Transparenz
          attribution: '&copy; Autonome Provinz Bozen - Südtirol'
        }).addTo(mapRef.current);
      } catch (error) {
        console.error("Fehler beim Laden des WMS-Layers:", error);
      }

      // FeatureGroup für gezeichnete Elemente erstellen
      drawnItemsRef.current = new L.FeatureGroup();
      mapRef.current.addLayer(drawnItemsRef.current);

      // Initialen Polygon hinzufügen, wenn vorhanden
      if (initialPolygon.length > 0) {
        polygonLayerRef.current = L.polygon(initialPolygon, {
          color: '#3388ff',
          weight: 3,
          opacity: 0.8,
          dashArray: '5, 10', // Gestrichelte Linie
          fillOpacity: 0.1
        });
        
        if (drawnItemsRef.current) {
          drawnItemsRef.current.addLayer(polygonLayerRef.current);
        }
      }

      // Zeichenwerkzeuge nur im Bearbeitungsmodus anzeigen
      if (editMode) {
        const drawOptions = {
          position: 'topright',
          draw: {
            polygon: {
              allowIntersection: false,
              showArea: true,
              drawError: {
                color: '#e1e100',
                message: '<strong>Polygone dürfen sich nicht überschneiden!</strong>'
              },
              shapeOptions: {
                color: '#3388ff',
                weight: 3,
                dashArray: '5, 10' // Gestrichelte Linie
              }
            },
            polyline: false,
            circle: false,
            rectangle: false,
            marker: false,
            circlemarker: false
          },
          edit: {
            featureGroup: drawnItemsRef.current,
            remove: true
          }
        };

        // Draw Control hinzufügen
        drawControlRef.current = new L.Control.Draw(drawOptions);
        mapRef.current.addControl(drawControlRef.current);

        // Event-Handler für erfolgreiche Zeichnung
        mapRef.current.on(L.Draw.Event.CREATED, (event: any) => {
          const layer = event.layer;
          
          if (drawnItemsRef.current) {
            // Vorherige Zeichnungen löschen
            drawnItemsRef.current.clearLayers();
            
            // Neue Zeichnung hinzufügen
            drawnItemsRef.current.addLayer(layer);
            polygonLayerRef.current = layer;
            
            // Polygonpunkte extrahieren und an übergeordnete Komponente senden
            if (layer.getLatLngs && layer.getLatLngs()[0]) {
              const latlngs = layer.getLatLngs()[0];
              const points = (Array.isArray(latlngs) ? latlngs : [latlngs]).map(
                (latlng: L.LatLng) => [latlng.lat, latlng.lng] as [number, number]
              );
              
              if (onPolygonChange) {
                onPolygonChange(points);
              }
            }
          }
        });

        // Event-Handler für Bearbeitung
        mapRef.current.on(L.Draw.Event.EDITED, (event: any) => {
          const layers = event.layers;
          
          layers.eachLayer((layer: any) => {
            if (layer.getLatLngs && layer.getLatLngs()[0]) {
              const latlngs = layer.getLatLngs()[0];
              const points = (Array.isArray(latlngs) ? latlngs : [latlngs]).map(
                (latlng: L.LatLng) => [latlng.lat, latlng.lng] as [number, number]
              );
              
              if (onPolygonChange) {
                onPolygonChange(points);
              }
            }
          });
        });

        // Event-Handler für Löschung
        mapRef.current.on(L.Draw.Event.DELETED, () => {
          if (onPolygonChange) {
            onPolygonChange([]);
          }
        });
      }

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

      // Layer Control hinzufügen
      const baseMaps = {
        "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
      };

      // Nur hinzufügen, wenn der Layer erfolgreich erstellt wurde
      if (wmsLayerRef.current) {
        const overlayMaps = {
          "Südtiroler Orthofoto 2023": wmsLayerRef.current
        };
        L.control.layers(baseMaps, overlayMaps).addTo(mapRef.current);
      } else {
        L.control.layers(baseMaps).addTo(mapRef.current);
      }

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
  }, [position, zoom, onCenterChange, editMode, initialPolygon, onPolygonChange]);

  // Aktualisiere den Polygon, wenn sich initialPolygon ändert
  useEffect(() => {
    if (mapRef.current && drawnItemsRef.current && initialPolygon.length > 0) {
      // Vorherige Zeichnungen löschen
      drawnItemsRef.current.clearLayers();
      
      // Neuen Polygon erstellen
      polygonLayerRef.current = L.polygon(initialPolygon, {
        color: '#3388ff',
        weight: 3,
        opacity: 0.8,
        dashArray: '5, 10', // Gestrichelte Linie
        fillOpacity: 0.1
      });
      
      // Polygon zur FeatureGroup hinzufügen
      drawnItemsRef.current.addLayer(polygonLayerRef.current);
    }
  }, [initialPolygon]);

  // Setze die Position und den Zoom-Level
  useEffect(() => {
    if (mapRef.current !== null) {
      mapRef.current.setView(position, zoom);
    }
  }, [position, zoom]);

  return (
    <>
      <div ref={mapContainerRef} className="leaflet-container" style={{ width: '100%', height: '100%', position: 'relative', zIndex: 9999, overflow: 'hidden' }} />
      <style jsx global>{`
        .leaflet-crosshair {
          position: relative;
        }
        .leaflet-crosshair:before, .leaflet-crosshair:after {
          content: '';
          position: absolute;
          background-color: red;
        }
        .leaflet-crosshair:before {
          left: 9px;
          top: 5px;
          height: 10px;
          width: 2px;
        }
        .leaflet-crosshair:after {
          top: 9px;
          left: 5px;
          height: 2px;
          width: 10px;
        }
        
        /* Zeichenwerkzeug-Styles */
        .leaflet-draw-toolbar a {
          background-color: #fff;
          border-radius: 4px;
          color: #333;
        }
        
        .leaflet-draw-toolbar a:hover {
          background-color: #f4f4f4;
        }
      `}</style>
    </>
  );
}

export default React.memo(MapNoSSR);
