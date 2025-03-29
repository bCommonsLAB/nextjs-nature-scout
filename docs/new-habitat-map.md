# Konzept: Neue Habitat-Kartendarstellung

## Übersicht
Die bestehende Implementierung für die Habitat-Erfassung soll komplett überarbeitet werden, um eine intuitivere und einfachere Benutzererfahrung zu bieten. Ziel ist es, die Map-Komponente zu vereinfachen und den Bildschirm optimal zu nutzen, indem nur die wirklich notwendigen Elemente angezeigt werden.

## Probleme der aktuellen Implementierung
- Unübersichtlicher Code mit vielen verschachtelten Funktionen und Zuständen
- Zu viele UI-Elemente unter der Karte, die Platz verschwenden
- Keine klare Trennung zwischen Navigation und Polygon-Zeichnung
- Unklare Benutzerführung beim Zeichnen des Polygons

## Anforderungen an die neue Implementierung

### Allgemeine Anforderungen
- Vollbild-Karte mit minimalen UI-Elementen für maximale Nutzung des Bildschirms
- Nur Zurück- und Weiter-Buttons unterhalb der Karte
- Intuitiver Workflow mit klarer Benutzerführung
- Trennung der Funktionalität in zwei Modi: Navigation und Polygon-Zeichnung

### Karten-Modi

#### 1. Navigations-Modus
- Symbol: Vier Pfeile in alle Richtungen
- Funktionalität:
  - Zoomen mit Plus- und Minus-Symbolen
  - Verschieben der Landkarte durch Ziehen
  - Layer-Auswahl zum Ein-/Ausblenden von Ebenen
  - Zentrieren-Button unten rechts, um auf den aktuellen Standort zu fokussieren und maximal zu zoomen

#### 2. Polygon-Modus
- Symbol: Polygon-Zug Symbol
- Funktionalität:
  - Blockierung der Karten-Navigation (kein Verschieben/Zoomen)
  - Einblenden eines Erklärungsdialogs über das Zeichnen im Uhrzeigersinn
  - Setzen von Punkten durch Klicken auf die Karte
  - "Polygon abschließen"-Button rechts unten
  - Nach Abschluss: Anzeigen der Bearbeitungs-Handles und Standortdaten
  - Option zum Neubeginnen des Polygons

### UI-Elemente
- Modi-Buttons unten links (Navigation/Polygon)
- Zoom-Buttons oben rechts
- Layer-Auswahl oben rechts
- Zentrieren-Button unten rechts (nur im Navigations-Modus)
- Polygon abschließen/Neubeginnen-Buttons unten rechts (nur im Polygon-Modus)
- Zurück/Weiter-Buttons unterhalb der Karte
- Temporäre Dialoge für Erklärungen (ausblendbar)

## Technische Umsetzung

### Komponenten-Struktur
1. `HabitatMap` - Hauptkomponente
   - Verwaltet den aktuellen Modus (Navigation/Polygon)
   - Enthält die Map-Komponente und UI-Overlays

2. `MapComponent` - Leaflet Map (No SSR)
   - Basisimplementierung der Karte
   - Zoom-Kontrollen
   - Layer-Kontrollen
   - Standortbestimmung

3. `MapControls` - UI-Overlays über der Karte
   - Modi-Umschalter (Navigation/Polygon)
   - Aktionstasten je nach Modus
   - Dialoge und Informationen

### Datenfluss
- Der aktuelle Modus steuert, welche Leaflet-Controls aktiviert sind
- Im Polygon-Modus werden alle nicht-relevanten Kontrollen deaktiviert
- Alle wichtigen Daten (Position, Polygon-Punkte) werden in der NatureScoutData gespeichert
- Temporäre Zustände werden in lokalen States verwaltet

### Bedienbarkeit auf Mobilgeräten
- Größere Bedienelemente für Touch-Interaktion
- Größere Polygon-Handles zum Verschieben der Punkte
- Responsive Layout für verschiedene Bildschirmgrößen

## Implementierungsplan

### Phase 1: Bereinigung
- Entfernen der komplexen Logik aus der bestehenden Implementierung
- Behalten der grundlegenden Map-Funktionalität (Zoomen, Layer)
- Vereinfachen der Benutzeroberfläche

### Phase 2: Basis-Implementation
- Einführung der zwei Modi (Navigation/Polygon)
- Implementierung der grundlegenden UI-Elemente
- Basisimplementierung des Polygon-Zeichnens

### Phase 3: Feinschliff
- Verbesserung der Benutzerführung mit Dialogen
- Optimierung der Touch-Bedienung
- Testen und Anpassen der Benutzererfahrung

## Mock-UI (ASCII)
```
+----------------------------------------+
|                                    [L] |
|                                    [+] |
|                                    [-] |
|                                        |
|                                        |
|                                        |
|                                        |
|                                        |
|                                        |
| [N][P]                             [C] |
+----------------------------------------+
|    [Zurück]                [Weiter]    |
+----------------------------------------+

Legende:
[L] - Layer-Auswahl
[+]/[-] - Zoom-Kontrollen
[N] - Navigations-Modus
[P] - Polygon-Modus
[C] - Zentrieren / Polygon abschließen (kontextabhängig)
``` 