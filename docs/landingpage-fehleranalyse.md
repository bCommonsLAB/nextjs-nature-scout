# Fehleranalyse: "Fehler beim Laden der Habitat-Daten" in NatureScoutPage

## Problembeschreibung

**Fehlermeldung:**  
`Fehler beim Laden der Habitat-Daten`  
**Ort:** `NatureScoutPage.useEffect.fetchVerifiedHabitats`  
**Datei:** `src/components/landing/LandingPage.tsx`, Zeile 104

## Ursachenanalyse

### 1. Hauptursache identifiziert
Die API-Route `/api/habitat/public/route.ts` verlangte Authentifizierung (`requireAuth()`), obwohl sie als "öffentlich" bezeichnet wurde. Die LandingPage erwartete aber, dass auch nicht eingeloggte Nutzer verifizierte Habitate sehen können.

### 2. Widerspruch in der Implementierung
- **Route-Name:** `/api/habitat/public` suggeriert öffentlichen Zugang
- **Implementierung:** Verlangte Authentifizierung mit `requireAuth()`
- **Erwartung:** LandingPage sollte für alle Besucher funktionieren

### 3. Fehlerkette
1. LandingPage ruft `/api/habitat/public` auf
2. API verlangt Authentifizierung
3. Nicht eingeloggte Nutzer erhalten 401/403 Fehler
4. Frontend fängt Fehler ab und zeigt "Fehler beim Laden der Habitat-Daten"

## Lösungsansätze (3 Varianten)

### Variante 1: Optionale Authentifizierung ✅ (final gewählt)
**Beschreibung:** Implementiere optionale Authentifizierung ohne Fehler  
**Vorteile:** Funktioniert für alle, zeigt eingeloggten Nutzern mehr Daten  
**Nachteile:** Keine

### Variante 2: Authentifizierung komplett entfernen
**Beschreibung:** Entferne `requireAuth()` aus der öffentlichen Route  
**Vorteile:** Einfach, entspricht der Erwartung  
**Nachteile:** Eingeloggte Nutzer sehen keine Personen aus ihrer Organisation

### Variante 3: Separate Route für eingeloggte Nutzer
**Beschreibung:** Neue Route `/api/habitat/public-anonymous` erstellen  
**Vorteile:** Klare Trennung  
**Nachteile:** Code-Duplikation, zusätzliche Komplexität

## Finale Lösung: Optionale Authentifizierung

### Implementierte Änderungen

#### In `/api/habitat/public/route.ts`:
1. **Ersetzt:** `requireAuth()` durch optionale Session-Prüfung
2. **Hinzugefügt:** `getServerSession(authOptions)` mit try-catch
3. **Angepasst:** Anonymisierungslogik für beide Szenarien
4. **Hinzugefügt:** Kommentare zur Dokumentation

#### In `/api/public-filter-options/route.ts`:
1. **Ersetzt:** `requireAuth()` durch optionale Session-Prüfung
2. **Hinzugefügt:** `getServerSession(authOptions)` mit try-catch
3. **Angepasst:** Personen-Filter für beide Szenarien
4. **Hinzugefügt:** Kommentare zur Dokumentation

### Funktionsweise

**Für nicht eingeloggte Nutzer:**
- Route funktioniert ohne Fehler
- **Keine Erfasser-Namen werden angezeigt** (Datenschutz)
- Alle anderen Filter funktionieren normal

**Für eingeloggte Nutzer:**
- Route funktioniert mit zusätzlichen Daten
- Personen mit `habitat_name_visibility === 'public'` werden angezeigt
- **Zusätzlich:** Personen aus der gleichen Organisation werden angezeigt
- Alle anderen Filter funktionieren normal

### Anonymisierungslogik
```typescript
// Im anonymen Fall: Gar keine Namen anzeigen
if (!currentUserOrgId) {
  entry.metadata.erfassungsperson = '';
}
// Für eingeloggte Nutzer: Zeige Namen wenn:
// 1. Öffentliche Sichtbarkeit ODER
// 2. Gleiche Organisation wie eingeloggter Benutzer
else if (
  userData.habitat_name_visibility === 'public' || 
  (currentUserOrgId && userData.organizationId && 
   userData.organizationId.toString() === currentUserOrgId.toString())
) {
  // Name wird angezeigt
}
```

## Testempfehlungen

1. **LandingPage ohne Login:** Verifizierte Habitate werden angezeigt (keine Erfasser-Namen)
2. **LandingPage mit Login:** Verifizierte Habitate + Erfasser basierend auf Sichtbarkeitseinstellungen
3. **Filter-Optionen ohne Login:** Alle Filter funktionieren (Erfasser-Filter komplett ausgeblendet)
4. **Filter-Optionen mit Login:** Alle Filter + Erfasser basierend auf Sichtbarkeitseinstellungen
5. **UI-Verhalten:** Erfasser-Filter wird komplett ausgeblendet, wenn keine Optionen vorhanden sind

## Dokumentation der Änderung

Die Änderung ist im Code mit Kommentaren dokumentiert:
- `// Optionale Authentifizierung - keine Fehler, falls nicht eingeloggt`
- `// Im anonymen Fall: Gar keine Erfasser anzeigen`
- `// Nur für eingeloggte Nutzer: Zeige Personen basierend auf Sichtbarkeitseinstellungen`
- `// Wenn keine Optionen vorhanden sind und nicht geladen wird, nichts anzeigen`

### UI-Verbesserungen
- **MultiSelectFilter:** Komplett ausgeblendet, wenn keine Optionen vorhanden sind
- **Konsistente Benutzererfahrung:** Keine leeren Filter-Sektionen mehr
- **Info-Tooltip:** Erklärt, dass Erfasser nur angezeigt werden, wenn sie dies in ihrem Profil wünschen
- **Tooltip-Position:** Info-Symbol direkt hinter "Erfasser" in der Überschrift

## Datum der Implementierung
[Heute] - Optionale Authentifizierung in öffentlichen APIs implementiert 