# Analyse: „Fehler bei GPS-Verfolgung: {}“ beim initialen Karten-Load

## Beobachtung
Im Fehler-Callback von `navigator.geolocation.watchPosition(...)` wird aktuell geloggt:

- `console.error("Fehler bei GPS-Verfolgung:", error);`

In der Next.js Dev-Overlay-Konsole erscheint dabei häufig nur `{}` statt einer brauchbaren Fehlerbeschreibung.

## Plausible Ursachen (Hypothesen)
- **H1: Nicht-serialisierbares Error-Objekt**  
  `GeolocationPositionError`/`DOMException` hat in vielen Browsern Properties wie `code`/`message` als **nicht-enumerable**. Next.js Dev Overlay/Console-Rendering zeigt dann `{}`.

- **H2: Berechtigung/Policy**  
  Häufigster realer Trigger: **Permission denied** (User blockt GPS) oder Browser-Policy/Settings blockieren Geolocation.

- **H3: Timing/Umgebung**  
  Auf Mobilgeräten kann **Timeout** oder **Position unavailable** beim initialen Laden auftreten (kein Fix, Indoor, Energiesparmodus, kein GPS-Fix).

## Drei Lösungsvarianten (vor Implementierung)
- **Variante A (minimal, empfohlen)**  
  Error im Callback **normalisieren** (code/message/name + sichere Serialisierung) und als primitives Objekt loggen. Zusätzlich im UI (GPS-Status) eine kurze Fehlermeldung anzeigen.  
  Vorteil: Minimaler Eingriff, sofort diagnostizierbar.  
  Nachteil: Ändert nicht das Timing/Permission-Verhalten.

- **Variante B (besseres UX / Diagnostik)**  
  Zusätzlich `navigator.permissions` (falls verfügbar) abfragen und bei `denied` eine klare Handlungsanweisung anzeigen („Browser-Einstellungen → Standort erlauben“).  
  Vorteil: Weniger Support-Fälle.  
  Nachteil: Permissions API ist nicht überall stabil verfügbar (z.B. Safari).

- **Variante C (robuster, aber UX-Änderung)**  
  GPS-Tracking nicht automatisch starten, sondern erst nach einem **User Gesture** (Button „GPS aktivieren“).  
  Vorteil: Weniger „initiale“ Fehler, besser kontrollierbar.  
  Nachteil: Zusätzlicher Klick, Flow-Änderung.

## Entscheidung
Implementiert wird **Variante A**: serialisierbares Logging + UI-Anzeige.  
Das liefert belastbare Informationen, ob wir im nächsten Schritt (optional) B oder C brauchen.


