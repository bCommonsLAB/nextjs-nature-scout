# Admin Bild-Galerie

## Übersicht

Die Admin-Bild-Galerie unter `/admin/images` ermöglicht es Administratoren, alle Bilder im Azure Storage zu verwalten und zu reparieren. Die Galerie zeigt nur die Low-Resolution-Bilder an und ermöglicht die interaktive Bearbeitung einzelner Bilder.

## Funktionen

### 1. Bild-Galerie anzeigen
- **URL**: `http://localhost:3000/admin/images`
- **Zugriff**: Nur für Administratoren
- **Anzeige**: Nur Low-Resolution-Bilder (für bessere Performance)

### 2. Such- und Filterfunktionen
- **Suche**: Nach Dateinamen filtern
- **Sortierung**: Nach Name, Datum oder Größe
- **Reihenfolge**: Aufsteigend oder absteigend
- **Ansicht**: Raster- oder Listenansicht

### 3. Interaktive Bildbearbeitung
- **Einzelbild-Editor**: Modal-Dialog für Bildbearbeitung
- **Manuelle Rotation**: Links/Rechts-Drehung in 90°-Schritten
- **Live-Vorschau**: Sofortige Anzeige der Rotation
- **Speichern**: Original- und Low-Res-Bild werden gleichzeitig rotiert

## Technische Implementierung

### Frontend-Komponenten

#### Hauptseite (`src/app/admin/images/page.tsx`)
- React-Komponente mit TypeScript
- Verwendet Shadcn UI-Komponenten (Dialog, Button, etc.)
- Responsive Design mit Tailwind CSS

#### Features:
- **Modal-Dialog**: Interaktive Bildbearbeitung
- **State Management**: React Hooks für UI-Zustand
- **Live-Vorschau**: CSS-Transformationen für Rotation
- **Error Handling**: Benutzerfreundliche Fehlermeldungen

### Backend-APIs

#### 1. Bilder laden (`/api/admin/images`)
```typescript
GET /api/admin/images
```
- Lädt alle Bilder aus Azure Storage
- Gruppiert Original- und Low-Res-Bilder in Paare
- Liefert Metadaten (Größe, Datum, URLs)

#### 2. Einzelbild rotieren (`/api/admin/images/rotate`)
```typescript
POST /api/admin/images/rotate
{
  "imageUrl": "https://...",
  "rotationAngle": 90
}
```
- Rotiert ein einzelnes Bild
- Verarbeitet sowohl Original- als auch Low-Res-Versionen
- Verwendet Sharp für Bildverarbeitung

### Azure Storage Integration

#### Erweiterte AzureStorageService
```typescript
async getStoredImages(): Promise<Array<{
  url: string;
  filename: string;
  size: number;
  lastModified: string;
}>>
```

#### Features:
- **Blob-Auflistung**: Alle Bilder im Upload-Verzeichnis
- **Metadaten-Extraktion**: Größe und Änderungsdatum
- **URL-Generierung**: Vollständige URLs für Bilder

## Sicherheit

### Authentifizierung
- **Session-basiert**: NextAuth.js Integration
- **Admin-Berechtigung**: Nur Benutzer mit `role: 'admin'`
- **API-Schutz**: Alle Endpunkte geschützt

### Validierung
- **Input-Validierung**: Rotationswinkel (90°, 180°, 270°)
- **URL-Validierung**: Sichere Dateiname-Extraktion
- **Error Handling**: Umfassende Fehlerbehandlung

## Benutzeroberfläche

### Layout
1. **Header**: Titel und Aktualisieren-Button
2. **Filter-Bereich**: Suche, Sortierung, Ansicht
3. **Statistiken**: Übersicht über Bilder
4. **Galerie**: Grid- oder Listenansicht
5. **Modal-Dialog**: Bildbearbeitung

### Interaktionen
- **Bild öffnen**: Klick auf Bild öffnet Editor
- **Rotation**: Links/Rechts-Buttons für 90°-Drehung
- **Live-Vorschau**: Sofortige Anzeige der Änderungen
- **Speichern**: Button zum Speichern der Rotation
- **Abbrechen**: Schließt Modal ohne Änderungen

## Workflow

### 1. Bilder laden
1. Admin öffnet `/admin/images`
2. Frontend lädt automatisch alle Bilder
3. Bilder werden in Paare gruppiert
4. Low-Res-Versionen werden angezeigt

### 2. Bild bearbeiten
1. Admin klickt auf ein Bild
2. Modal-Dialog öffnet sich mit Bildvorschau
3. Admin rotiert das Bild mit Links/Rechts-Buttons
4. Live-Vorschau zeigt die Rotation sofort
5. Admin klickt "Speichern" wenn zufrieden
6. Backend verarbeitet Original- und Low-Res-Bild
7. Erfolgsmeldung wird angezeigt

### 3. Fehlerbehandlung
- **Netzwerkfehler**: Automatischer Retry
- **Berechtigungsfehler**: Redirect zu Login
- **Verarbeitungsfehler**: Detaillierte Fehlermeldung

## Benutzerfreundlichkeit

### Modal-Dialog Features
- **Große Vorschau**: Maximale Bildgröße für bessere Sichtbarkeit
- **Smooth Animation**: CSS-Transitions für Rotation
- **Intuitive Steuerung**: Klare Buttons für Links/Rechts
- **Status-Anzeige**: Aktueller Rotationswinkel
- **Speichern-Button**: Nur aktiv wenn Rotation > 0°

### Responsive Design
- **Mobile-freundlich**: Touch-optimierte Buttons
- **Tablet-optimiert**: Mittlere Bildgrößen
- **Desktop**: Große Vorschau und präzise Steuerung

## Performance-Optimierungen

### Frontend
- **Lazy Loading**: Bilder werden bei Bedarf geladen
- **CSS-Transformationen**: Hardware-beschleunigte Rotation
- **Modal-Performance**: Effiziente React-Rendering

### Backend
- **Streaming**: Große Dateien werden gestreamt
- **Sharp-Optimierung**: Effiziente Bildverarbeitung
- **Error Recovery**: Robuste Fehlerbehandlung

## Wartung und Monitoring

### Logging
- **API-Calls**: Alle Anfragen werden geloggt
- **Fehler**: Detaillierte Fehlerprotokolle
- **Performance**: Verarbeitungszeiten werden gemessen

### Monitoring
- **Speicherverbrauch**: Überwachung der Azure Storage-Nutzung
- **API-Performance**: Response-Zeiten und Fehlerraten
- **Benutzeraktivität**: Admin-Aktionen werden protokolliert

## Zukünftige Erweiterungen

### Geplante Features
1. **Zoom-Funktion**: Vergrößerung für präzise Bearbeitung
2. **Bild-Metadaten**: EXIF-Daten anzeigen und bearbeiten
3. **Original-Vorschau**: Toggle zwischen Low-Res und Original
4. **Batch-Operationen**: Mehrere Bilder gleichzeitig bearbeiten
5. **Automatische Korrektur**: KI-basierte Orientierungserkennung

### Technische Verbesserungen
1. **WebSocket**: Echtzeit-Updates bei Bildverarbeitung
2. **Progressive Web App**: Offline-Funktionalität
3. **Image Optimization**: Automatische Komprimierung
4. **CDN-Integration**: Bessere Performance für globale Nutzer 