// components/MapNoSSR.tsx
// Implementiert eine interaktive Karte mit Polygon-Zeichnungsfunktionalität mithilfe von Leaflet
// Die Komponente wird client-seitig ohne SSR geladen, um Kompatibilitätsprobleme zu vermeiden
import React, { useEffect, useRef, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet-draw';

// Typendefinitionen für die Leaflet Draw-Bibliothek
// Diese Typen helfen TypeScript zu verstehen, welche Optionen für die Draw-Funktionalität verfügbar sind
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

// Erweiterte Typendefinitionen für Leaflet
// Diese Erweiterungen sind notwendig, weil die Standard-Leaflet-Typdefinitionen
// nicht alle Funktionen abdecken, die wir verwenden
declare module 'leaflet' {
  // Erweiterte Typen für die Draw-Steuerelemente
  namespace Control {
    interface DrawConstructorOptions extends DrawOptions {
      _internal?: boolean;
    }
    
    class DrawControl extends L.Control {
      constructor(options?: DrawConstructorOptions);
    }
  }

  // Ereignistypen für Draw-Operationen
  namespace Draw {
    namespace Event {
      const CREATED_EVENT: string;
      const EDITED_EVENT: string;
      const DELETED_EVENT: string;
    }
  }

  // Erweiterung für Polygon um editing-Eigenschaft
  // Notwendig für die Bearbeitungsfunktionalität
  interface Polygon {
    editing?: {
      enable: () => void;
      disable: () => void;
    };
  }
  
  // Erweiterung für Map um benutzerdefinierte Eigenschaften
  // Hier für den Throttle-Timer für Mousemove-Events
  interface Map {
    throttleTimer?: NodeJS.Timeout;
  }
}

// Methoden, die nach außen exponiert werden
export interface MapNoSSRHandle {
  centerMap: (lat: number, lng: number, zoom?: number) => void;
  getCurrentPolygonPoints: () => Array<[number, number]>;
}

// Props-Interface für die MapNoSSR-Komponente
interface MapNoSSRProps {
  position: L.LatLngExpression;       // Startposition der Karte (Lat/Lng)
  zoom: number;                        // Zoom-Level der Karte
  onCenterChange: (newCenter: [number, number]) => void;  // Callback bei Änderung der Position
  onZoomChange?: (newZoom: number) => void;             // Callback bei Zoom-Änderung
  onPolygonChange?: (polygonPoints: Array<[number, number]>) => void;  // Callback bei Änderung des Polygons
  onAreaChange?: (areaInSqMeters: number) => void;      // Callback bei Änderung der Fläche
  initialPolygon?: Array<[number, number]>;             // Initiales Polygon, falls vorhanden
  editMode?: boolean;                  // Flag, ob im Bearbeitungsmodus (true) oder Navigationsmodus (false)
  hasPolygon?: boolean;                // Flag, ob bereits ein Polygon existiert
  showZoomControls?: boolean;          // Flag, ob Zoom-Steuerelemente angezeigt werden sollen
  showPositionMarker?: boolean;        // Flag, ob Positionsmarker angezeigt werden soll
}

// Komponente mit forwardRef, um Ref-Funktionen nach außen zu exponieren
const MapNoSSR = forwardRef<MapNoSSRHandle, MapNoSSRProps>(({ 
  position, 
  zoom, 
  onCenterChange, 
  onZoomChange,
  onPolygonChange,
  onAreaChange,
  initialPolygon = [],
  editMode = false,
  hasPolygon,
  showZoomControls = true,
  showPositionMarker = true
}, ref) => {
  // Debug-Log für Rendering und Zustandsänderungen
  console.log('MapNoSSR RENDER', { 
    position, 
    zoom, 
    initialPolygon: initialPolygon.length,
    editMode,
    hasPolygon,
    showZoomControls,
    time: new Date().toISOString()
  });

  // Refs für Leaflet-Objekte und DOM-Elemente
  const mapRef = useRef<L.Map | null>(null);           // Referenz zur Leaflet-Karte selbst
  const mapContainerRef = useRef<HTMLDivElement | null>(null);  // Referenz zum DOM-Container
  const wmsLayerRef = useRef<L.TileLayer.WMS | null>(null);     // WMS-Layer (Südtiroler Orthofotos)
  const drawControlRef = useRef<L.Control.Draw | null>(null);   // Draw-Control-Referenz
  const polygonLayerRef = useRef<L.Polygon | null>(null);       // Aktuelles Polygon
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);    // Gruppe aller gezeichneten Elemente
  const activeDrawHandlerRef = useRef<any>(null);               // Aktiver Draw-Handler für Polygon-Zeichnung
  const positionMarkerRef = useRef<L.Marker | null>(null);      // Positionsmarker

  // Exponiere Methoden nach außen über Ref
  useImperativeHandle(ref, () => ({
    // Methode zum expliziten Zentrieren der Karte auf eine Position
    centerMap: (lat: number, lng: number, newZoom?: number) => {
      console.log('Karte wird explizit zentriert auf:', { lat, lng, zoom: newZoom });
      
      if (mapRef.current) {
        // setView ändert sowohl die Position als auch den Zoom-Level in einer Operation
        mapRef.current.setView([lat, lng], newZoom !== undefined ? newZoom : mapRef.current.getZoom());
        
        // Falls der Marker existiert, seine Position auch aktualisieren
        if (positionMarkerRef.current) {
          positionMarkerRef.current.setLatLng([lat, lng]);
        }
      }
    },
    
    // Methode zum Extrahieren der aktuellen Polygon-Punkte
    getCurrentPolygonPoints: () => {
      console.log('Extrahiere aktuelle Polygon-Punkte');
      
      // Wenn kein Polygon existiert, leeres Array zurückgeben
      if (!polygonLayerRef.current) {
        console.log('Kein Polygon vorhanden');
        return [];
      }
      
      try {
        // Polygon-Punkte aus Leaflet extrahieren
        const latlngs = polygonLayerRef.current.getLatLngs()[0] as L.LatLng[];
        
        // In das gewünschte Format umwandeln
        const points = latlngs.map((point): [number, number] => [point.lat, point.lng]);
        console.log('Polygon-Punkte extrahiert:', points.length, 'Punkte');
        
        // Prüfen, ob das Polygon geschlossen ist
        const isPolygonClosed = 
          points.length > 2 && 
          points[0][0] === points[points.length-1][0] && 
          points[0][1] === points[points.length-1][1];
        
        console.log('Polygon ist geschlossen:', isPolygonClosed ? 'JA' : 'NEIN');
        
        return points;
      } catch (error) {
        console.error('Fehler beim Extrahieren der Polygon-Punkte:', error);
        return [];
      }
    }
  }));

  // Polygon-Styles für die visuelle Darstellung des Polygons mit useMemo
  const polygonOptions = useMemo(() => ({
    color: '#22c55e',    // Grüne Farbe für die Linien
    weight: 2,           // Liniendicke
    fillColor: '#22c55e', // Füllfarbe (grün)
    fillOpacity: 0.7,    // Deckkraft der Füllung
  }), []);

  // Funktion zur Berechnung der Fläche eines Polygons in Quadratmetern
  // Verwendet die Geodesic-Berechnung für genaue Ergebnisse auf der Erdkugel
  const calculateArea = useCallback((polygon: L.Polygon) => {
    console.log('calculateArea aufgerufen');
    try {
      const latlngs = polygon.getLatLngs()[0] as L.LatLng[];
      console.log('Polygon-Punkte für Flächenberechnung:', latlngs.map(p => [p.lat, p.lng]));
      const area = L.GeometryUtil.geodesicArea(latlngs);
      console.log('Berechnete Fläche:', Math.round(area), 'm²');
      return Math.round(area); // Runden auf ganze Quadratmeter
    } catch (error) {
      console.error('Fehler bei Flächenberechnung:', error);
      return 0;
    }
  }, []);

  // Map-Initialisierung - wird nur einmal beim ersten Mounten der Komponente ausgeführt
  useEffect(() => {
    // Nur ausführen, wenn die Karte noch nicht initialisiert wurde
    if (mapRef.current === null && mapContainerRef.current !== null) {
      console.log('Map wird initialisiert', {
        editMode,
        position,
        zoom
      });
      
      // Leaflet-Map initialisieren mit Basisoptionen
      mapRef.current = L.map(mapContainerRef.current, {
        maxZoom: 18,                 // Maximaler Zoom
        minZoom: 3,                  // Minimaler Zoom
        zoomControl: showZoomControls, // Zoom-Controls basierend auf Prop
        zoomSnap: 0.5,               // Zoom in 0.5-Schritten
        wheelPxPerZoomLevel: 120     // Mausrad-Sensitivität
      }).setView(position, zoom);
      
      // Debug: Zoom-Events loggen für Fehlersuche
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
      
      // Basis OpenStreetMap Layer als Grundkarte hinzufügen
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);

      // Mapbox Satellite Layer für höhere Zoom-Level als zusätzliche Option
      L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA', {
        attribution: '&copy; Mapbox',
        maxZoom: 18
      }).addTo(mapRef.current);

      // Südtiroler WMS-Layer hinzufügen für aktuelle Orthofotos
      // Dies ermöglicht eine hochauflösende Ansicht der lokalen Umgebung
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
      // Diese Gruppe enthält alle Polygone und andere gezeichnete Elemente
      drawnItemsRef.current = new L.FeatureGroup();
      mapRef.current.addLayer(drawnItemsRef.current);

      // Positionsmarker hinzufügen, wenn gewünscht
      if (showPositionMarker) {
        // Benutzerdefiniertes Icon für den Marker definieren
        const positionIcon = L.divIcon({
          className: 'position-marker-icon',
          html: `
            <div class="position-marker-container">
              <div class="position-marker-pulse"></div>
              <div class="position-marker-center"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        // Marker erstellen und zur Karte hinzufügen
        positionMarkerRef.current = L.marker(position, {
          icon: positionIcon,
          zIndexOffset: 1000
        }).addTo(mapRef.current);
      }

      // Initialen Polygon hinzufügen, wenn vorhanden (z.B. beim Bearbeiten eines bestehenden Polygons)
      if (initialPolygon.length > 0) {
        polygonLayerRef.current = L.polygon(initialPolygon, polygonOptions);
        drawnItemsRef.current.addLayer(polygonLayerRef.current);
      }

      // Layer Control hinzufügen für das Umschalten zwischen verschiedenen Kartentypen
      const baseMaps = {
        "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
      };

      // WMS-Layer als Overlay hinzufügen, wenn er erfolgreich geladen wurde
      if (wmsLayerRef.current) {
        const overlayMaps = {
          "Südtiroler Orthofoto 2023": wmsLayerRef.current
        };
        L.control.layers(baseMaps, overlayMaps).addTo(mapRef.current);
      } else {
        L.control.layers(baseMaps).addTo(mapRef.current);
      }

      // Event-Listener für Positionsänderungen
      // Wird ausgelöst, wenn der Nutzer die Karte verschiebt
      mapRef.current.on('move', () => {
        if (mapRef.current) {
          const newCenter = mapRef.current.getCenter();
          onCenterChange([newCenter.lat, newCenter.lng]);
        }
      });
      
      // Event-Listener für Zoom-Änderungen
      // Wird ausgelöst, wenn der Nutzer den Zoom-Level ändert
      mapRef.current.on('zoomend', () => {
        if (mapRef.current && onZoomChange) {
          const newZoom = mapRef.current.getZoom();
          onZoomChange(newZoom);
        }
      });

      console.log('Map initialisiert');
    }

    // Cleanup-Funktion: Entfernt die Karte, wenn die Komponente unmontiert wird
    return () => {
      if (mapRef.current !== null) {
        mapRef.current.remove();
        mapRef.current = null;
        positionMarkerRef.current = null;
      }
    };
  }, []); // Leeres Dependency Array - wird nur beim Mount ausgeführt

  // Funktion zum expliziten Beenden des Zeichnungsmodus
  // Wird aufgerufen, wenn der Benutzer den Zeichnungsmodus verlässt oder wenn ein Polygon abgeschlossen wird
  const cancelDrawing = useCallback(() => {
    console.log('Zeichnungsmodus wird explizit beendet');
    
    // Aktiven Draw-Handler deaktivieren
    if (activeDrawHandlerRef.current) {
      try {
        // Zeichnungsmodus deaktivieren, wenn verfügbar
        if (typeof activeDrawHandlerRef.current.disable === 'function') {
          activeDrawHandlerRef.current.disable();
        }
        
        // Alle Zwischenpunkte des aktuellen Zeichnungsvorgangs entfernen
        if (typeof activeDrawHandlerRef.current.deleteLastVertex === 'function') {
          // Alle Vertices löschen, um das Zeichnen zu beenden
          while (activeDrawHandlerRef.current._markers && activeDrawHandlerRef.current._markers.length > 0) {
            activeDrawHandlerRef.current.deleteLastVertex();
          }
        }
        
        // Cursor zurücksetzen von Fadenkreuz auf Standard
        if (mapContainerRef.current) {
          mapContainerRef.current.style.cursor = '';
        }
        
        // Alle Draw-Event-Listener entfernen
        if (mapRef.current) {
          mapRef.current.off('click');
          mapRef.current.off('mousemove');
        }
      } catch (error) {
        console.error('Fehler beim Deaktivieren des Draw-Handlers:', error);
      }
      
      // Handler-Referenz zurücksetzen
      activeDrawHandlerRef.current = null;
    }
    
    // Alle Navigationsmöglichkeiten wieder aktivieren
    // Dies ist wichtig, da während des Zeichnens die Navigation deaktiviert ist
    if (mapRef.current) {
      mapRef.current.dragging.enable();
      mapRef.current.touchZoom.enable();
      mapRef.current.doubleClickZoom.enable();
      mapRef.current.scrollWheelZoom.enable();
      mapRef.current.boxZoom.enable();
      mapRef.current.keyboard.enable();
    }
  }, []);

  // Funktion zum Extrahieren der aktuellen Punkte während des Zeichnens
  // Diese Funktion ermöglicht es, die Polygon-Punkte während des Zeichnens zu aktualisieren
  const extractCurrentDrawingPoints = useCallback(() => {
    if (!activeDrawHandlerRef.current || !onPolygonChange) return;
    
    try {
      const drawHandler = activeDrawHandlerRef.current;
      
      // Überprüfe, ob der Handler Markierungen hat (Polygon-Punkte)
      if (drawHandler._markers && drawHandler._markers.length > 0) {
        // Extrahiere die Punktkoordinaten aus den Markern
        const currentMarkers = drawHandler._markers;
        const currentPoints = currentMarkers.map((marker: any): [number, number] => {
          if (marker && marker._latlng) {
            return [marker._latlng.lat, marker._latlng.lng];
          }
          return [0, 0]; // Fallback für ungültige Marker
        }).filter((p: [number, number]) => p[0] !== 0 && p[1] !== 0); // Entferne ungültige Punkte
        
        // Sende nur gültige Punkte an die übergeordnete Komponente
        if (currentPoints.length > 0) {
          console.log('Extrahierte Punkte während des Zeichnens:', currentPoints.length);
          onPolygonChange(currentPoints);
        }
      }
    } catch (error) {
      console.error('Fehler beim Extrahieren der Zeichnungspunkte:', error);
    }
  }, [onPolygonChange]);

  // Zoom-Controls dynamisch ein-/ausblenden basierend auf dem showZoomControls-Prop
  useEffect(() => {
    if (mapRef.current) {
      // Bestehende Zoom-Controls entfernen, falls vorhanden
      const existingZoomControl = document.querySelector('.leaflet-control-zoom');
      if (existingZoomControl) {
        existingZoomControl.remove();
      }
      
      // Zoom-Control hinzufügen, wenn showZoomControls true ist
      if (showZoomControls) {
        L.control.zoom().addTo(mapRef.current);
      }
    }
  }, [showZoomControls]);

  // Effekt zum Umschalten zwischen Navigations- und Bearbeitungsmodus
  // Dieser Effekt wird ausgelöst, wenn editMode sich ändert
  useEffect(() => {
    if (!mapRef.current) return;

    console.log('Edit-Mode geändert:', { 
      editMode, 
      punkteAnzahl: initialPolygon.length,
      time: new Date().toISOString() 
    });

    // Bestehende Draw-Handler bereinigen
    if (activeDrawHandlerRef.current) {
      if (typeof activeDrawHandlerRef.current.disable === 'function') {
        activeDrawHandlerRef.current.disable();
      }
      activeDrawHandlerRef.current = null;
    }

    // Event-Handler entfernen, um Mehrfachregistrierung zu vermeiden
    if (mapRef.current) {
      mapRef.current.off('click');
      mapRef.current.off('mousemove');
      mapRef.current.off(L.Draw.Event.CREATED);
      mapRef.current.off(L.Draw.Event.EDITED);
      mapRef.current.off(L.Draw.Event.DELETED);
    }

    if (editMode) {
      // ---- ZEICHENMODUS ----
      
      // Navigationsmöglichkeiten deaktivieren für präzises Zeichnen
      mapRef.current.dragging.disable();
      mapRef.current.touchZoom.disable();
      mapRef.current.doubleClickZoom.disable();
      mapRef.current.scrollWheelZoom.disable();
      mapRef.current.boxZoom.disable();
      mapRef.current.keyboard.disable();
      
      // Cursor auf Fadenkreuz setzen
      if (mapContainerRef.current) {
        mapContainerRef.current.style.cursor = 'crosshair';
      }
      
      // Polygon-Zeichenfunktion aktivieren
      if (drawnItemsRef.current) {
        try {
          // Draw-Event-Handler für neu erstellte Polygone
          mapRef.current.on(L.Draw.Event.CREATED, (event: any) => {
            const layer = event.layer as L.Polygon;
            
            if (drawnItemsRef.current) {
              // Bestehende Layer löschen und das neue Polygon hinzufügen
              drawnItemsRef.current.clearLayers();
              drawnItemsRef.current.addLayer(layer);
              polygonLayerRef.current = layer;
              
              // Polygon-Punkte extrahieren und weitergeben
              try {
                const latlngs = layer.getLatLngs()[0] as L.LatLng[];
                if (Array.isArray(latlngs)) {
                  const points = latlngs.map((p: L.LatLng): [number, number] => [p.lat, p.lng]);
                  console.log('Polygon fertig gezeichnet mit', points.length, 'Punkten');
                  console.log('Polygon ist geschlossen:', 
                    points.length > 2 && 
                    points[0][0] === points[points.length-1][0] && 
                    points[0][1] === points[points.length-1][1] ? 'JA' : 'NEIN');
                  
                  if (onPolygonChange) {
                    onPolygonChange(points);
                  }

                  // Fläche berechnen, wenn gewünscht
                  if (onAreaChange) {
                    const area = calculateArea(layer);
                    onAreaChange(area);
                    console.log('Berechnete Fläche des Polygons:', area, 'm²');
                  }
                }
              } catch (error) {
                console.error('Fehler bei der Verarbeitung des Polygons:', error);
              }
            }
          });

          // Event-Listener für Bearbeitung (Vertices verschieben)
          mapRef.current.on('editable:vertex:dragend', (e) => {
            console.log('editable:vertex:dragend Event ausgelöst', e);
            updateAreaAfterEdit();
          });
          
          // Zusätzliche Events für die Bearbeitung
          mapRef.current.on('editable:vertex:drag', (e) => {
            console.log('editable:vertex:drag Event ausgelöst');
          });
          
          mapRef.current.on('editable:editing', (e) => {
            console.log('editable:editing Event ausgelöst');
          });
          
          // Alternative Event-Listener für Leaflet.Draw Edit-Events
          mapRef.current.on(L.Draw.Event.EDITED, (event: any) => {
            console.log('L.Draw.Event.EDITED Event ausgelöst', event);
            
            // Extrahiere das bearbeitete Polygon
            const layers = event.layers;
            layers.eachLayer((layer: L.Polygon) => {
              if (layer && onAreaChange) {
                // Fläche neu berechnen
                const area = calculateArea(layer);
                onAreaChange(area);
                console.log('Neu berechnete Fläche des Polygons:', area, 'm²');
                
                // Polygon-Punkte aktualisieren
                try {
                  const latlngs = layer.getLatLngs()[0] as L.LatLng[];
                  if (Array.isArray(latlngs) && onPolygonChange) {
                    const points = latlngs.map((p: L.LatLng): [number, number] => [p.lat, p.lng]);
                    onPolygonChange(points);
                  }
                } catch (error) {
                  console.error('Fehler beim Aktualisieren der Polygon-Punkte:', error);
                }
              }
            });
          });
          
          // Wenn kein bestehendes Polygon vorhanden ist, Zeichenmodus starten
          if (initialPolygon.length === 0) {
            // Polygon-Zeichnungsmodus initialisieren
            const drawOptions = {
              allowIntersection: false,
              showArea: true,
              drawError: {
                color: '#e1e100',
                message: '<strong>Polygone dürfen sich nicht überschneiden!</strong>'
              },
              shapeOptions: polygonOptions
            };

            // @ts-expect-error - Umgehe die TypeScript-Typprüfung
            const handler = new L.Draw.Polygon(mapRef.current, drawOptions);
            activeDrawHandlerRef.current = handler;
            
            // Zeichenmodus aktivieren
            if (typeof handler.enable === 'function') {
              handler.enable();
              
              // Event-Listener für das Hinzufügen neuer Punkte
              if (mapRef.current) {
                // Klick-Event für neue Punkte überwachen
                mapRef.current.on('click', (clickEvent: L.LeafletMouseEvent) => {
                  // Prüfen, ob der Handler aktiv ist und Marker hat
                  if (activeDrawHandlerRef.current && 
                      activeDrawHandlerRef.current._markers) {
                    const pointCount = activeDrawHandlerRef.current._markers.length;
                    console.log(`Neuer Punkt zum Polygon hinzugefügt (${pointCount} Punkte insgesamt)`);
                    
                    // Prüfen auf Polygon-Schließung (wenn auf ersten Punkt geklickt wird)
                    if (pointCount > 2 && mapRef.current) {
                      const firstMarker = activeDrawHandlerRef.current._markers[0];
                      const lastClick = clickEvent.latlng;
                      
                      // Einfache Distanzberechnung, um zu prüfen, ob wir in der Nähe des ersten Punktes sind
                      if (firstMarker && firstMarker._latlng) {
                        const distance = mapRef.current.distance(
                          firstMarker._latlng,
                          [lastClick.lat, lastClick.lng]
                        );
                        
                        // Wenn der Klick nahe am ersten Punkt ist (Toleranz: 20 Meter)
                        if (distance < 20) {
                          console.log('Polygon geschlossen durch Klick auf ersten Punkt');
                        }
                      }
                    }
                  }
                });
              }
            }
          } else {
            // Bestehendes Polygon bearbeiten
            if (polygonLayerRef.current && polygonLayerRef.current.editing) {
              polygonLayerRef.current.editing.enable();
            }
          }
        } catch (error) {
          console.error('Fehler beim Aktivieren des Zeichenmodus:', error);
        }
      }
    } else {
      // ---- NAVIGATIONSMODUS ----
      
      // Alle Navigationsmöglichkeiten aktivieren
      mapRef.current.dragging.enable();
      mapRef.current.touchZoom.enable();
      mapRef.current.doubleClickZoom.enable();
      mapRef.current.scrollWheelZoom.enable();
      mapRef.current.boxZoom.enable();
      mapRef.current.keyboard.enable();
      
      // Cursor zurücksetzen
      if (mapContainerRef.current) {
        mapContainerRef.current.style.cursor = '';
      }
      
      // Bearbeitungsmodus deaktivieren, falls aktiv
      if (polygonLayerRef.current && polygonLayerRef.current.editing) {
        polygonLayerRef.current.editing.disable();
      }
    }
  }, [editMode, initialPolygon, polygonOptions, onPolygonChange, onAreaChange, calculateArea]);

  // Hilfsfunktion für Flächenaktualisierung nach Bearbeitung
  const updateAreaAfterEdit = useCallback(() => {
    console.log('updateAreaAfterEdit aufgerufen');
    if (polygonLayerRef.current && onAreaChange) {
      console.log('Polygon verfügbar, berechne Fläche neu');
      const area = calculateArea(polygonLayerRef.current);
      
      // Aktuelle Polygon-Punkte extrahieren und loggen
      try {
        const latlngs = polygonLayerRef.current.getLatLngs()[0] as L.LatLng[];
        const points = latlngs.map((p: L.LatLng): [number, number] => [p.lat, p.lng]);
        console.log('Aktuelle Polygon-Punkte nach Edit:', points);
        
        if (onPolygonChange) {
          console.log('Aktualisiere Polygon-Punkte nach Edit');
          onPolygonChange(points);
        }
        
        console.log('Aktualisiere Fläche nach Edit auf:', area, 'm²');
        onAreaChange(area);
      } catch (error) {
        console.error('Fehler beim Extrahieren der Polygon-Punkte:', error);
      }
    } else {
      console.log('Polygon nicht verfügbar oder kein onAreaChange-Callback');
    }
  }, [calculateArea, onAreaChange, onPolygonChange]);

  // Aktualisiere Position und Zoom nur wenn nötig
  useEffect(() => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom();
      if (currentZoom !== zoom) {
        mapRef.current.setView(position, zoom);
      }
      
      // Position des Markers aktualisieren
      if (positionMarkerRef.current) {
        positionMarkerRef.current.setLatLng(position);
      }
    }
  }, [position, zoom]);

  // Aktualisiere den Polygon, wenn sich initialPolygon ändert
  useEffect(() => {
    if (!mapRef.current || !drawnItemsRef.current) return;
    
    console.log('Polygon aktualisiert:', { 
      punkteAnzahl: initialPolygon.length,
      time: new Date().toISOString() 
    });
    
    // Bestehende Polygone entfernen
    drawnItemsRef.current.clearLayers();
    polygonLayerRef.current = null;
    
    // Neues Polygon mit den aktuellen Punkten erstellen, wenn vorhanden
    if (initialPolygon.length > 0) {
      polygonLayerRef.current = L.polygon(initialPolygon, polygonOptions);
      drawnItemsRef.current.addLayer(polygonLayerRef.current);
      
      // Im Bearbeitungsmodus Editing aktivieren
      if (editMode && polygonLayerRef.current.editing) {
        console.log('Editing-Modus für Polygon aktiviert');
        polygonLayerRef.current.editing.enable();
        
        // Fläche berechnen wenn ein neues Polygon erstellt wird
        if (onAreaChange) {
          console.log('Berechne Fläche für initiales Polygon');
          const area = calculateArea(polygonLayerRef.current);
          onAreaChange(area);
        }
        
        // Vertexes mit Event-Listenern versehen
        if (mapRef.current) {
          // Event-Listener für alle möglichen Leaflet-Edit-Events registrieren
          console.log('Registriere zusätzliche Editing-Event-Listener');
          
          mapRef.current.on('draw:editvertex', (e) => {
            console.log('draw:editvertex Event ausgelöst', e);
            updateAreaAfterEdit();
          });
          
          mapRef.current.on('draw:editmove', (e) => {
            console.log('draw:editmove Event ausgelöst', e);
            updateAreaAfterEdit();
          });
          
          mapRef.current.on('dragend', (e) => {
            console.log('dragend Event ausgelöst', e);
            updateAreaAfterEdit();
          });
          
          mapRef.current.on('mouseup', (e) => {
            console.log('mouseup Event ausgelöst', e);
            if (editMode && polygonLayerRef.current) {
              updateAreaAfterEdit();
            }
          });
        }
      }
    }
  }, [initialPolygon, editMode, polygonOptions, onAreaChange, calculateArea]);

  return (
    <>
      {/* Haupt-Container für die Leaflet-Karte */}
      <div ref={mapContainerRef} className="leaflet-container" style={{ width: '100%', height: '100%', position: 'relative', zIndex: 9999, overflow: 'hidden' }} />
      
      {/* Globale Styles für Leaflet-Elemente */}
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
          width: 24px !important;
          height: 24px !important;
          margin-left: -12px !important;
          margin-top: -12px !important;
          background-color: #22c55e !important;
          border: 2px solid white !important;
          border-radius: 50% !important;
          display: ${editMode ? 'block' : 'none'} !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
          cursor: grab !important;
        }
        
        /* Stil für den aktiven/ausgewählten Marker */
        .leaflet-editing-icon:hover, 
        .leaflet-editing-icon:active {
          width: 28px !important;
          height: 28px !important;
          margin-left: -14px !important;
          margin-top: -14px !important;
          border-width: 3px !important;
          cursor: grabbing !important;
        }

        /* Anpassen der Polygon-Styles */
        .leaflet-interactive {
          cursor: ${editMode ? 'crosshair' : 'grab'};
        }
        
        /* Positionsmarker-Styles */
        .position-marker-icon {
          background: transparent !important;
          border: none !important;
        }
        
        .position-marker-container {
          position: relative;
          width: 24px;
          height: 24px;
        }
        
        .position-marker-pulse {
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: rgba(239, 68, 68, 0.4);
          animation: pulse 1.5s infinite ease-out;
        }
        
        .position-marker-center {
          position: absolute;
          top: 4px;
          left: 4px;
          width: 16px;
          height: 16px;
          background-color: rgb(239, 68, 68);
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
        }
        
        @keyframes pulse {
          0% {
            transform: scale(0.8);
            opacity: 0.7;
          }
          70% {
            transform: scale(1.5);
            opacity: 0;
          }
          100% {
            transform: scale(0.8);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
});

// Name für debugging in React DevTools setzen
MapNoSSR.displayName = 'MapNoSSR';

// Komponente mit React.memo optimieren, um unnötige Renderings zu vermeiden
export default React.memo(MapNoSSR);

