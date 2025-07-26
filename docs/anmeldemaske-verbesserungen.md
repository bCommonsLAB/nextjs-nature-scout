# Verbesserungen der Anmeldemaske

## Übersicht

Die Anmeldemaske wurde für ältere Personen optimiert und um eine Code-basierte Anmeldung erweitert.

## Verbesserungen

### 1. **Übersichtlichkeit**
- **Größere Schrift**: Alle Texte von `text-base` auf `text-lg` erhöht
- **Größere Eingabefelder**: Höhe von `h-12` auf `h-14` erhöht
- **Mehr Abstand**: Größere Abstände zwischen Elementen (`space-y-3` statt `space-y-2`)
- **Größere Icons**: Von `h-4 w-4` auf `h-5 w-5` erhöht
- **Größere Buttons**: Höhe von `h-12` auf `h-14` erhöht

### 2. **Zwei Anmeldemethoden**
- **Tab-basierte Navigation**: Klare Trennung zwischen Passwort- und Code-Anmeldung
- **Große Tab-Buttons**: Deutlich sichtbare Auswahl zwischen den Methoden
- **Icons für bessere Orientierung**: Schloss für Passwort, Schlüssel für Code

### 3. **Code-basierte Anmeldung**
- **6-stelliger Code**: Einfach zu lesen und einzugeben
- **Zentrierte Eingabe**: Code wird in der Mitte angezeigt
- **Tracking**: Buchstabenabstand für bessere Lesbarkeit
- **Code anfordern**: Button zum Anfordern eines neuen Codes

### 4. **Barrierefreiheit**
- **Größere Klickbereiche**: Alle interaktiven Elemente vergrößert
- **Bessere Kontraste**: Klarere Farbunterschiede
- **Einfache Sprache**: Verständliche Beschreibungen
- **Konsistente Struktur**: Gleiche Abstände und Größen

## Technische Implementierung

### Neue API-Routen
1. **`/api/auth/code-login`**: Verarbeitet Code-basierte Anmeldung
2. **`/api/auth/request-code`**: Sendet neuen Code per E-Mail

### Komponenten-Struktur
- **Tabs**: Verwaltet die beiden Anmeldemethoden
- **TabsContent**: Separate Formulare für jede Methode
- **Gemeinsame E-Mail-Eingabe**: Wird in beiden Tabs verwendet

### Sicherheit
- **Code-Validierung**: Prüfung auf Gültigkeit und Ablaufzeit
- **Einmalverwendung**: Codes werden nach Verwendung gelöscht
- **Rate Limiting**: Verhindert Missbrauch (TODO)

## Benutzerfreundlichkeit

### Für ältere Personen optimiert:
- **Große, gut lesbare Schrift**
- **Deutliche Kontraste**
- **Einfache Navigation**
- **Klare Anweisungen**
- **Hilfreiche Fehlermeldungen**

### Zwei Anmeldemethoden:
1. **Passwort-Methode**: Für Benutzer, die sich an ihr Passwort erinnern
2. **Code-Methode**: Für Benutzer, die ihr Passwort vergessen haben oder es einfacher finden

## Nächste Schritte

### TODO-Liste:
1. **E-Mail-Service**: Implementierung des tatsächlichen E-Mail-Versands
2. **Datenbank-Schema**: Tabelle für Login-Codes mit Ablaufzeit
3. **Rate Limiting**: Verhindert zu häufige Code-Anfragen
4. **SMS-Alternative**: Code auch per SMS senden
5. **Erfolgsmeldungen**: Bessere Rückmeldung bei erfolgreichen Aktionen

### Tests:
- [ ] Passwort-Anmeldung funktioniert
- [ ] Code-Anmeldung funktioniert
- [ ] Code-Anforderung funktioniert
- [ ] Fehlerbehandlung funktioniert
- [ ] Responsive Design auf verschiedenen Geräten
- [ ] Barrierefreiheit-Tests

## Fazit

Die neue Anmeldemaske bietet:
- **Bessere Übersichtlichkeit** für ältere Personen
- **Flexibilität** durch zwei Anmeldemethoden
- **Sicherheit** durch Code-basierte Authentifizierung
- **Benutzerfreundlichkeit** durch klare Struktur und große Elemente 