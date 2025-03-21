# Benutzerverwaltung mit Clerk und MongoDB

Dieses Dokument beschreibt die Implementierung der Benutzerverwaltung in NatureScout mit Clerk für die Authentifizierung und MongoDB für die Rechteverwaltung.

## Architektur

- **Clerk**: Verwaltet die Benutzerauthentifizierung, einschließlich Anmeldung, Registrierung und Benutzerprofile
- **MongoDB**: Speichert zusätzliche Benutzerinformationen, insbesondere Berechtigungen
- **API-Endpunkte**: Bieten Zugriff auf die Benutzerverwaltung
- **Admin-UI**: Ermöglicht Administratoren, Benutzer und deren Rechte zu verwalten

## Benutzerrollen

Das System unterstützt drei Benutzerrollen:

1. **user**: Standardbenutzer mit Grundzugriff
2. **admin**: Administrator mit Zugriff auf die Benutzerverwaltung
3. **superadmin**: Administrator mit erweiterten Rechten

## Ersteinrichtung

### 1. Erstellen eines Admin-Benutzers

Da standardmäßig alle neuen Benutzer die Rolle "user" erhalten, muss der erste Admin manuell erstellt werden. Dazu dient das Skript `create-admin.js`:

```bash
# Installation der Abhängigkeiten
npm install

# Ausführen des Admin-Erstellungsskripts
node src/scripts/create-admin.js
```

Bei der Ausführung des Skripts werden folgende Informationen abgefragt:

- **Clerk-ID**: Die ID des Benutzers aus dem Clerk-Dashboard
- **E-Mail**: Die E-Mail-Adresse des Benutzers
- **Name**: Der Name des Benutzers

### 2. Konfiguration des Clerk-Webhooks

Damit neue Benutzer automatisch in der MongoDB registriert werden, muss ein Webhook in Clerk konfiguriert werden:

1. Im Clerk-Dashboard unter "Webhooks" einen neuen Webhook erstellen
2. Als Endpoint-URL `https://deine-domain.de/api/webhook/clerk` eintragen
3. Die Events `user.created`, `user.updated` und `user.deleted` auswählen
4. Das generierte Webhook-Secret in der `.env`-Datei als `CLERK_WEBHOOK_SECRET` eintragen

## API-Endpunkte

### Benutzer-API

- `GET /api/users`: Ruft alle Benutzer ab (nur für Admins)
- `POST /api/users`: Erstellt oder aktualisiert einen Benutzer (nur für Admins)
- `GET /api/users/[clerkId]`: Ruft einen bestimmten Benutzer ab
- `PATCH /api/users/[clerkId]`: Aktualisiert einen bestimmten Benutzer
- `DELETE /api/users/[clerkId]`: Löscht einen bestimmten Benutzer (nur für Admins)

### Webhook-API

- `POST /api/webhook/clerk`: Empfängt und verarbeitet Clerk-Webhook-Events

## Frontend-Komponenten

- `UserTable`: Zeigt alle Benutzer an und ermöglicht Administratoren, Benutzerrollen zu ändern oder Benutzer zu löschen
- `AdminPage`: Enthält die UserTable und bietet eine einfache Benutzerverwaltungsschnittstelle

## Zugangsschutz

Der Zugriff auf geschützte Routen wird auf drei Ebenen gesichert:

1. **Middleware**: Schützt den gesamten Admin-Bereich vor nicht authentifizierten Benutzern
2. **API-Schutz**: Überprüft Benutzerrechte für den Zugriff auf API-Endpunkte
3. **UI-Schutz**: Zeigt Admin-Komponenten nur autorisierten Benutzern an

## Fehlerbehebung

### Benutzer erscheinen nicht in der MongoDB

1. Überprüfen Sie, ob der Clerk-Webhook korrekt konfiguriert ist
2. Prüfen Sie, ob das `CLERK_WEBHOOK_SECRET` in der `.env`-Datei korrekt ist
3. Schauen Sie in die Server-Logs für mögliche Fehler

### Admin-Berechtigungen funktionieren nicht

1. Überprüfen Sie die Benutzerrolle in der MongoDB-Datenbank
2. Stellen Sie sicher, dass der Benutzer die Rolle "admin" oder "superadmin" hat
3. Verwenden Sie das Skript `create-admin.js`, um die Benutzerrolle zu aktualisieren 