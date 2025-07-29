# Homepage: Anzeige nur wertvoller Habitate

## Übersicht

Die Homepage wurde angepasst, um nur gesetzlich geschützte oder ökologisch hochwertige Habitate anzuzeigen. Dies stellt sicher, dass Besucher der Website die wertvollsten und schützenswertesten Habitate Südtirols sehen.

## Problem

Vorher wurden alle verifizierten Habitate auf der Homepage angezeigt, unabhängig von ihrem Schutzstatus. Dies führte dazu, dass auch standardmäßige oder weniger wertvolle Habitate prominent dargestellt wurden.

## Lösung

### 1. API-Filter erweitert

#### LandingPage (`src/components/landing/LandingPage.tsx`)
```typescript
// Vorher
const response = await fetch('/api/habitat/public?limit=4&sortBy=updatedAt&sortOrder=desc&verifizierungsstatus=verifiziert');

// Nachher
const response = await fetch('/api/habitat/public?limit=8&sortBy=updatedAt&sortOrder=desc&verifizierungsstatus=verifiziert&schutzstatus=gesetzlich geschützt,schützenswert,ökologisch hochwertig');
```

### 2. Mapping-Funktion aktualisiert

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

### 6. Debug-Logging hinzugefügt

```typescript
// Debug: Logge die geladenen Habitate
console.log('Homepage - Geladene Habitate:', data.entries.map((entry: HabitatEntry) => ({
  jobId: entry.jobId,
  schutzstatus: entry.result?.schutzstatus,
  mappedStatus: mapSchutzstatusToStatus(entry.result?.schutzstatus || '')
})));
```

### 3. Filterkriterien

Die Homepage zeigt jetzt nur Habitate mit folgenden Schutzstatus:
- **Gesetzlich geschützt**: Habitate mit gesetzlichem Schutzstatus
- **Schützenswert**: Habitate, die als schützenswert eingestuft wurden
- **Ökologisch hochwertig**: Habitate mit hohem ökologischen Wert

### 4. Optimierte Datenladung

```typescript
// Lade bis zu 8 wertvolle Habitate
const response = await fetch('/api/habitat/public?limit=8&...');

// Zeige alle geladenen Habitate an (bis zu 8)
setVerifiedHabitats(data.entries);
```

### 5. Aktualisierte Beschreibung

```typescript
// Vorher
<h2>Zuletzt verifizierte Habitate</h2>
<div>
  Diese Habitate wurden von engagierten Mitbürgern und Experten erfasst und verifiziert
</div>

// Nachher
<h2>Wertvolle Habitate in Südtirol</h2>
<div>
  Diese gesetzlich geschützten und ökologisch hochwertigen Habitate wurden von engagierten Mitbürgern und Experten erfasst und verifiziert
</div>
```

## Vorteile

### 1. Qualitätsfokus
- **Wertvolle Darstellung**: Nur die wichtigsten Habitate werden prominent angezeigt
- **Schutzstatus-Hervorhebung**: Betont die Bedeutung des Naturschutzes
- **Professioneller Eindruck**: Zeigt die Qualität der erfassten Daten

### 2. Benutzerführung
- **Klare Botschaft**: Verdeutlicht, dass es um wertvolle Habitate geht
- **Motivation**: Inspiriert Besucher, sich am Naturschutz zu beteiligen
- **Vertrauen**: Zeigt die Qualität der wissenschaftlichen Arbeit

### 3. Technische Optimierung
- **Effiziente Filterung**: Nutzt bestehende API-Filter
- **Mehr Sichtbarkeit**: Zeigt bis zu 8 wertvolle Habitate
- **Konsistente Darstellung**: Behält das bestehende Layout bei

## Technische Details

### API-Parameter
- **`limit=8`**: Lädt 8 Habitate (statt 4) für bessere Auswahl
- **`verifizierungsstatus=verifiziert`**: Nur verifizierte Habitate
- **`schutzstatus=gesetzlich geschützt,schützenswert,ökologisch hochwertig`**: Filter für wertvolle Habitate

### Frontend-Logik
```typescript
// Lade bis zu 8 wertvolle Habitate
const response = await fetch('/api/habitat/public?limit=8&...');

// Zeige alle geladenen Habitate an (bis zu 8)
setVerifiedHabitats(data.entries);
```

### Schutzstatus-Mapping
Die API verwendet folgende Schutzstatus-Werte:
- `gesetzlich geschützt`
- `schützenswert` 
- `ökologisch hochwertig`

## Wartung

### Zukünftige Anpassungen
1. **Schutzstatus-Erweiterung**: Bei Bedarf können weitere Kategorien hinzugefügt werden
2. **Anzahl-Anpassung**: Die Anzahl der angezeigten Habitate kann geändert werden
3. **Sortierung**: Die Sortierreihenfolge kann angepasst werden

### Monitoring
- **Datenqualität**: Überwachung der verfügbaren wertvollen Habitate
- **Performance**: Kontrolle der API-Response-Zeiten
- **User Experience**: Feedback zur Darstellungsqualität

## Fazit

Die Anpassung der Homepage auf wertvolle Habitate verbessert die Qualitätsdarstellung erheblich:
- **Fokus auf Qualität**: Nur die wichtigsten Habitate werden angezeigt
- **Klare Botschaft**: Verdeutlicht den Wert der Naturschutzarbeit
- **Professioneller Eindruck**: Zeigt die Qualität der erfassten Daten
- **Motivation**: Inspiriert Besucher zur Teilnahme am Naturschutz 