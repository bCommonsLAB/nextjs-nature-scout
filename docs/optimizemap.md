# Optimierung der Kartenansicht und des Standortbestimmungs-Workflows

Dieses Dokument beschreibt die schrittweise Implementierung von Verbesserungen an der Kartenansicht und am Workflow zur Standortbestimmung im Nature-Scout Projekt.

## Ziele

1. Verbesserung des Zoom-Verhaltens der Karte
2. Umgestaltung des Workflows zur Standortbestimmung
3. Verbesserung der Benutzerführung durch klare Anleitungen
4. Implementierung eines verbesserten Polygonzeichnen-Modus

## 1. Phase: Benutzeroberflächenänderungen (UI)

In dieser Phase konzentrieren wir uns auf Änderungen an der Benutzeroberfläche, ohne die zugrundeliegende Kartenlogik zu modifizieren.

### 1.1 Neue Benutzerführung

1. **Willkommensnachricht einführen**
   - Hinzufügen einer Begrüßungsmeldung, die den Benutzer über den Prozess informiert:
   ```jsx
   <div className="rounded-lg bg-blue-50 p-4 mb-4 text-sm">
     <h3 className="font-medium mb-2">Willkommen bei der Standortbestimmung</h3>
     <p>Falls notwendig, verschieben Sie den Kartenausschnitt zu Ihrem aktuellen Standort und zoomen Sie so weit wie möglich hinein. Wenn Sie bereit sind, klicken Sie auf "Habitatumriss erfassen", um fortzufahren.</p>
   </div>
   ```

2. **Umbenennung des "Fläche zeichnen"-Schalters**
   - Ändern von "Fläche zeichnen" zu "Habitatumriss erfassen"
   - Anpassen des zugehörigen Labels

3. **Hinzufügen eines Anleitungsbereichs unter dem Schalter**
   - Dieser Bereich ändert seinen Inhalt je nach aktuellem Modus (normal/Zeichenmodus)
   - Im Zeichenmodus:
   ```jsx
   <div className="bg-yellow-50 p-3 rounded-md mt-2">
     <p className="text-sm">Zeichnen Sie jetzt eine Umrisslinie um das Habitat, einfach durch Auswahl von Eckpunkten im Uhrzeigersinn. Wenn Sie fertig sind, klicken Sie unten auf "Umriss fertig".</p>
   </div>
   ```

4. **Neuer Button "Umriss fertig"**
   - Wird nur angezeigt, wenn ein Polygon gezeichnet wurde und der Zeichenmodus aktiv ist
   ```jsx
   {editMode && polygonPoints.length > 0 && (
     <Button 
       className="w-full mt-4" 
       onClick={handlePolygonComplete}
     >
       Umriss fertig
     </Button>
   )}
   ```

### 1.2 Statusmanagement erweitern

1. **Neue Status hinzufügen**
   ```jsx
   const [uiState, setUiState] = useState<'welcome' | 'drawing' | 'complete'>('welcome');
   const [showInstructions, setShowInstructions] = useState<boolean>(true);
   ```

2. **Funktionen zum Statuswechsel implementieren**
   ```jsx
   const startDrawingMode = () => {
     setEditMode(true);
     setUiState('drawing');
   };

   const handlePolygonComplete = () => {
     // Berechne Mittelpunkt des Polygons
     if (polygonPoints.length > 0) {
       const centerPoint = calculatePolygonCenter(polygonPoints);
       setCurrentPosition(centerPoint);
       setInitialPosition(centerPoint);
       // Geodaten für den Mittelpunkt abrufen
       getGeoDataFromCoordinates(centerPoint[0], centerPoint[1]);
       // Metadaten aktualisieren
       setMetadata(prevMetadata => ({
         ...prevMetadata,
         latitude: centerPoint[0],
         longitude: centerPoint[1],
       }));
     }
     setUiState('complete');
     setEditMode(false); // Zeichenmodus beenden
   };

   // Hilfsfunktion zur Berechnung des Mittelpunkts
   const calculatePolygonCenter = (points: Array<[number, number]>): [number, number] => {
     const latSum = points.reduce((sum, point) => sum + point[0], 0);
     const lngSum = points.reduce((sum, point) => sum + point[1], 0);
     return [latSum / points.length, lngSum / points.length];
   };
   ```

## 2. Phase: Kartenlogikänderungen

In dieser Phase nehmen wir behutsam Änderungen an der Kartenlogik vor.

### 2.1 Korrektes Standortverhalten implementieren

1. **Anpassen der Initialisierungslogik**
   - Überarbeiten des useEffect-Hooks, der die GPS-Position abruft:
   ```jsx
   useEffect(() => {
     // Nur GPS verwenden, wenn keine Koordinaten gesetzt sind
     if (!metadata.latitude && !metadata.longitude) {
       navigator.geolocation.getCurrentPosition(
         (position) => {
           const { latitude, longitude } = position.coords;
           setCurrentPosition([latitude, longitude]);
           setInitialPosition([latitude, longitude]);
           setMetadata(prevMetadata => ({
             ...prevMetadata,
             latitude,
             longitude
           }));
           getGeoDataFromCoordinates(latitude, longitude);
         },
         () => {
           // Bei Fehler werden die Default-Werte verwendet (Südtirol)
           const defaultLat = 46.724212;
           const defaultLng = 11.65555;
           setCurrentPosition([defaultLat, defaultLng]);
           setInitialPosition([defaultLat, defaultLng]);
           getGeoDataFromCoordinates(defaultLat, defaultLng);
         }
       );
     } else {
       // Vorhandene Koordinaten aus Metadaten verwenden
       setCurrentPosition([metadata.latitude, metadata.longitude]);
       setInitialPosition([metadata.latitude, metadata.longitude]);
       getGeoDataFromCoordinates(metadata.latitude, metadata.longitude);
     }
   }, []); // Leeres Dependency Array - wird nur beim Mount ausgeführt
   ```

### 2.2 Markierung des Polygonmittelpunkts

1. **Markierungsfunktionalität hinzufügen**
   - Anpassen von MapNoSSR.tsx, um einen Marker an der Mittelpunktposition zu platzieren:
   ```jsx
   // In der MapNoSSR-Komponente
   const markerRef = useRef<L.Marker | null>(null);

   // Nach dem Berechnen des Polygonmittelpunkts
   if (polygonPointsRef.current && polygonPointsRef.current.length > 0 && mapRef.current) {
     // Alten Marker entfernen, falls vorhanden
     if (markerRef.current) {
       mapRef.current.removeLayer(markerRef.current);
     }
     
     // Mittelpunkt berechnen
     const points = polygonPointsRef.current;
     const latSum = points.reduce((sum, point) => sum + point[0], 0);
     const lngSum = points.reduce((sum, point) => sum + point[1], 0);
     const centerPoint: [number, number] = [latSum / points.length, lngSum / points.length];
     
     // Marker platzieren
     markerRef.current = L.marker(centerPoint).addTo(mapRef.current);
   }
   ```

2. **Sichtbarkeit des Polygons beim Herauszoomen gewährleisten**
   - Anpassen der Polygon-Optionen in MapNoSSR.tsx:
   ```jsx
   polygonLayerRef.current = L.polygon(initialPolygon, {
     color: '#3388ff',
     weight: 3,
     opacity: 0.8,
     dashArray: '5, 10', // Gestrichelte Linie
     fillOpacity: 0.2, // Leicht erhöhte Deckkraft
     fillColor: '#3388ff' // Explizite Füllfarbe
   });
   ```

### 2.3 Verbessern des Zoom-Verhaltens

1. **Zoom-Verhalten optimieren**
   - Anpassen der Map-Initialisierung, um bessere Zoom-Kontrolle zu ermöglichen:
   ```jsx
   mapRef.current = L.map(mapContainerRef.current, {
     maxZoom: 22, // Höheren Zoom-Level ermöglichen
     minZoom: 3,
     zoomControl: true, // Zoom-Kontrolle aktivieren
     zoomSnap: 0.5, // Feinere Zoom-Stufen
     wheelPxPerZoomLevel: 120 // Empfindlichkeit beim Mausradzoomen anpassen
   }).setView(position, zoom);
   ```

2. **Sicherstellen, dass alle Kartenebenen hohe Zoom-Level unterstützen**
   - Konfigurieren aller Tile-Layer, um hohe Zoom-Level zu unterstützen:
   ```jsx
   // OpenStreetMap Layer
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
     attribution: '&copy; OpenStreetMap contributors',
     maxZoom: 19 // Maximaler Zoom-Level für OSM
   }).addTo(mapRef.current);

   // WMS-Layer anpassen
   wmsLayerRef.current = L.tileLayer.wms('https://geoservices.buergernetz.bz.it/mapproxy/ows', {
     layers: 'p_bz-Orthoimagery:Aerial-2023-RGB',
     format: 'image/png',
     transparent: true,
     version: '1.3.0',
     opacity: 0.7,
     attribution: '&copy; Autonome Provinz Bozen - Südtirol',
     maxZoom: 20 // Maximaler Zoom-Level für WMS
   }).addTo(mapRef.current);
   ```

## Implementierungsplan

### Schritt 1: UI-Änderungen
1. Willkommensnachricht hinzufügen
2. Labels und Buttons anpassen
3. Statusmanagement erweitern
4. UI-Logik für die verschiedenen Zustände implementieren

### Schritt 2: Kartenlogik
1. GPS-Initialisierung anpassen
2. Markierungsfunktionalität hinzufügen
3. Polygon-Sichtbarkeit verbessern
4. Zoom-Verhalten optimieren

### Schritt 3: Testen
1. Testen der UI ohne Kartenänderungen
2. Testen der Kartenänderungen einzeln
3. Integrationstest des Gesamtsystems

### Schritt 4: Fehlerbehebung
1. Probleme mit der Kartenlogik isolieren
2. UI-Probleme beheben
3. Finale Anpassungen vornehmen

## Vorgehensweise bei Problemen

Bei auftretenden Problemen sollten wir folgendes beachten:
1. Änderungen in kleinen, testbaren Schritten vornehmen
2. Nach jeder Änderung testen
3. Bei Problemen mit der Kartenlogik, die vorherige Version wiederherstellen und das Problem isolieren
4. Nur eine Kartenkomponente gleichzeitig ändern
5. Alle Änderungen dokumentieren 