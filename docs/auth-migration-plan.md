# Migration von Clerk zu Auth.js

## Übersicht
Diese Dokumentation beschreibt die schrittweise Migration von Clerk zur Auth.js für das NatureScout-Projekt.

## Ziele der Migration
- **Authentifizierungssystem**: Wechsel von Clerk zu Auth.js
- **Datenbank**: Weiterverwendung der bestehenden MongoDB User-Tabelle
- **E-Mail Service**: Integration von Mailjet für E-Mail-Versand
- **Benutzerfreundlichkeit**: Einfache Dialoge für ältere Zielgruppe
- **Features**: Registrierung, Anmeldung, Passwort vergessen, Einladungen

## Aktuelle Struktur (Clerk)
```
- ClerkProvider in layout.tsx
- clerkMiddleware für Route-Schutz
- User-Schema mit clerkId als Identifier
- Deutsche Lokalisierung bereits vorhanden
- Einfache Sign-In/Sign-Up Seiten
```

## Zielstruktur (Auth.js)
```
- NextAuth.js mit MongoDB Adapter
- Mailjet für E-Mail-Versand
- Benutzerdefinierte Auth-Komponenten
- Deutsche E-Mail-Templates
- Erweiterte Einladungsfunktion
```

## Migrationsphasen

### Phase 1: Auth.js Setup
- [ ] Installation von NextAuth.js und MongoDB Adapter
- [ ] Basiskonfiguration für MongoDB
- [ ] Environment Variables konfigurieren

### Phase 2: Mailjet Integration  
- [ ] Mailjet SDK installieren und konfigurieren
- [ ] Deutsche E-Mail-Templates erstellen
- [ ] E-Mail-Service implementieren

### Phase 3: Authentifizierungskomponenten
- [ ] Ordnerstruktur unter @/authentification erstellen
- [ ] Registrierungsformular (einfach, erklärt)
- [ ] Anmeldeformular (E-Mail basiert)
- [ ] Passwort vergessen Formular
- [ ] Einladungsformular mit automatischem Passwort

### Phase 4: User-Schema Migration
- [ ] clerkId → authId/id Migration
- [ ] UserService an Auth.js anpassen
- [ ] Migrationsskript für bestehende Daten

### Phase 5: Middleware Migration
- [ ] clerkMiddleware → Auth.js Middleware
- [ ] Route-Schutz beibehalten
- [ ] Session-Management umstellen

### Phase 6: Testing und Cleanup
- [ ] Clerk Dependencies entfernen
- [ ] Funktionalitätstests
- [ ] Performance-Tests

## Sicherheitsanforderungen
- 8-stelliges Passwort ausreichend
- Sichere Session-Verwaltung
- CSRF-Schutz
- E-Mail-Verifizierung

## Benutzerfreundlichkeit
- Einfache, klare Dialoge
- Erklärungen für jeden Schritt
- Keine technischen Barrieren
- Optimiert für ältere Benutzer
- Deutsche Sprache überall

## Risiken und Mitigation
- **Datenverlust**: Vollständige Backups vor Migration
- **Downtime**: Schrittweise Migration mit Feature-Flags
- **User Experience**: Paralleles Testing mit Testusern 