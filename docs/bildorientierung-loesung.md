# Lösung für Bildorientierungsproblem

## Problem
Bilder, die im Portrait-Format aufgenommen wurden, werden in der Anwendung liegend angezeigt. Dies liegt daran, dass die EXIF-Orientierungsdaten nicht korrekt interpretiert werden.

## Ursache
Die Next.js Image-Komponente respektiert standardmäßig nicht immer die EXIF-Orientierungsdaten, die in den Bildern gespeichert sind. Diese Daten enthalten Informationen darüber, wie das Bild ursprünglich aufgenommen wurde.

## Lösung
Wir haben eine CSS-basierte Lösung implementiert, die die `image-orientation: from-image` Eigenschaft verwendet.

### Implementierte Änderungen

1. **Globale CSS-Regel** (`src/styles/globals.css`):
   ```css
   @layer base {
     img {
       image-orientation: from-image;
     }
     
     /* Spezifisch für Azure Blob Storage Bilder */
     img[src*="ragtempproject.blob.core.windows.net"] {
       image-orientation: from-image !important;
     }
   }
   ```

2. **Spezifische CSS-Klasse** für Habitat-Bilder:
   ```css
   .habitat-image {
     image-orientation: from-image !important;
     object-fit: contain;
     object-position: center;
   }
   ```

3. **Anwendung der Klasse** in allen relevanten Komponenten:
   - `src/app/habitat/[jobId]/page.tsx` - Detailansicht der Habitate
   - `src/app/habitat/components/HabitateList.tsx` - Liste der Habitate
   - `src/components/landing/HabitatCard.tsx` - Habitat-Karten

### Technische Details

- **`image-orientation: from-image`**: Diese CSS-Eigenschaft weist den Browser an, die EXIF-Orientierungsdaten zu respektieren
- **`!important`**: Wird verwendet, um sicherzustellen, dass die Regel Vorrang vor anderen CSS-Regeln hat
- **Spezifische Selektoren**: Zusätzliche Regeln für Azure Blob Storage URLs, um sicherzustellen, dass alle Habitat-Bilder korrekt angezeigt werden

### Browser-Unterstützung

Die `image-orientation` CSS-Eigenschaft wird von allen modernen Browsern unterstützt:
- Chrome 81+
- Firefox 26+
- Safari 13.1+
- Edge 79+

### Alternative Lösungen (nicht implementiert)

1. **Server-seitige Bildverarbeitung**: Bilder könnten beim Upload automatisch korrigiert werden
2. **JavaScript-basierte EXIF-Parsing**: Verwendung von Bibliotheken wie `exif-js`
3. **Canvas-basierte Transformation**: Programmgesteuerte Rotation der Bilder

### Testen der Lösung

1. Öffnen Sie http://localhost:3000/habitat
2. Laden Sie ein Portrait-Bild hoch
3. Überprüfen Sie, ob das Bild in der korrekten Ausrichtung angezeigt wird
4. Testen Sie auch die Vorschau-Funktion

### Wartung

- Die Lösung ist wartungsarm, da sie CSS-basiert ist
- Bei Änderungen an der Bildquelle müssen nur die CSS-Selektoren angepasst werden
- Die Lösung funktioniert automatisch für alle neuen Bilder

## Fazit

Diese CSS-basierte Lösung ist einfach, effektiv und wartungsarm. Sie stellt sicher, dass alle Habitat-Bilder in der korrekten Ausrichtung angezeigt werden, ohne dass zusätzliche JavaScript-Bibliotheken oder server-seitige Verarbeitung erforderlich sind. 