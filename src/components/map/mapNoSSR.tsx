// components/MapNoSSR.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet-draw';

// Typendefinitionen für Leaflet Draw
type DrawOptions = {
  position?: string;
  draw?: {
    polyline?: boolean | Record<string, unknown>;
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
    rectangle?: boolean | Record<string, unknown>;
    circle?: boolean | Record<string, unknown>;
    marker?: boolean | Record<string, unknown>;
    circlemarker?: boolean | Record<string, unknown>;
  };
  edit?: {
    featureGroup: L.FeatureGroup;
    remove?: boolean;
  };
};

// Erweitere die Leaflet-Typen
declare module 'leaflet' {
  namespace Control {
    interface DrawConstructorOptions extends DrawOptions {}
    
    class DrawControl extends L.Control {
      constructor(options?: DrawConstructorOptions);
    }

    class LocationSteps extends L.Control {
      constructor(options?: LocationStepsOptions);
    }
  }

  namespace control {
    function locationSteps(options?: LocationStepsOptions): L.Control.LocationSteps;
  }

  namespace Draw {
    namespace Event {
      const CREATED_EVENT: string;
      const EDITED_EVENT: string;
      const DELETED_EVENT: string;
    }
  }
}

interface LocationStepsOptions {
  position?: string;
  drawnItems?: L.FeatureGroup | null;
  onStartDrawing?: () => void;
  onSavePolygon?: () => void;
  onCancelDrawing?: () => void;
  onPolygonChange?: (points: Array<[number, number]>) => void;
  isDrawing?: boolean;
  hasPolygon?: boolean;
  onSavePolygonWithPoints?: (points: Array<[number, number]>) => void;
  onRestartDrawing?: () => void;
}

interface MapNoSSRProps {
  position: L.LatLngExpression;
  zoom: number;
  onCenterChange: (newCenter: [number, number]) => void;
  onZoomChange?: (newZoom: number) => void;
  onPolygonChange?: (polygonPoints: Array<[number, number]>) => void;
  onAreaChange?: (areaInSqMeters: number) => void;
  initialPolygon?: Array<[number, number]>;
  editMode?: boolean;
  onStartDrawing?: () => void;
  onSavePolygon?: () => void;
  onSavePolygonWithPoints?: (points: Array<[number, number]>) => void;
  onRestartDrawing?: () => void;
  onCancelDrawing?: () => void;
}

// Custom Control für die Standortbestimmungs-Buttons
const LocationStepsControl = L.Control.extend({
  options: {
    position: 'bottomleft',
    drawnItems: undefined
  } as LocationStepsOptions,

  initialize: function(options: LocationStepsOptions) {
    L.setOptions(this, options);
  },

  onAdd: function() {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control location-steps-control');
    container.style.padding = '3px 8px';
    container.style.backgroundColor = 'white';
    container.style.boxShadow = '0 1px 5px rgba(0,0,0,0.4)';
    container.style.borderRadius = '4px';
    
    container.classList.add('leaflet-control-layers');
    container.classList.add('location-steps-control');
    container.id = `location-steps-control-${new Date().getTime()}`;
    
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    
    const map = (this as any)._map as L.Map;
    if (map?.scrollWheelZoom) {
      container.addEventListener('mouseenter', () => {
        if (map.scrollWheelZoom) {
          map.scrollWheelZoom.enable();
        }
      });
    }

    const buttonContainer = L.DomUtil.create('div', '', container);
    buttonContainer.style.display = 'flex';
    buttonContainer.style.flexDirection = 'column';
    buttonContainer.style.gap = '4px';

    const options = this.options as LocationStepsOptions;
    if (!options.isDrawing) {
      const startButton = this.createButton(
        'Habitatumriss erfassen',
        true,
        () => {
          options.onStartDrawing?.();
        }
      );
      buttonContainer.appendChild(startButton);
    } else {
      const saveButton = this.createButton(
        'Umrisslinie speichern',
        true,
        () => {
          if (options.drawnItems) {
            options.drawnItems.eachLayer((layer: L.Layer) => {
              if (layer instanceof L.Polygon) {
                const latlngs = layer.getLatLngs()[0];
                if (Array.isArray(latlngs)) {
                  const points = latlngs.map((p: L.LatLng): [number, number] => [p.lat, p.lng]);
                  
                  if (options.onPolygonChange) {
                    options.onPolygonChange(points);
                  }
                  
                  if (options.onSavePolygon) {
                    options.onSavePolygonWithPoints?.(points);
                  }
                }
              }
            });
          }
        }
      );
      buttonContainer.appendChild(saveButton);

      const restartButton = this.createButton(
        'Neu beginnen',
        true,
        () => {
          options.onRestartDrawing?.();
        }
      );
      buttonContainer.appendChild(restartButton);

      const cancelButton = this.createButton(
        'Abbrechen',
        true,
        () => {
          options.onCancelDrawing?.();
        }
      );
      buttonContainer.appendChild(cancelButton);
    }

    return container;
  },

  createButton: function(text: string, isEnabled: boolean, onClick: () => void) {
    const button = L.DomUtil.create('button', 'leaflet-control-button location-steps-button');
    button.type = 'button';
    button.innerHTML = text;
    button.style.display = 'block';
    button.style.padding = '6px 8px';
    button.style.backgroundColor = text === 'Habitatumriss erfassen' || text === 'Umrisslinie speichern' ? '#22c55e' : '#9ca3af';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    button.style.width = '100%';
    button.style.textAlign = 'center';
    button.style.marginBottom = '4px';
    button.style.minWidth = '180px';

    button.dataset.controlType = 'location-steps';
    button.dataset.buttonType = text;

    if (isEnabled) {
      L.DomEvent.on(button, 'click', onClick);
      button.addEventListener('mouseover', () => {
        button.style.backgroundColor = text === 'Habitatumriss erfassen' || text === 'Umrisslinie speichern' ? '#16a34a' : '#6b7280';
      });
      button.addEventListener('mouseout', () => {
        button.style.backgroundColor = text === 'Habitatumriss erfassen' || text === 'Umrisslinie speichern' ? '#22c55e' : '#9ca3af';
      });
    } else {
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
    }

    return button;
  },

  onRemove: function() {
    // Cleanup
  }
});

// Registriere den Control
L.Control.LocationSteps = LocationStepsControl;

// Registriere die Factory-Funktion
L.control.locationSteps = function(options?: LocationStepsOptions) {
  return new L.Control.LocationSteps(options || {});
};

// Komponente als benannte Funktion deklarieren
function MapNoSSR({ 
  position, 
  zoom, 
  onCenterChange, 
  onZoomChange,
  onPolygonChange,
  onAreaChange,
  initialPolygon = [],
  editMode = false,
  onStartDrawing,
  onSavePolygon,
  onRestartDrawing,
  onCancelDrawing,
  onSavePolygonWithPoints
}: MapNoSSRProps) {
  console.log('MapNoSSR RENDER', { 
    position, 
    zoom, 
    initialPolygon: initialPolygon.length,
    editMode,
    time: new Date().toISOString()
  });
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const wmsLayerRef = useRef<L.TileLayer.WMS | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  // Referenz für das LocationSteps Control
  const locationStepsControlRef = useRef<any>(null);

  // Polygon-Styles
  const polygonOptions = {
    color: '#22c55e', // Grüne Farbe
    weight: 2,
    opacity: 0.9,
    fillOpacity: 0.7,
    fillColor: '#22c55e'
  };

  // Vertex-Style für die Eckpunkte während des Zeichnens
  const vertexStyle = {
    radius: 4,
    fillColor: '#22c55e',
    color: '#fff',
    weight: 2,
    opacity: 1,
    fillOpacity: 1
  };

  // Funktion zur Berechnung der Fläche
  const calculateArea = useCallback((polygon: L.Polygon) => {
    const latlngs = polygon.getLatLngs()[0] as L.LatLng[];
    const area = L.GeometryUtil.geodesicArea(latlngs);
    return Math.round(area); // Runden auf ganze Quadratmeter
  }, []);

  // Map-Initialisierung - nur einmal beim Mount
  useEffect(() => {
    if (mapRef.current === null && mapContainerRef.current !== null) {
      console.log('Map wird initialisiert', {
        editMode,
        position,
        zoom
      });
      
      // Leaflet-Map initialisieren
      mapRef.current = L.map(mapContainerRef.current, {
        maxZoom: 18,
        minZoom: 3,
        zoomControl: true,
        zoomSnap: 0.5,
        wheelPxPerZoomLevel: 120
      }).setView(position, zoom);
      
      // Debug: Zoom-Events loggen
      mapRef.current.on('zoomstart', () => {
        console.log('ZOOM START', { 
          currentZoom: mapRef.current?.getZoom(),
          time: new Date().toISOString()
        });
      });
      
      mapRef.current.on('zoom', () => {
        console.log('ZOOM WÄHREND', { 
          currentZoom: mapRef.current?.getZoom(),
          time: new Date().toISOString()
        });
      });
      
      mapRef.current.on('zoomend', () => {
        console.log('ZOOM ENDE', { 
          finalZoom: mapRef.current?.getZoom(),
          time: new Date().toISOString()
        });
      });
      
      // Basis OpenStreetMap Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);

      // Mapbox Satellite Layer für höhere Zoom-Level
      L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA', {
        attribution: '&copy; Mapbox',
        maxZoom: 18
      }).addTo(mapRef.current);

      // Südtiroler WMS-Layer hinzufügen für aktuelle Orthofotos
      try {
        wmsLayerRef.current = L.tileLayer.wms('https://geoservices.buergernetz.bz.it/mapproxy/ows', {
          layers: 'p_bz-Orthoimagery:Aerial-2023-RGB',
          format: 'image/png',
          transparent: true,
          version: '1.3.0',
          opacity: 1,
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
        polygonLayerRef.current = L.polygon(initialPolygon, polygonOptions);
        drawnItemsRef.current.addLayer(polygonLayerRef.current);
      }

      // Layer Control hinzufügen
      const baseMaps = {
        "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
      };

      if (wmsLayerRef.current) {
        const overlayMaps = {
          "Südtiroler Orthofoto 2023": wmsLayerRef.current
        };
        L.control.layers(baseMaps, overlayMaps).addTo(mapRef.current);
      } else {
        L.control.layers(baseMaps).addTo(mapRef.current);
      }

      // Event-Listener für Position
      mapRef.current.on('move', () => {
        if (mapRef.current) {
          const newCenter = mapRef.current.getCenter();
          onCenterChange([newCenter.lat, newCenter.lng]);
        }
      });
      
      // Event-Listener für Zoom
      mapRef.current.on('zoomend', () => {
        if (mapRef.current && onZoomChange) {
          const newZoom = mapRef.current.getZoom();
          onZoomChange(newZoom);
        }
      });

      console.log('Map initialisiert');
    }

    return () => {
      if (mapRef.current !== null) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Leeres Dependency Array - wird nur beim Mount ausgeführt

  // Edit-Mode Änderungen separat behandeln
  useEffect(() => {
    if (!mapRef.current) return;

    console.log('Edit-Mode useEffect ausgelöst', { 
      editMode,
      currentZoom: mapRef.current.getZoom(),
      mapCenter: mapRef.current.getCenter(),
      time: new Date().toISOString(),
      hasLocationControl: locationStepsControlRef.current !== null
    });

    // Control entfernen, falls vorhanden
    if (locationStepsControlRef.current) {
      try {
        console.log('CLEANUP: Entferne vorhandenes Control aus Referenz');
        if (mapRef.current) {
          mapRef.current.removeControl(locationStepsControlRef.current);
        }
        locationStepsControlRef.current = null;
      } catch (error) {
        console.error('Fehler beim Entfernen des Controls über Referenz:', error);
      }
    }

    // Verbesserte Strategie zum Entfernen ALLER bestehenden LocationSteps Controls
    try {
      console.log('CLEANUP: Entferne alte LocationSteps Controls...');
      
      // 1. Zunächst alle Controls von der Karte entfernen
      document.querySelectorAll('.location-steps-button, button[data-control-type="location-steps"]')
        .forEach(button => {
          console.log('CLEANUP: Button gefunden:', button);
        });
      
      // 2. Alle Controls identifizieren
      const locationControls = document.querySelectorAll('.location-steps-control');
      console.log(`CLEANUP: ${locationControls.length} LocationSteps Controls gefunden`);
      
      // 3. Alle Control-Container durchgehen
      const controlContainers = document.querySelectorAll('.leaflet-control-container');
      controlContainers.forEach(container => {
        // Alle Controls in diesem Container durchgehen
        const controls = container.querySelectorAll('.leaflet-control');
        controls.forEach(control => {
          // Wenn es ein Location-Control ist oder Location-Buttons enthält
          if (control.classList.contains('location-steps-control') || 
              control.querySelector('.location-steps-button') ||
              control.querySelector('button[data-control-type="location-steps"]')) {
            console.log('CLEANUP: Entferne Control:', control);
            control.remove(); // Direkt aus dem DOM entfernen
          }
        });
        
        // Spezifisch nach IDs suchen, die mit "location-steps-control-" beginnen
        document.querySelectorAll('[id^="location-steps-control-"]').forEach(element => {
          console.log('CLEANUP: Entferne Control mit ID:', element.id);
          element.remove();
        });
      });
    } catch (error) {
      console.error('Fehler beim Entfernen der Controls:', error);
    }

    // Etwas Verzögerung vor dem Hinzufügen des neuen Controls
    setTimeout(() => {
      // Neues LocationSteps Control hinzufügen, nur wenn noch keines existiert
      if (!locationStepsControlRef.current && mapRef.current) {
        console.log('Füge neues LocationSteps Control hinzu', {
          isDrawing: editMode,
          hasPolygon: initialPolygon.length > 0,
          time: new Date().toISOString()
        });

        const locationStepsControl = L.control.locationSteps({
          position: 'bottomleft',
          onStartDrawing,
          onSavePolygon,
          onRestartDrawing,
          onCancelDrawing,
          onPolygonChange,
          isDrawing: editMode,
          hasPolygon: initialPolygon.length > 0,
          drawnItems: drawnItemsRef.current,
          onSavePolygonWithPoints
        });

        // Control hinzufügen und in Referenz speichern
        locationStepsControlRef.current = locationStepsControl;
        locationStepsControl.addTo(mapRef.current);
        console.log('LocationSteps Control hinzugefügt und in Referenz gespeichert');
      } else {
        console.log('Control bereits vorhanden oder Map nicht bereit:', {
          hasControl: !!locationStepsControlRef.current,
          hasMap: !!mapRef.current
        });
      }
    }, 100); // Erhöhte Verzögerung für bessere Sicherheit

    // Draw Control entfernen, falls vorhanden
    if (drawControlRef.current) {
      mapRef.current.removeControl(drawControlRef.current);
      drawControlRef.current = null;
    }

    // Event-Handler entfernen
    mapRef.current.off(L.Draw.Event.CREATED);
    mapRef.current.off(L.Draw.Event.EDITED);
    mapRef.current.off(L.Draw.Event.DELETED);

    if (editMode) {
      const drawOptions = {
        position: 'topright' as const,
        draw: {
          polygon: {
            allowIntersection: false,
            drawError: {
              color: '#e1e100',
              message: '<strong>Polygone dürfen sich nicht überschneiden!</strong>'
            },
            shapeOptions: polygonOptions,
            showArea: true
          },
          polyline: false,
          circle: false,
          rectangle: false,
          circlemarker: false,
          marker: false
        },
        edit: {
          featureGroup: drawnItemsRef.current!,

          remove: false
        }
      };

      // Draw Control erstellen (ohne Toolbar)
      drawControlRef.current = new L.Control.Draw(drawOptions);
      
      // Wir fügen das Control nicht zur Karte hinzu, da wir keine Toolbar wollen
      // mapRef.current.addControl(drawControlRef.current);

      // Event-Handler für Zeichnung
      mapRef.current.on(L.Draw.Event.CREATED, (event: any) => {
        const layer = event.layer as L.Polygon;
        
        if (drawnItemsRef.current) {
          drawnItemsRef.current.clearLayers();
          drawnItemsRef.current.addLayer(layer);
          polygonLayerRef.current = layer;
          
          const latlngs = layer.getLatLngs()[0];
          if (Array.isArray(latlngs)) {
            const points = latlngs.map((p: L.LatLng): [number, number] => [p.lat, p.lng]);
            console.log('Polygon erstellt mit Punkten:', points);
            if (onPolygonChange) {
              onPolygonChange(points);
            }

            // Fläche berechnen und weitergeben
            if (onAreaChange) {
              const area = calculateArea(layer);
              onAreaChange(area);
            }
          }

          // Automatisch in den Edit-Modus wechseln
          if (mapRef.current) {
            // Alle bestehenden Controls entfernen
            if (drawControlRef.current) {
              mapRef.current.removeControl(drawControlRef.current);
            }

            // Edit-Modus direkt aktivieren
            if (layer.editing) {
              layer.editing.enable();
            }

            // Vertex-Marker anzeigen durch Aktivierung des Edit-Handlers
            const editHandler = new L.EditToolbar.Edit(mapRef.current, {
              featureGroup: drawnItemsRef.current,
            });
            editHandler.enable();
          }
        }
      });

      // Event-Handler für Bearbeitung
      mapRef.current.on(L.Draw.Event.EDITED, (event: any) => {
        const layers = event.layers;
        
        layers.eachLayer((layer: L.Layer) => {
          if (layer instanceof L.Polygon && layer.getLatLngs && layer.getLatLngs()[0]) {
            const latlngs = layer.getLatLngs()[0];
            const points = (Array.isArray(latlngs) ? latlngs : [latlngs]).map(
              (latlng: L.LatLng) => [latlng.lat, latlng.lng] as [number, number]
            );
            
            if (onPolygonChange) {
              onPolygonChange(points);
            }

            // Fläche nach Bearbeitung neu berechnen
            if (onAreaChange) {
              const area = calculateArea(layer);
              onAreaChange(area);
            }

            // Nach dem Speichern herauszoomen
            if (mapRef.current) {
              const currentZoom = mapRef.current.getZoom();
              mapRef.current.setZoom(Math.max(currentZoom - 5, 3));
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
  }, [editMode]); // Reduzierte Dependencies auf das Wesentliche

  // Aktualisiere Position und Zoom nur wenn nötig
  useEffect(() => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom();
      if (currentZoom !== zoom) {
        mapRef.current.setView(position, zoom);
      }
    }
  }, [position, zoom]);

  // Aktualisiere den Polygon, wenn sich initialPolygon ändert
  useEffect(() => {
    if (mapRef.current && drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers();
      
      if (initialPolygon.length > 0) {
        polygonLayerRef.current = L.polygon(initialPolygon, polygonOptions);
        drawnItemsRef.current.addLayer(polygonLayerRef.current);

        // Füge Kreise für die Eckpunkte hinzu, wenn im Bearbeitungsmodus
        if (editMode) {
          initialPolygon.forEach(point => {
            L.circleMarker(point, vertexStyle).addTo(drawnItemsRef.current!);
          });
        }
      } else if (editMode) {
        const handler = new L.Draw.Polygon(mapRef.current, {
          allowIntersection: false,
          showArea: true,
          drawError: {
            color: '#e1e100',
            message: '<strong>Polygone dürfen sich nicht überschneiden!</strong>'
          },
          shapeOptions: {
            ...polygonOptions,
            editing: {
              fill: true
            }
          }
        });
        handler.enable();
      }
    }
  }, [initialPolygon, editMode]);

  return (
    <>
      <div ref={mapContainerRef} className="leaflet-container" style={{ width: '100%', height: '100%', position: 'relative', zIndex: 9999, overflow: 'hidden' }} />
      <style jsx global>{`
        /* Verstecke die Leaflet Draw Toolbar */
        .leaflet-draw.leaflet-control {
          display: none !important;
        }

        /* Verstecke die Edit-Toolbar */
        .leaflet-draw-toolbar {
          display: none !important;
        }

        /* Zeige die Vertex-Marker nur im Edit-Modus */
        .leaflet-editing-icon {
          width: 8px !important;
          height: 8px !important;
          margin-left: -4px !important;
          margin-top: -4px !important;
          background-color: #22c55e !important;
          border: 2px solid white !important;
          border-radius: 50% !important;
          display: ${editMode ? 'block' : 'none'} !important;
        }

        /* Anpassen der Polygon-Styles */
        .leaflet-interactive {
          cursor: crosshair;
        }
      `}</style>
    </>
  );
}

export default React.memo(MapNoSSR);
