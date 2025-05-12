# Refactoring-Plan für MapNoSSR-Komponente

Die `MapNoSSR.tsx`-Komponente ist mit über 1000 Zeilen Code zu groß und komplex. Hier ist ein strukturierter Plan, um diese in kleinere, wiederverwendbare Module aufzuteilen.

## 1. Neue Dateistruktur

```
src/components/map/
├── MapNoSSR.tsx               # Hauptkomponente (stark reduziert)
├── types/                     # Typdefinitionen
│   ├── index.ts               # Export aller Typen
│   ├── MapTypes.ts            # Grundlegende Map-Typen
│   ├── LeafletTypes.ts        # Leaflet-spezifische Typen
│   └── HabitatTypes.ts        # Habitat-Typen
├── hooks/                     # Custom Hooks für die Map-Funktionalität
│   ├── useMapInitialization.ts # Map-Initialisierung
│   ├── usePolygonDrawing.ts    # Polygon-Zeichnung
│   ├── useHabitatDisplay.ts    # Anzeige von Habitaten
│   ├── useMapEvents.ts         # Event-Handling
│   └── useAreaCalculation.ts   # Flächenberechnung
├── utils/                     # Hilfsfunktionen
│   ├── calculateArea.ts       # Flächenberechnung
│   ├── createHabitatPolygon.ts # Habitat-Polygon-Erstellung
│   └── mapStyles.ts           # Styling-Funktionen
└── components/                # UI-Komponenten für die Karte
    ├── MapContainer.tsx       # Container-Komponente
    ├── MapControls.tsx        # Zoom-Controls, etc.
    └── MapStyles.tsx          # Styled-Components für die Karte
```

## 2. Aufteilung der Funktionalität

### 2.1 Typdefinitionen (types/)

Alle TypeScript-Interfaces und Types in eigene Dateien auslagern:

**MapTypes.ts**
- `MapNoSSRProps` Interface
- `MapNoSSRHandle` Interface

**LeafletTypes.ts**
- Leaflet-spezifische Typerweiterungen
- `DrawOptions` Type

**HabitatTypes.ts**
- `Habitat` Interface

### 2.2 Hooks (hooks/)

Die komplexe Logik in Custom Hooks auslagern:

**useMapInitialization.ts**
```typescript
export function useMapInitialization(
  containerRef: React.RefObject<HTMLDivElement>,
  position: L.LatLngExpression,
  zoom: number,
  showZoomControls: boolean,
) {
  const mapRef = useRef<L.Map | null>(null);
  // Rest der Initialisierungslogik...
  
  return { mapRef, /* andere relevante Refs */ };
}
```

**usePolygonDrawing.ts**
```typescript
export function usePolygonDrawing(
  mapRef: React.RefObject<L.Map>,
  editMode: boolean,
  initialPolygon: Array<[number, number]>,
  onPolygonChange?: (polygonPoints: Array<[number, number]>) => void,
) {
  // Polygon-Zeichnungs-Logik...
  
  return { 
    polygonLayerRef,
    drawPolygon,
    cancelDrawing,
    /* weitere relevante Funktionen und Refs */
  };
}
```

**useHabitatDisplay.ts**
```typescript
export function useHabitatDisplay(
  mapRef: React.RefObject<L.Map>,
  habitats: Habitat[],
  onHabitatClick?: (habitatId: string) => void,
) {
  // Habitat-Anzeige-Logik...
  
  return {
    updateHabitatDisplay,
    habitatPolygonsRef,
  };
}
```

### 2.3 Hilfsfunktionen (utils/)

Extrahierung von reinen Funktionen:

**calculateArea.ts**
```typescript
export function calculateArea(polygon: L.Polygon): number {
  // Flächenberechnung...
  return area;
}
```

**createHabitatPolygon.ts**
```typescript
export function createHabitatPolygon(
  habitat: Habitat,
  onHabitatClick?: (habitatId: string) => void,
): L.Polygon | null {
  // Polygon-Erstellung...
  return polygon;
}
```

### 2.4 Neue vereinfachte MapNoSSR-Komponente

```typescript
const MapNoSSR = forwardRef<MapNoSSRHandle, MapNoSSRProps>((props, ref) => {
  const { 
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
    showPositionMarker = true,
    habitats = [],
    onHabitatClick,
    onClick,
    schutzstatus = 'niederwertig'
  } = props;

  // DOM-Referenzen
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Hooks für die verschiedenen Funktionalitäten verwenden
  const { mapRef, wmsLayerRef /* etc. */ } = useMapInitialization(mapContainerRef, position, zoom, showZoomControls);
  
  const { polygonLayerRef, drawPolygon, cancelDrawing } = usePolygonDrawing(
    mapRef, 
    editMode, 
    initialPolygon, 
    onPolygonChange
  );
  
  const { updateHabitatDisplay, habitatPolygonsRef } = useHabitatDisplay(
    mapRef, 
    habitats, 
    onHabitatClick
  );
  
  // Weitere Hooks für Events, Positionsmarker etc.
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    centerMap: (lat, lng, newZoom) => {/* ... */},
    getCurrentPolygonPoints: () => {/* ... */}
  }));
  
  // JSX für die Karte - deutlich vereinfacht
  return (
    <>
      <div 
        ref={mapContainerRef} 
        className="leaflet-container" 
        style={{ width: '100%', height: '100%', position: 'relative', zIndex: 9999, overflow: 'hidden' }} 
      />
      <MapStyles editMode={editMode} />
    </>
  );
});
```

## 3. Styling in eigene Komponente auslagern

**MapStyles.tsx**
```typescript
interface MapStylesProps {
  editMode: boolean;
}

export function MapStyles({ editMode }: MapStylesProps) {
  return (
    <style jsx global>{`
      /* CSS für die Karte */
      .leaflet-draw.leaflet-control { display: none !important; }
      /* Weitere Styles... */
    `}</style>
  );
}
```

## 4. Vorteile der Refaktorierung

1. **Bessere Testbarkeit**: Kleinere Funktionen sind einfacher zu testen
2. **Verbesserte Wiederverwendbarkeit**: Hooks können in anderen Komponenten verwendet werden
3. **Einfachere Wartung**: Probleme können gezielter behoben werden
4. **Bessere Lesbarkeit**: Die Hauptkomponente wird deutlich schlanker
5. **Code-Isolation**: Verwandte Funktionalität ist zusammengefasst

## 5. Implementierungsreihenfolge

1. Typen extrahieren
2. Hilfsfunktionen auslagern
3. Hooks erstellen
4. Styling-Komponente erstellen
5. Hauptkomponente vereinfachen
6. Tests sicherstellen

Diese Refaktorierung kann inkrementell durchgeführt werden, indem zunächst die einfacheren Teile ausgelagert werden (Typen, Utilities) und dann schrittweise die komplexeren Teile in eigene Hooks extrahiert werden. 