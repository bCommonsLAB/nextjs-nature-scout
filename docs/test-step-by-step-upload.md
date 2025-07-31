# Test-Anleitung: Schrittweise Bilderfassung

## Testumgebung vorbereiten

1. **Entwicklungsserver starten**:
   ```bash
   npm run dev
   ```

2. **Zur Bilderfassungsseite navigieren**:
   - Öffnen Sie `http://localhost:3000/naturescout`
   - Gehen Sie durch die ersten Schritte:
     - Willkommen → Weiter
     - Standort finden → (kurz warten) → Weiter  
     - Umriss zeichnen → (optional zeichnen) → Weiter
     - **Bilder erfassen** ← Hier beginnt das neue Feature

## Funktionen testen

### 1. Schritt-für-Schritt Navigation
- **Erwartung**: Nur ein Bildupload pro Schritt sichtbar
- **Test**: Durch alle 4 Schritte navigieren
- **Prüfung**: 
  - Panoramabild → Detailbild → Pflanzenbild 1 → Pflanzenbild 2
  - Fortschrittsbalken innerhalb des Bilderfassungs-Schritts
  - Schematische Hintergrundbilder werden korrekt angezeigt

### 2. Handy-Orientierungshilfen
- **Panoramabild**: Handy-Symbol horizontal (quer)
- **Andere Bilder**: Handy-Symbol vertikal (aufrecht)
- **Anweisungen**: Spezifische Tipps für jeden Bildtyp

### 3. Mobile Ansicht
- **Test auf Smartphone oder DevTools mobile Ansicht**:
  - Chrome DevTools → F12 → Device Toggle (Ctrl+Shift+M)
  - iPhone oder Android Simulator wählen
- **Prüfung**:
  - Übersichtliche Darstellung
  - Touch-freundliche Buttons
  - Lesbare Schrift und Icons

### 4. Automatische Navigation
- **Test**: Bild hochladen und beobachten
- **Erwartung**: Nach erfolgreichem Upload automatisch zum nächsten Schritt
- **Timing**: Ca. 1 Sekunde Verzögerung für Benutzer-Feedback

### 5. Bildübersicht
- **Test**: Mehrere Bilder hochladen
- **Erwartung**: Übersicht am Ende zeigt alle hochgeladenen Bilder
- **Prüfung**: 
  - Thumbnails der Bilder
  - Grüne Markierungen für abgeschlossene Schritte
  - Korrekte Zuordnung der Bildtypen

## Test-Szenarien

### Szenario 1: Vollständiger Durchlauf
1. Alle 4 Bilder nacheinander hochladen
2. Automatische Navigation beobachten
3. Finale Übersicht prüfen
4. "Fertig" klicken → zum nächsten Hauptschritt

### Szenario 2: Manuelle Navigation
1. Zwischen Schritten vor- und zurücknavigieren
2. Ohne Upload versuchen weiterzugehen
3. Buttons sollten entsprechend deaktiviert sein

### Szenario 3: Bildlöschung und Neuerstellung
1. Bild hochladen
2. Bild löschen (X-Button)
3. Neues Bild hochladen
4. Navigation sollte weiterhin funktionieren

### Szenario 4: Unterbrechung und Wiederaufnahme
1. Teilweise Bilder hochladen
2. Seite neu laden oder weg navigieren
3. Zurückkommen und weitermachen
4. Hochgeladene Bilder sollten erhalten bleiben

## Qualitätsprüfung

### Schematische Bilder
- ✅ **Panorama**: Landschaft mit Horizont, Handy quer
- ✅ **Detail**: Fokussierter Vordergrund, Handy vertikal  
- ✅ **Pflanze 1**: Blume mit KI-Symbol, Fokusring
- ✅ **Pflanze 2**: Gras/Farn mit "Andere Art" Hinweis

### UI/UX-Aspekte
- **Fortschrittsanzeige**: Zeigt aktuellen Schritt von 4
- **Orientierungshilfe**: Handy-Symbol dreht sich entsprechend
- **Tipps**: 4 prägnante Tipps pro Schritt
- **Farbkodierung**: Konsistente Farben für jeden Bildtyp

### Performance
- **Ladezeiten**: SVG-Bilder laden schnell
- **Upload-Feedback**: Sofortige Rückmeldung
- **Navigation**: Flüssige Übergänge zwischen Schritten

## Häufige Probleme und Lösungen

### Problem: Schematische Bilder werden nicht angezeigt
**Lösung**: 
- Prüfen ob SVG-Dateien in `public/images/` vorhanden sind
- Browser-Cache leeren (Ctrl+F5)
- Netzwerk-Tab prüfen ob 404-Fehler auftreten

### Problem: Navigation funktioniert nicht
**Lösung**:
- Prüfen ob Upload erfolgreich war (grünes Feedback)
- Browser-Console auf JavaScript-Fehler prüfen
- Metadaten-State überprüfen

### Problem: Mobile Ansicht nicht optimal
**Lösung**:
- DevTools mobile Ansicht verwenden
- Verschiedene Bildschirmgrößen testen
- Touch-Events statt Mouse-Events verwenden

## Browser-Kompatibilität

### Getestete Browser:
- ✅ Chrome (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)  
- ✅ Safari (Desktop & Mobile)
- ✅ Edge (Desktop)

### Bekannte Einschränkungen:
- Internet Explorer: Nicht unterstützt (moderne ES6+ Features)
- Ältere Browser: Möglicherweise CSS Grid/Flexbox Probleme

## Feedback sammeln

### Metriken zu beobachten:
1. **Abschlussrate**: Wie viele Nutzer laden alle 4 Bilder hoch?
2. **Verweildauer**: Wie lange dauert der Bilderfassungsschritt?
3. **Fehlermeldungen**: Welche Uploads schlagen fehl?
4. **Navigation**: Nutzen Benutzer manuelle oder automatische Navigation?

### Benutzerfeedback:
- Ist die schrittweise Führung hilfreich?
- Sind die Anweisungen verständlich?
- Funktioniert es auf dem Smartphone gut?
- Sind die schematischen Bilder hilfreich?

## Nächste Schritte

Nach erfolgreichem Test:
1. ✨ **Produktionsbereitschaft** prüfen
2. 📊 **Analytics** für Nutzungsmetriken hinzufügen
3. 🎨 **Bessere schematische Bilder** von Designern erstellen lassen
4. 🌐 **Internationalisierung** für mehrere Sprachen
5. 🤖 **KI-basierte Qualitätsprüfung** für hochgeladene Bilder