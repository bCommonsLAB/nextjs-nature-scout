# Schutzstatus-Filter Problem: Diskrepanz zwischen Filterung und Anzeige

## Problem

Bei der Filterung nach "ökologisch hochwertig" in der "unsere-habitate" Seite:
- **Filter zeigt**: 3 Habitate gefunden
- **Anzeige zeigt**: Alle 3 Habitate mit Label "ökologisch niederwertig"

Dies deutet auf eine Diskrepanz zwischen der Filterung und der Anzeige hin.

## Ursachenanalyse

### 1. Veraltete Mapping-Funktion

Die `mapSchutzstatusToStatus` Funktion in `src/app/unsere-habitate/page.tsx` war veraltet:

```typescript
// Vorher (veraltet)
const mapSchutzstatusToStatus = (schutzstatus: string): string => {
  switch (schutzstatus?.toLowerCase()) {
    case 'gesetzlich geschützt':
      return 'gesetzlich';
    case 'nicht gesetzlich geschützt, aber schützenswert': // ← Veraltet
      return 'hochwertig';
    case 'standardvegetation':
      return 'standard';
    default:
      return 'standard';
  }
};

// Nachher (korrigiert)
const mapSchutzstatusToStatus = (schutzstatus: string): string => {
  switch (schutzstatus?.toLowerCase()) {
    case 'gesetzlich geschützt':
      return 'gesetzlich';
    case 'schützenswert':
    case 'ökologisch hochwertig': // ← Neue Werte
      return 'hochwertig';
    case 'ökologisch niederwertig': // ← Neue Werte
    case 'standardvegetation':
      return 'standard';
    default:
      return 'standard';
  }
};
```

### 2. Neue Schutzstatus-Werte

Die API verwendet jetzt neue, standardisierte Schutzstatus-Werte:
- `gesetzlich geschützt`
- `schützenswert`
- `ökologisch hochwertig`
- `ökologisch niederwertig`

### 3. Normalisierung in der API

Die API normalisiert die Schutzstatus-Werte mit `normalizeSchutzstatus()`:

```typescript
// In src/app/api/habitat/public/route.ts
if (entry.result?.schutzstatus) {
  entry.result.schutzstatus = normalizeSchutzstatus(entry.result.schutzstatus);
}
```

## Lösung

### 1. Mapping-Funktion aktualisiert

Die `mapSchutzstatusToStatus` Funktion wurde erweitert, um alle neuen Schutzstatus-Werte korrekt zu mappen.

### 2. Debug-Logging hinzugefügt

Zur besseren Diagnose wurde Debug-Logging hinzugefügt:

```typescript
// Debug: Logge die ersten Einträge um das Problem zu identifizieren
if (result.entries && result.entries.length > 0) {
  console.log('Geladene Habitate:', result.entries.slice(0, 3).map((entry: HabitatEntry) => ({
    jobId: entry.jobId,
    schutzstatus: entry.result?.schutzstatus,
    mappedStatus: mapSchutzstatusToStatus(entry.result?.schutzstatus || '')
  })));
}
```

## Technische Details

### Schutzstatus-Flow

1. **Datenbank**: Rohe Schutzstatus-Werte (können Objekte oder Strings sein)
2. **API-Normalisierung**: `normalizeSchutzstatus()` konvertiert zu standardisierten Strings
3. **Frontend-Mapping**: `mapSchutzstatusToStatus()` konvertiert zu Display-Werten
4. **HabitatCard**: `getStatusText()` konvertiert zu finalen Labels

### Normalisierung in der API

```typescript
// src/lib/utils/data-validation.ts
export function normalizeSchutzstatus(schutzstatus: unknown): string {
  if (typeof schutzstatus === 'object' && schutzstatus !== null) {
    // Fall: Objekt mit Gewichtungen
    const statusObj = schutzstatus as SchutzstatusObject;
    const entries = Object.entries(statusObj);
    
    // Finde den höchsten Wert
    let maxKey = entries[0][0];
    let maxValue = Number(entries[0][1]);
    
    for (const [key, value] of entries) {
      const numValue = Number(value);
      if (numValue > maxValue) {
        maxValue = numValue;
        maxKey = key;
      }
    }
    
    // Konvertiere zu lesbarem Format
    switch (maxKey) {
      case 'gesetzlich':
        return 'gesetzlich geschützt';
      case 'hochwertig':
        return 'ökologisch hochwertig';
      case 'standard':
        return 'ökologisch niederwertig';
      default:
        return maxKey;
    }
  }
  
  return schutzstatus as string;
}
```

### Frontend-Mapping

```typescript
// src/app/unsere-habitate/page.tsx
const mapSchutzstatusToStatus = (schutzstatus: string): string => {
  switch (schutzstatus?.toLowerCase()) {
    case 'gesetzlich geschützt':
      return 'gesetzlich';
    case 'schützenswert':
    case 'ökologisch hochwertig':
      return 'hochwertig';
    case 'ökologisch niederwertig':
    case 'standardvegetation':
      return 'standard';
    default:
      return 'standard';
  }
};
```

### Finale Anzeige

```typescript
// src/components/landing/HabitatCard.tsx
function getStatusText(status: string): string {
  switch (status) {
    case 'standard': return 'ökologisch niederwertig';
    case 'hochwertig': return 'ökologisch hochwertig';
    case 'gesetzlich': return 'gesetzlich geschützt';
    default: return 'Unbekannt';
  }
}
```

## Testing

### Debug-Schritte

1. **Browser-Konsole öffnen** und nach "Geladene Habitate" suchen
2. **Filter aktivieren** für "ökologisch hochwertig"
3. **Log-Ausgabe prüfen**:
   ```javascript
   {
     jobId: "...",
     schutzstatus: "ökologisch hochwertig", // ← Sollte korrekt sein
     mappedStatus: "hochwertig" // ← Sollte korrekt sein
   }
   ```

### Erwartetes Verhalten

Nach der Korrektur sollte:
- **Filter**: "ökologisch hochwertig (3)" anzeigen
- **Anzeige**: 3 Habitate mit Label "ökologisch hochwertig" zeigen
- **Konsistenz**: Filterung und Anzeige sollten übereinstimmen

## Wartung

### Zukünftige Änderungen

1. **Neue Schutzstatus-Werte**: Bei neuen Werten muss `mapSchutzstatusToStatus` erweitert werden
2. **API-Änderungen**: Bei Änderungen an `normalizeSchutzstatus` muss Frontend angepasst werden
3. **Label-Änderungen**: Bei Änderungen an `getStatusText` muss UI getestet werden

### Monitoring

- **Debug-Logs**: Überwachung der Konsole für Diskrepanzen
- **User-Feedback**: Berichte über falsche Labels
- **Datenkonsistenz**: Regelmäßige Prüfung der Schutzstatus-Werte in der Datenbank 