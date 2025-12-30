"use client";

// components/MapNoSSR.tsx
// Implementiert eine interaktive Karte mit Polygon-Zeichnungsfunktionalität mithilfe von Leaflet
// Die Komponente wird client-seitig ohne SSR geladen, um Kompatibilitätsprobleme zu vermeiden
import React, { useEffect, useRef, useCallback, useMemo, useImperativeHandle, forwardRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-geometryutil'; // Importiere das GeometryUtil-Modul für Flächenberechnungen

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

// Typdefinition für Habitate
interface Habitat {
  id: string;                          // Eindeutige ID des Habitats
  name: string;                        // Name des Habitats
  polygon?: Array<[number, number]>;   // Polygon-Punkte für die Darstellung
  color?: string;                      // Optional: Individuelle Farbe für das Habitat
  schutzstatus?: string;               // Optional: Schutzstatus (geschützt/hochwertig/niederwertig)
  transparenz?: number;                // Optional: Transparenzwert (0.0 - 1.0)
}

// Methoden, die nach außen exponiert werden
export interface MapNoSSRHandle {
  centerMap: (lat: number, lng: number, zoom?: number) => void;
  getCurrentPolygonPoints: () => Array<[number, number]>;
  updatePositionMarker: (lat: number, lng: number) => void;
  getBounds: () => { minLat: number; minLng: number; maxLat: number; maxLng: number } | null;
}

// Props-Interface für die MapNoSSR-Komponente
interface MapNoSSRProps {
  position: L.LatLngExpression;       // Startposition der Karte (Lat/Lng)
  zoom: number;                        // Zoom-Level der Karte
  onCenterChange: (newCenter: [number, number]) => void;  // Callback bei Änderung der Position
  onZoomChange?: (newZoom: number) => void;             // Callback bei Zoom-Änderung
  onPolygonChange?: (polygonPoints: Array<[number, number]>) => void;  // Callback bei Änderung des Polygons
  // Draft-Callback: wird während des Zeichnens aufgerufen (z.B. nach jedem Vertex).
  // WICHTIG: Dieser Callback darf NICHT in `initialPolygon` zurückgespiegelt werden,
  // sonst triggert das den editMode-Effekt neu und unterbricht Leaflet.Draw.
  onPolygonDraftChange?: (polygonPoints: Array<[number, number]>) => void;
  // Optional: Nutzer möchte den Umriss zurücksetzen. Wird als Button in der Polygon-Mitte angezeigt.
  onResetPolygon?: () => void;
  onAreaChange?: (areaInSqMeters: number) => void;      // Callback bei Änderung der Fläche
  initialPolygon?: Array<[number, number]>;             // Initiales Polygon, falls vorhanden
  editMode?: boolean;                  // Flag, ob im Bearbeitungsmodus (true) oder Navigationsmodus (false)
  hasPolygon?: boolean;                // Flag, ob bereits ein Polygon existiert
  showZoomControls?: boolean;          // Flag, ob Zoom-Steuerelemente angezeigt werden sollen
  showPositionMarker?: boolean;        // Flag, ob Positionsmarker angezeigt werden soll
  habitats?: Habitat[];                // Liste der anzuzeigenden Habitate
  onHabitatClick?: (habitatId: string) => void; // Callback, wenn auf ein Habitat geklickt wird
  onClick?: () => void;                // Callback für Klick auf die Karte außerhalb eines Habitats
  schutzstatus?: string;               // Optionaler Schutzstatus für das eigene Polygon (geschützt/hochwertig/niederwertig)
  displayMode?: 'markers' | 'polygons'; // Anzeigemodus: Marker bei niedrigem Zoom, Polygone bei hohem Zoom
}

// Komponente mit forwardRef, um Ref-Funktionen nach außen zu exponieren
const MapNoSSR = forwardRef<MapNoSSRHandle, MapNoSSRProps>(({ 
  position, 
  zoom, 
  onCenterChange, 
  onZoomChange,
  onPolygonChange,
  onPolygonDraftChange,
  onResetPolygon,
  onAreaChange,
  initialPolygon = [],
  editMode = false,
  hasPolygon,
  showZoomControls = true,
  showPositionMarker = true,
  habitats = [],
  onHabitatClick,
  onClick,
  schutzstatus = 'niederwertig',  // Standardwert: niederwertig
  displayMode = 'polygons'  // Standardwert: Polygone
}, ref) => {
  const isDebug = process.env.NEXT_PUBLIC_MAP_DEBUG === 'true';
  // Debug-Log für Rendering und Zustandsänderungen
  if (isDebug) {
    console.log('🗺️ MapNoSSR RENDER', { 
      position, 
      zoom, 
      initialPolygon: initialPolygon.length,
      editMode,
      hasPolygon,
      showZoomControls,
      displayMode,
      time: new Date().toISOString()
    });
  }

  // Refs für Leaflet-Objekte und DOM-Elemente
  const mapRef = useRef<L.Map | null>(null);           // Referenz zur Leaflet-Karte selbst
  const mapContainerRef = useRef<HTMLDivElement | null>(null);  // Referenz zum DOM-Container
  const wmsLayerRef = useRef<L.TileLayer.WMS | null>(null);     // WMS-Layer (Südtiroler Orthofotos)
  const drawControlRef = useRef<L.Control.Draw | null>(null);   // Draw-Control-Referenz
  const polygonLayerRef = useRef<L.Polygon | null>(null);       // Aktuelles Polygon
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);    // Gruppe aller gezeichneten Elemente
  const activeDrawHandlerRef = useRef<any>(null);               // Aktiver Draw-Handler für Polygon-Zeichnung
  const positionMarkerRef = useRef<L.Marker | null>(null);      // Positionsmarker
  const resetPolygonMarkerRef = useRef<L.Marker | null>(null);  // Button-Marker in Polygon-Mitte
  const habitatPolygonsRef = useRef<L.LayerGroup | null>(null); // Layer-Gruppe für Habitat-Polygone
  const habitatMarkersRef = useRef<L.LayerGroup | null>(null); // Layer-Gruppe für Habitat-Marker
  
  // Separate Ref für die Marker-Position, um sie von der Map-Position zu trennen
  const markerPositionRef = useRef<[number, number]>([0, 0]);

  // Status-Tracking für Map-Bereitschaft
  const [isMapReady, setIsMapReady] = useState(false);

  // Exponiere Methoden nach außen über Ref
  useImperativeHandle(ref, () => ({
    // Methode zum expliziten Zentrieren der Karte auf eine Position
    centerMap: (lat: number, lng: number, newZoom?: number) => {
      if (isDebug) console.log('Karte wird explizit zentriert auf:', { lat, lng, zoom: newZoom });
      
      if (mapRef.current) {
        // setView ändert sowohl die Position als auch den Zoom-Level in einer Operation
        mapRef.current.setView([lat, lng], newZoom !== undefined ? newZoom : mapRef.current.getZoom());
        
        // WICHTIG: Den Positionsmarker bewusst NICHT aktualisieren!
        // Der Positionsmarker zeigt die GPS-Position des Nutzers an, nicht die Kartenposition
        // Die Aktualisierung des Markers muss explizit über updatePositionMarker() erfolgen
      }
    },
    
    // Methode zum Extrahieren der aktuellen Polygon-Punkte
    getCurrentPolygonPoints: () => {
      if (isDebug) console.log('Extrahiere aktuelle Polygon-Punkte');
      
      // Wenn kein Polygon existiert, leeres Array zurückgeben
      if (!polygonLayerRef.current) {
        if (isDebug) console.log('Kein Polygon vorhanden');
        return [];
      }
      
      try {
        // Polygon-Punkte aus Leaflet extrahieren
        const latlngs = polygonLayerRef.current.getLatLngs()[0] as L.LatLng[];
        
        // In das gewünschte Format umwandeln
        const points = latlngs.map((point): [number, number] => [point.lat, point.lng]);
        if (isDebug) console.log('Polygon-Punkte extrahiert:', points.length, 'Punkte');
        
        // Prüfen, ob das Polygon geschlossen ist
        const isPolygonClosed = 
          points.length > 2 && 
          points[0]?.[0] === points[points.length-1]?.[0] && 
          points[0]?.[1] === points[points.length-1]?.[1];
        
        if (isDebug) console.log('Polygon ist geschlossen:', isPolygonClosed ? 'JA' : 'NEIN');
        
        return points;
      } catch (error) {
        console.error('Fehler beim Extrahieren der Polygon-Punkte:', error);
        return [];
      }
    },
    
    // Methode zum Abrufen der aktuellen Karten-Bounds
    getBounds: () => {
      if (!mapRef.current) return null;
      const bounds = mapRef.current.getBounds();
      return {
        minLat: bounds.getSouth(),
        minLng: bounds.getWest(),
        maxLat: bounds.getNorth(),
        maxLng: bounds.getEast()
      };
    },
    
    // Methode zum Aktualisieren des Positionsmarkers
    updatePositionMarker: (lat: number, lng: number) => {
      if (!mapRef.current) return;
      
      // Speichere die aktuelle Marker-Position
      markerPositionRef.current = [lat, lng];
      
      if (isDebug) console.log('Position des Markers aktualisiert:', { lat, lng });
      
      // Positionsmarker erstellen, falls noch nicht vorhanden
      if (!positionMarkerRef.current) {
        // Erstelle GPS-Icon
        const gpsIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: rgba(255, 0, 0, 0.5); border: 2px solid red; border-radius: 50%; width: 16px; height: 16px; transform: translate(-50%, -50%)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        
        // Marker erstellen
        positionMarkerRef.current = L.marker([lat, lng], { icon: gpsIcon }).addTo(mapRef.current);
      } else {
        // Marker verschieben
        positionMarkerRef.current.setLatLng([lat, lng]);
      }
    }
  }));

  // Polygon-Styles für die visuelle Darstellung des Polygons mit useMemo
  // Jetzt abhängig vom Schutzstatus
  const polygonOptions = useMemo(() => {
    let color: string;
    
    // Farbe basierend auf Schutzstatus bestimmen
    if (schutzstatus === 'gesetzlich geschützt') {
      color = '#ef4444'; // Rot für geschützte Flächen
    } else if (schutzstatus === 'ökologisch hochwertig') {
      color = '#eab308'; // Gelb für hochwertige Flächen
    } else {
      color = '#22c55e'; // Grün für niederwertige Flächen (Standard)
    }
    
    return {
      color: color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.7,
    };
  }, [schutzstatus]);

  // Habitat-Marker erstellen (für niedrige Zoom-Level)
  const createHabitatMarker = useCallback((habitat: Habitat) => {
    // Prüfe auf gültige Position (nicht null/undefined, nicht 0/0, nicht NaN, im gültigen Bereich)
    if (!habitat.position || 
        habitat.position[0] == null || 
        habitat.position[1] == null ||
        habitat.position[0] === 0 && habitat.position[1] === 0 ||
        isNaN(habitat.position[0]) || 
        isNaN(habitat.position[1]) ||
        Math.abs(habitat.position[0]) > 90 ||
        Math.abs(habitat.position[1]) > 180) {
      if (isDebug) console.warn('[createHabitatMarker] Ungültige Position für Marker:', habitat.id, habitat.position);
      return null;
    }
    if (isDebug) console.log('[createHabitatMarker] Erstelle Marker für Habitat:', habitat.id, 'bei Position:', habitat.position);

    // Farbe basierend auf Schutzstatus bestimmen
    let color = '#22c55e'; // Standard: Grün (niederwertig)
    
    const schutzstatus = habitat.schutzstatus || habitat.metadata?.schutzstatus;
    if (schutzstatus === 'gesetzlich geschützt') {
      color = '#ef4444'; // Rot
    } else if (schutzstatus === 'ökologisch hochwertig') {
      color = '#eab308'; // Gelb
    } else if (habitat.color) {
      color = habitat.color;
    }

    // Custom Icon mit farbigem Kreis
    const icon = L.divIcon({
      className: 'custom-habitat-marker',
      html: `<div style="
        width: 16px;
        height: 16px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    // Marker erstellen
    // WICHTIG: eigener Pane + hoher zIndexOffset, damit Marker sicher über Tiles/Overlays liegen
    const marker = L.marker([habitat.position[0], habitat.position[1]], { 
      icon,
      pane: 'habitatMarkerPane',
      zIndexOffset: 1000,
    });

    // Popup mit Habitat-Name hinzufügen
    marker.bindPopup(`<strong>${habitat.name}</strong>${schutzstatus ? `<br><span style="color:${color}">Status: ${schutzstatus}</span>` : ''}`);

    // Click-Handler für Interaktion
    if (onHabitatClick) {
      marker.on('click', () => {
        onHabitatClick(habitat.id);
      });
    }

    return marker;
  }, [onHabitatClick]);

  // Habitat-Polygon erstellen
  const createHabitatPolygon = useCallback((habitat: Habitat) => {
    if (!habitat.polygon || habitat.polygon.length < 3) return null;

    // Farbe basierend auf Schutzstatus bestimmen
    let color = '#22c55e'; // Standard: Grün (niederwertig)
    
    if (habitat.schutzstatus === 'gesetzlich geschützt') {
      color = '#ef4444'; // Rot
    } else if (habitat.schutzstatus === 'ökologisch hochwertig') {
      color = '#eab308'; // Gelb
    } else if (habitat.color) {
      // Wenn kein Schutzstatus, aber eine benutzerdefinierte Farbe vorhanden ist
      color = habitat.color;
    }

    // Den Transparenzwert berücksichtigen oder Standardwert verwenden
    const fillOpacity = habitat.transparenz !== undefined ? habitat.transparenz : 0.4;

    // Polygon-Style für das Habitat
    const options = {
      color: color,
      weight: 2,
      fillColor: color,
      fillOpacity: fillOpacity
    };

    // Polygon erstellen
    const polygon = L.polygon(habitat.polygon, options);

    // Popup mit Habitat-Name hinzufügen
    polygon.bindPopup(`<strong>${habitat.name}</strong>${habitat.schutzstatus ? `<br><span style="color:${color}">Status: ${habitat.schutzstatus}</span>` : ''}`);

    // Click-Handler für Interaktion
    if (onHabitatClick) {
      polygon.on('click', () => {
        onHabitatClick(habitat.id);
      });
    }

    return polygon;
  }, [onHabitatClick]);

  // Funktion zum Aktualisieren der Habitat-Anzeige
  const updateHabitatDisplay = useCallback(() => {
    if (!mapRef.current || habitats.length === 0) return;

    const map = mapRef.current;

    // LayerGroups sicherstellen.
    // Wichtig: LayerGroups dürfen NICHT bei jedem Effect-Rerun von der Map entfernt werden,
    // sonst kommt es zu "kurz sichtbar, dann weg" (React StrictMode / Rerender).
    if (!habitatMarkersRef.current) habitatMarkersRef.current = L.layerGroup();
    if (!habitatPolygonsRef.current) habitatPolygonsRef.current = L.layerGroup();

    // Falls LayerGroup existiert, aber (z.B. nach Cleanup) nicht mehr auf der Map liegt: wieder hinzufügen.
    if (habitatMarkersRef.current && !map.hasLayer(habitatMarkersRef.current)) {
      habitatMarkersRef.current.addTo(map);
    }
    if (habitatPolygonsRef.current && !map.hasLayer(habitatPolygonsRef.current)) {
      habitatPolygonsRef.current.addTo(map);
    }

    // Immer neu zeichnen (Habitate/Bounds ändern sich häufig)
    habitatMarkersRef.current?.clearLayers();
    habitatPolygonsRef.current?.clearLayers();

    let markerCount = 0;
    let polygonCount = 0;

    habitats.forEach(habitat => {
      const hasPolygonPoints = Boolean(habitat.polygon && habitat.polygon.length >= 3);
      const hasValidPosition = Boolean(
        habitat.position &&
          habitat.position[0] != null &&
          habitat.position[1] != null &&
          habitat.position[0] !== 0 &&
          habitat.position[1] !== 0 &&
          !isNaN(habitat.position[0]) &&
          !isNaN(habitat.position[1]) &&
          Math.abs(habitat.position[0]) <= 90 &&
          Math.abs(habitat.position[1]) <= 180
      );

      if (displayMode === 'markers') {
        if (!hasValidPosition) return;
        const marker = createHabitatMarker(habitat);
        if (!marker) return;
        habitatMarkersRef.current?.addLayer(marker);
        markerCount++;
        return;
      }

      // displayMode === 'polygons'
      if (hasPolygonPoints) {
        const polygon = createHabitatPolygon(habitat);
        if (!polygon) return;
        habitatPolygonsRef.current?.addLayer(polygon);
        polygonCount++;
        return;
      }

      // Fallback: wenn kein Polygon, aber Position vorhanden -> Marker
      if (!hasValidPosition) return;
      const marker = createHabitatMarker(habitat);
      if (!marker) return;
      habitatMarkersRef.current?.addLayer(marker);
      markerCount++;
    });

    if (isDebug) {
      console.log('Habitat-Render:', {
        mode: displayMode,
        markerCount,
        polygonCount,
        habitatsCount: habitats.length,
        markersOnMap: habitatMarkersRef.current ? map.hasLayer(habitatMarkersRef.current) : false,
        polygonsOnMap: habitatPolygonsRef.current ? map.hasLayer(habitatPolygonsRef.current) : false,
      });
    }
  }, [habitats, displayMode, createHabitatPolygon, createHabitatMarker, isDebug]);

  // Funktion zur Berechnung der Fläche eines Polygons in Quadratmetern
  // Verwendet die Geodesic-Berechnung für genaue Ergebnisse auf der Erdkugel
  const calculateArea = useCallback((polygon: L.Polygon) => {
    if (isDebug) console.log('calculateArea aufgerufen');
    try {
      const latlngs = polygon.getLatLngs()[0] as L.LatLng[];
      if (isDebug) console.log('Polygon-Punkte für Flächenberechnung:', latlngs.map(p => [p.lat, p.lng]));
      const area = L.GeometryUtil.geodesicArea(latlngs);
      if (isDebug) console.log('Berechnete Fläche:', Math.round(area), 'm²');
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
      if (isDebug) {
        console.log('Map wird initialisiert (sollte nur einmal passieren!)', {
          editMode,
          position,
          zoom,
          habitatsCount: habitats.length
        });
      }
      
      // Leaflet-Map initialisieren mit Basisoptionen
      mapRef.current = L.map(mapContainerRef.current, {
        maxZoom: 22,                 // Maximaler Zoom
        minZoom: 3,                  // Minimaler Zoom
        zoomControl: showZoomControls, // Zoom-Controls basierend auf Prop
        zoomSnap: 0.5,               // Zoom in 0.5-Schritten
        wheelPxPerZoomLevel: 120     // Mausrad-Sensitivität
      }).setView(position, zoom);

      // Eigener Pane für Habitat-Marker, damit sie garantiert über Tiles/Overlays liegen
      const habitatMarkerPane = mapRef.current.createPane('habitatMarkerPane');
      habitatMarkerPane.style.zIndex = '650';
      
      // Keine Live-Updates während Zoom; wir reagieren nur auf zoomend/moveend
      
      // Basis OpenStreetMap Layer als Grundkarte definieren
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxNativeZoom: 20,
        maxZoom: 22,
        detectRetina: true     // optional, funktioniert jetzt korrekt
      });
      // Wichtig: OSM-Layer noch nicht hinzufügen! (addTo wird erst später aufgerufen)

      // Südtiroler WMS-Layer für aktuelle Orthofotos
      let wmsLayer = null;
      try {
        wmsLayer = L.tileLayer.wms('https://geoservices.buergernetz.bz.it/mapproxy/ows', {
          layers: 'p_bz-Orthoimagery:Aerial-2023-RGB',
          format: 'image/png',
          transparent: true,
          version: '1.3.0',
          opacity: 1,
          maxNativeZoom: 20,
          maxZoom: 22,
          detectRetina: true     // optional, funktioniert jetzt korrekt
          });
        // Wichtig: WMS-Layer noch nicht hinzufügen!
        wmsLayerRef.current = wmsLayer;
      } catch (error) {
        console.error("Fehler beim Laden des WMS-Layers:", error);
      }

      // Initial WMS-Layer (Satellitenbild) als Standard hinzufügen, wenn verfügbar
      // Ansonsten OSM als Fallback verwenden
      if (wmsLayerRef.current) {
        wmsLayerRef.current.addTo(mapRef.current);
      } else {
        // Fallback zu OSM, wenn WMS nicht geladen werden kann
        osmLayer.addTo(mapRef.current);
      }

      // FeatureGroup für gezeichnete Elemente erstellen
      // Diese Gruppe enthält alle Polygone und andere gezeichnete Elemente
      drawnItemsRef.current = new L.FeatureGroup();
      mapRef.current.addLayer(drawnItemsRef.current);

      // Positionsmarker hinzufügen, wenn gewünscht
      if (showPositionMarker) {
        // WICHTIG: Initial keinen Marker erstellen, dieser wird durch updatePositionMarker gesetzt
        // Wir setzen die Marker-Position nicht auf die map.position, sondern warten auf einen
        // expliziten updatePositionMarker-Aufruf
        
        // Bei initialer Erstellung setzen wir eine Flagge, damit im nächsten Effekt
        // bekannt ist, dass wir dem mapStart sind
      }

      // Initialen Polygon hinzufügen, wenn vorhanden (z.B. beim Bearbeiten eines bestehenden Polygons)
      if (initialPolygon.length > 0) {
        polygonLayerRef.current = L.polygon(initialPolygon, polygonOptions);
        drawnItemsRef.current.addLayer(polygonLayerRef.current);
      }

      // Layer Control hinzufügen für das Umschalten zwischen verschiedenen Kartentypen
      const baseMaps: Record<string, L.Layer> = {
        "OpenStreetMap": osmLayer,
      };

      // WMS-Layer als eigene Basiskarte hinzufügen (nicht als Overlay), wenn er erfolgreich geladen wurde
      if (wmsLayerRef.current) {
        baseMaps["Südtiroler Orthofoto 2023"] = wmsLayerRef.current;
      }
      
      // Layer-Control mit den Basiskarten hinzufügen
      L.control.layers(baseMaps, {}).addTo(mapRef.current);

      // Event-Listener für Positionsänderungen
      // Wird ausgelöst, wenn der Nutzer die Karte verschiebt
      // Nur am Ende der Bewegung melden (statt permanent während move)
      mapRef.current.on('moveend', () => {
        if (mapRef.current) {
          const newCenter = mapRef.current.getCenter();
          onCenterChange([newCenter.lat, newCenter.lng]);
        }
      });
      
      // Event-Listener für Klicks auf die Karte werden bei der Initialisierung hinzugefügt
      // Diese werden in einem separaten useEffect-Hook verwaltet, siehe unten
      
      // Event-Listener für Zoom-Änderungen
      // Wird ausgelöst, wenn der Nutzer den Zoom-Level ändert
      // EIN zoomend-Listener für Parent-Callback
      mapRef.current.on('zoomend', () => {
        if (mapRef.current && onZoomChange) {
          const newZoom = mapRef.current.getZoom();
          if (isDebug) console.log(`Zoom-Änderung erkannt: ${newZoom}`);
          onZoomChange(newZoom);
        }
      });

      if (isDebug) console.log('Map initialisiert');
      
      // Initial Habitate anzeigen, wenn vorhanden
      if (habitats.length > 0) updateHabitatDisplay();

      // Map als bereit markieren
      setIsMapReady(true);
    }

    // Cleanup-Funktion: Entfernt die Karte, wenn die Komponente unmontiert wird
    return () => {
      if (mapRef.current !== null) {
        // Leaflet sauber teardownen (wichtig für React StrictMode)
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }
      drawnItemsRef.current = null;
      polygonLayerRef.current = null;
      activeDrawHandlerRef.current = null;
      positionMarkerRef.current = null;
      resetPolygonMarkerRef.current = null;
      habitatPolygonsRef.current = null;
      habitatMarkersRef.current = null;
      setIsMapReady(false);
    };
  }, []);

  // Marker je nach Einstellung anzeigen/verstecken
  useEffect(() => {
    if (!mapRef.current || !positionMarkerRef.current) return;
    
    if (showPositionMarker) {
      // Falls der Marker nicht auf der Karte ist, hinzufügen
      if (!mapRef.current.hasLayer(positionMarkerRef.current)) {
        positionMarkerRef.current.addTo(mapRef.current);
      }
    } else {
      // Falls der Marker auf der Karte ist, entfernen
      if (mapRef.current.hasLayer(positionMarkerRef.current)) {
        positionMarkerRef.current.remove();
      }
    }
  }, [showPositionMarker]);

  // Funktion zum expliziten Beenden des Zeichnungsmodus
  // Wird aufgerufen, wenn der Benutzer den Zeichnungsmodus verlässt oder wenn ein Polygon abgeschlossen wird
  const cancelDrawing = useCallback(() => {
    if (isDebug) console.log('Zeichnungsmodus wird explizit beendet');
    
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
    if (!activeDrawHandlerRef.current || !onPolygonDraftChange) return;
    
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
          if (isDebug) console.log('Extrahierte Punkte während des Zeichnens:', currentPoints.length);
          onPolygonDraftChange(currentPoints);
        }
      }
    } catch (error) {
      console.error('Fehler beim Extrahieren der Zeichnungspunkte:', error);
    }
  }, [onPolygonDraftChange]);

  // UI-Helfer: "Neu beginnen" Marker in der Polygon-Mitte anzeigen (nur wenn Polygon existiert und editMode aktiv ist).
  const updateResetPolygonMarker = useCallback(() => {
    if (!mapRef.current) return;

    const shouldShow =
      Boolean(onResetPolygon) &&
      Boolean(editMode) &&
      Boolean(polygonLayerRef.current) &&
      initialPolygon.length >= 3;

    if (!shouldShow) {
      if (resetPolygonMarkerRef.current) {
        resetPolygonMarkerRef.current.remove();
        resetPolygonMarkerRef.current = null;
      }
      return;
    }

    const polygon = polygonLayerRef.current;
    if (!polygon) return;

    const center = polygon.getBounds().getCenter();
    const icon = L.divIcon({
      className: 'ns-reset-polygon-icon',
      html: `
        <button
          type="button"
          aria-label="Umriss neu beginnen"
          style="
            pointer-events:auto;
            background: rgba(255,255,255,0.95);
            border: 1px solid rgba(0,0,0,0.15);
            border-radius: 9999px;
            padding: 6px 10px;
            font-size: 12px;
            font-weight: 600;
            box-shadow: 0 8px 20px rgba(0,0,0,0.18);
          "
        >
          Neu beginnen
        </button>
      `,
      iconSize: [110, 30],
      iconAnchor: [55, 15]
    });

    if (!resetPolygonMarkerRef.current) {
      resetPolygonMarkerRef.current = L.marker(center, {
        icon,
        interactive: true,
        // Stelle sicher, dass der Button über dem Polygon liegt
        zIndexOffset: 1000
      }).addTo(mapRef.current);

      resetPolygonMarkerRef.current.on('add', () => {
        const el = resetPolygonMarkerRef.current?.getElement();
        if (!el) return;
        L.DomEvent.disableClickPropagation(el);
        L.DomEvent.disableScrollPropagation(el);

        // WICHTIG: Click direkt auf dem Button abfangen.
        // Bei divIcon kann der Klick sonst auf der Karte "verpuffen" (z.B. wenn Leaflet den Button nicht als Marker-Click interpretiert).
        const btn = el.querySelector('button');
        if (!btn) return;

        // Cursor-Feedback
        (btn as HTMLElement).style.cursor = 'pointer';

        // Bereits vorhandene Handler entfernen und neu registrieren
        L.DomEvent.off(btn);
        L.DomEvent.on(btn, 'click', (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          onResetPolygon?.();
        });
      });

      // Fallback: Klick auf Marker-Fläche (nicht Button) ebenfalls unterstützen
      resetPolygonMarkerRef.current.on('click', (e: any) => {
        if (e?.originalEvent) {
          e.originalEvent.preventDefault?.();
          e.originalEvent.stopPropagation?.();
        }
        onResetPolygon?.();
      });
    } else {
      resetPolygonMarkerRef.current.setLatLng(center);
      resetPolygonMarkerRef.current.setIcon(icon);

      // Wenn der Marker schon existiert, kann das DOM-Element bereits da sein: Button-Handler refreshen
      const el = resetPolygonMarkerRef.current.getElement();
      const btn = el?.querySelector('button');
      if (btn) {
        L.DomEvent.off(btn);
        L.DomEvent.on(btn, 'click', (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          onResetPolygon?.();
        });
      }
    }
  }, [editMode, initialPolygon.length, onResetPolygon]);

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
      mapRef.current.off(L.Draw.Event.DRAWVERTEX);
    }

    if (editMode) {
      // ---- ZEICHENMODUS ----
      
      // Navigationsmöglichkeiten deaktivieren für präzises Zeichnen
      if (mapRef.current) {
        mapRef.current.dragging.disable();
        mapRef.current.touchZoom.disable();
        mapRef.current.doubleClickZoom.disable();
        mapRef.current.scrollWheelZoom.disable();
        mapRef.current.boxZoom.disable();
        mapRef.current.keyboard.disable();
      }
      
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
                    points[0]?.[0] === points[points.length-1]?.[0] && 
                    points[0]?.[1] === points[points.length-1]?.[1] ? 'JA' : 'NEIN');
                  
                  if (onPolygonChange) {
                    onPolygonChange(points);
                  }

                  // "Neu beginnen" Marker aktualisieren (Polygon existiert jetzt)
                  updateResetPolygonMarker();

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

                  // Marker-Position nach Edit aktualisieren
                  updateResetPolygonMarker();
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

              // Draft-Updates: nach jedem Vertex die aktuelle Punktliste melden.
              // Wichtig: NICHT `onPolygonChange` verwenden, sonst wird `initialPolygon` im Parent aktualisiert
              // und Leaflet.Draw wird durch den editMode-Effekt unterbrochen.
              if (mapRef.current) {
                mapRef.current.on(L.Draw.Event.DRAWVERTEX, extractCurrentDrawingPoints);
              }
            }
          } else {
            // Bestehendes Polygon bearbeiten
            if (polygonLayerRef.current && polygonLayerRef.current.editing) {
              polygonLayerRef.current.editing.enable();
              updateResetPolygonMarker();
            }
          }
        } catch (error) {
          console.error('Fehler beim Aktivieren des Zeichenmodus:', error);
        }
      }
    } else {
      // ---- NAVIGATIONSMODUS ----
      
      // Alle Navigationsmöglichkeiten aktivieren
      if (mapRef.current) {
        mapRef.current.dragging.enable();
        mapRef.current.touchZoom.enable();
        mapRef.current.doubleClickZoom.enable();
        mapRef.current.scrollWheelZoom.enable();
        mapRef.current.boxZoom.enable();
        mapRef.current.keyboard.enable();
      }
      
      // Cursor zurücksetzen
      if (mapContainerRef.current) {
        mapContainerRef.current.style.cursor = '';
      }
      
      // Bearbeitungsmodus deaktivieren, falls aktiv
      if (polygonLayerRef.current && polygonLayerRef.current.editing) {
        polygonLayerRef.current.editing.disable();
      }
    }
  }, [editMode, initialPolygon, polygonOptions, onPolygonChange, onAreaChange, calculateArea, extractCurrentDrawingPoints, updateResetPolygonMarker]);

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

  // DEAKTIVIERT: Automatische Position/Zoom-Updates verhindern Map-Reset beim Schrittwechsel
  // useEffect(() => {
  //   if (mapRef.current) {
  //     const currentZoom = mapRef.current.getZoom();
  //     console.log(`Position/Zoom-Update: aktueller Zoom=${currentZoom}, neuer Zoom=${zoom}`);
  //     
  //     if (currentZoom !== zoom) {
  //       mapRef.current.setView(position, zoom);
  //       // Nach Zoom-Änderung die Habitat-Anzeige aktualisieren
  //       updateHabitatDisplay();
  //     }
  //     
  //     // ENTFERNT: Positionsmarker wird NICHT mehr bei Map-Position-Updates angepasst
  //     // Die Position des Markers wird nur durch explizite updatePositionMarker-Aufrufe geändert
  //   }
  // }, [position, zoom, updateHabitatDisplay]);

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
      updateResetPolygonMarker();
      
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
          console.log('Registriere zusätzliche Editing-Event-Listeners');
          
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
    if (initialPolygon.length === 0) {
      // Polygon entfernt -> Marker entfernen
      updateResetPolygonMarker();
    }
  }, [initialPolygon, editMode, polygonOptions, onAreaChange, calculateArea, updateResetPolygonMarker]);

  // Klick-Handler für die Karte aktualisieren, wenn sich onClick ändert
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Handler-Funktion, die wir für Cleanup wiederverwenden können
    const clickHandler = (e: any) => {
      // Prüfen, ob ein Klick auf ein Element des Habitat-Layers erfolgt ist
      // Wenn nicht, den allgemeinen onClick-Handler aufrufen
      console.log('Map-Click erkannt:', e.latlng);
      
      // Verzögerung hinzufügen, um sicherzustellen, dass der Event nicht von einem Habitat-Klick stammt
      // (Leaflet löst den Event für beide aus, aber der Habitat-Click-Handler wird zuerst ausgeführt)
      setTimeout(() => {
        if (onClick) onClick();
      }, 10);
    };
    
    // Bestehende Click-Listener entfernen (ohne spezifischen Parameter)
    mapRef.current.off('click');
    
    // Nur wenn onClick definiert ist, den neuen Handler hinzufügen
    if (onClick) {
      console.log('Registriere Map-Click-Handler:', new Date().toISOString());
      mapRef.current.on('click', clickHandler);
    }
    
    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', clickHandler);
      }
    };
  }, [onClick]);

  // Habitat-Anzeige aktualisieren, wenn sich habitats ändert oder Map geladen ist
  useEffect(() => {
    if (mapRef.current && habitats.length > 0) {
      if (isDebug) {
        console.log('Habitat-Daten geändert oder Map geladen:', {
          habitatsAnzahl: habitats.length,
          aktuellerZoom: mapRef.current.getZoom(),
          zeitpunkt: new Date().toISOString(),
          habitatDaten: habitats.slice(0, 3).map(h => ({
            id: h.id,
            name: h.name,
            polygonPunkte: h.polygon?.length || 0
          }))
        });
      }
      updateHabitatDisplay();
    }
  }, [habitats, displayMode, updateHabitatDisplay, isDebug]);

  return (
    <>
      {/* Haupt-Container für die Leaflet-Karte */}
      <div ref={mapContainerRef} className="leaflet-container" style={{ width: '100%', height: '100%', position: 'relative', zIndex: 100, overflow: 'hidden' }} />
      
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

        /* Habitat-Marker (DivIcon) - Wrapper transparent, damit nur der farbige Kreis sichtbar ist */
        .custom-habitat-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </>
  );
});

// Name für debugging in React DevTools setzen
MapNoSSR.displayName = 'MapNoSSR';

// Komponente mit React.memo optimieren, um unnötige Renderings zu vermeiden
export default React.memo(MapNoSSR);

