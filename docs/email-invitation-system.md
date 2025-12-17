# E-Mail-Einladungssystem - Wiederverwendbare Dokumentation

Diese Dokumentation beschreibt das E-Mail-Einladungssystem, das unabhängig vom verwendeten E-Mail-Service-Provider (ISP) wiederverwendet werden kann.

## Übersicht

Das System ermöglicht es authentifizierten Benutzern, andere Personen per E-Mail einzuladen. Die Einladungen enthalten einen Token-basierten Link, der zur Registrierung oder Anmeldung führt.

## Architektur

Das System besteht aus folgenden Hauptkomponenten:

1. **Backend API-Endpunkte** - Verarbeitung von Einladungsanfragen und Token-Validierung
2. **E-Mail-Service** - Abstraktion für den E-Mail-Versand (ISP-unabhängig)
3. **Frontend-Komponenten** - Formulare zur Erstellung und Annahme von Einladungen
4. **Datenbank-Schema** - Speicherung von Einladungen und Benutzern
5. **Token-Generierung** - Sichere Token-Erstellung für Einladungslinks

---

## 1. Datenbank-Schema

### Einladungs-Modell (IInvitation)

```typescript
interface IInvitation {
  _id?: string | ObjectId;
  email: string;                    // E-Mail-Adresse des Eingeladenen
  name: string;                     // Name des Eingeladenen
  invitedBy: string;                // ID des einladenden Benutzers
  invitedByName: string;            // Name des einladenden Benutzers
  organizationId?: string;          // Optionale Organisations-ID
  organizationName?: string;        // Optionale Organisations-Name
  canInvite?: boolean;              // Berechtigung, weitere Benutzer einzuladen
  token: string;                    // Einzigartiger Einladungs-Token
  expiresAt: Date;                 // Ablaufdatum der Einladung
  used: boolean;                    // Wurde die Einladung bereits verwendet?
  usedAt?: Date;                    // Zeitpunkt der Verwendung
  createdAt: Date;                  // Erstellungszeitpunkt
}
```

**Wichtige Hinweise:**
- Der `used`-Status wird bei der Validierung ignoriert - Links bleiben immer gültig
- Der `used`-Status dient nur für Tracking-Zwecke
- Standard-Gültigkeitsdauer: 7 Tage

### Erstellungs-Daten (CreateInvitationData)

```typescript
interface CreateInvitationData {
  email: string;
  name: string;
  invitedBy: string;
  invitedByName: string;
  organizationId?: string;
  organizationName?: string;
  canInvite?: boolean;
  token: string;
  expiresAt: Date;
}
```

---

## 2. E-Mail-Service-Abstraktion

### Interface-Definitionen

```typescript
// Basis-Interface für alle E-Mail-Daten
interface EmailData {
  to: string;        // Empfänger-E-Mail-Adresse
  name: string;      // Empfänger-Name
  subject: string;   // E-Mail-Betreff
}

// Spezifisches Interface für Einladungs-E-Mails
interface InvitationEmailData extends EmailData {
  inviterName: string;           // Name des Einladenden
  organizationName?: string;     // Organisations-Name (optional)
  temporaryPassword?: string;     // Temporäres Passwort (optional)
  invitationToken?: string;       // Einladungs-Token (optional)
  loginUrl: string;               // URL zum Einladungslink
  personalMessage?: string;       // Persönliche Nachricht (optional)
}
```

### E-Mail-Service-Implementierung (ISP-unabhängig)

**Abstrakte Service-Klasse:**

```typescript
class EmailService {
  /**
   * Sendet eine Einladungs-E-Mail
   * 
   * @param data - Einladungs-E-Mail-Daten
   * @returns Promise<boolean> - Erfolg des Versands
   */
  static async sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
    // ISP-spezifische Implementierung hier
    // Muss HTML- und Text-Version der E-Mail senden
  }
}
```

**E-Mail-Template-Struktur:**

Die E-Mail sollte folgende Elemente enthalten:

1. **HTML-Version:**
   - Begrüßung mit Name des Eingeladenen
   - Name des Einladenden
   - Organisations-Name (falls vorhanden)
   - Persönliche Nachricht (falls vorhanden)
   - Registrierungsinformationen (E-Mail, Name)
   - Call-to-Action Button mit Einladungslink
   - Hinweise zur Verwendung

2. **Text-Version:**
   - Fallback für E-Mail-Clients ohne HTML-Unterstützung
   - Alle wichtigen Informationen als Text
   - Einladungslink als URL

**Umgebungsvariablen:**

```env
EMAIL_FROM_EMAIL=noreply@example.com    # Absender-E-Mail-Adresse
EMAIL_FROM_NAME=Meine App               # Absender-Name
NEXTAUTH_URL=https://example.com        # Basis-URL für Links
```

---

## 3. Backend API-Endpunkte

### 3.1 Einladung erstellen und senden

**Endpoint:** `POST /api/auth/invite`

**Authentifizierung:** Erfordert gültige Session

**Request Body:**
```json
{
  "name": "Max Mustermann",
  "email": "max@example.com",
  "message": "Willkommen im Team!",  // Optional
  "organizationId": "org123",        // Optional
  "canInvite": false                 // Optional
}
```

**Validierung:**
- Name und E-Mail sind erforderlich
- E-Mail-Format wird geprüft (Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- Prüfung, ob E-Mail bereits existiert (unterschiedliche E-Mail-Texte)

**Prozess:**
1. Session-Validierung
2. Eingabe-Validierung
3. Prüfung auf bestehenden Benutzer
4. Organisation laden (falls angegeben)
5. Token generieren (`crypto.randomBytes(32).toString('hex')`)
6. Einladung in Datenbank speichern
7. E-Mail senden (unterschiedliche Templates für neue/bestehende Benutzer)
8. Erfolgsantwort zurückgeben

**Response (Erfolg):**
```json
{
  "message": "Einladung erfolgreich gesendet!",
  "invitation": {
    "id": "inv123",
    "email": "max@example.com",
    "name": "Max Mustermann",
    "expiresAt": "2024-01-15T12:00:00Z",
    "isExistingUser": false
  }
}
```

**Response (Fehler):**
```json
{
  "message": "Fehlermeldung"
}
```

### 3.2 Einladungs-Token validieren

**Endpoint:** `GET /api/auth/invite/validate?token=<token>`

**Authentifizierung:** Nicht erforderlich

**Query Parameter:**
- `token` (erforderlich) - Einladungs-Token

**Prozess:**
1. Token aus Query-Parameter extrahieren
2. Einladung in Datenbank finden
3. Ablauf prüfen (`expiresAt > now`)
4. Benutzer erstellen (falls nicht vorhanden)
5. Einladung als verwendet markieren (nur beim ersten Mal)
6. Benutzer-Informationen zurückgeben

**Response (Erfolg):**
```json
{
  "success": true,
  "invitation": {
    "name": "Max Mustermann",
    "email": "max@example.com",
    "inviterName": "Anna Schmidt",
    "organizationName": "Meine Organisation"
  },
  "user": {
    "hasPassword": false,
    "email": "max@example.com"
  }
}
```

**Response (Fehler):**
```json
{
  "message": "Ungültiger Einladungslink."
}
```

---

## 4. UserService-Methoden

### Token-Generierung

```typescript
/**
 * Generiert einen sicheren Einladungs-Token
 * @returns 64-stelliger Hex-String (32 Bytes)
 */
static generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
```

### Einladung erstellen

```typescript
/**
 * Erstellt eine neue Einladung in der Datenbank
 * @param invitationData - Einladungsdaten
 * @returns Promise<IInvitation> - Erstellte Einladung
 */
static async createInvitation(invitationData: CreateInvitationData): Promise<IInvitation> {
  const db = await connectToDatabase();
  const collection = db.collection<IInvitation>('invitations');
  
  const invitation: IInvitation = {
    ...invitationData,
    used: false,
    createdAt: new Date()
  };
  
  const result = await collection.insertOne(invitation);
  return { ...invitation, _id: result.insertedId };
}
```

### Einladung finden

```typescript
/**
 * Findet eine Einladung anhand des Tokens
 * WICHTIG: "used" Status wird ignoriert - Link bleibt immer gültig
 * @param token - Einladungs-Token
 * @returns Promise<IInvitation | null>
 */
static async findInvitationByToken(token: string): Promise<IInvitation | null> {
  const db = await connectToDatabase();
  const collection = db.collection<IInvitation>('invitations');
  
  // Nur Token und Ablauf prüfen, nicht "used"
  return collection.findOne({ 
    token, 
    expiresAt: { $gt: new Date() } 
  });
}
```

### Einladung als verwendet markieren

```typescript
/**
 * Markiert eine Einladung als verwendet (nur für Tracking)
 * @param token - Einladungs-Token
 * @returns Promise<boolean> - Erfolg der Operation
 */
static async markInvitationAsUsed(token: string): Promise<boolean> {
  const db = await connectToDatabase();
  const collection = db.collection<IInvitation>('invitations');
  
  const result = await collection.updateOne(
    { token },
    { 
      $set: { 
        used: true, 
        usedAt: new Date() 
      } 
    }
  );
  
  return result.modifiedCount > 0;
}
```

---

## 5. Frontend-Komponenten

### 5.1 Einladungsformular (InviteForm)

**Datei:** `src/components/auth/forms/InviteForm.tsx`

**Funktionalität:**
- Formular zur Eingabe von Einladungsdaten
- Organisation-Auswahl (für Admins)
- Optionale persönliche Nachricht
- Checkbox für "Kann andere Benutzer einladen"
- Validierung und Fehlerbehandlung
- Erfolgs-/Fehlermeldungen

**Formularfelder:**
- Name (erforderlich)
- E-Mail (erforderlich, validiert)
- Organisation (Dropdown, nur für Admins)
- Persönliche Nachricht (optional, Textarea)
- Checkbox "Kann andere Benutzer einladen"

**API-Integration:**
- `POST /api/auth/invite` - Einladung senden
- `GET /api/organizations` - Organisationen laden (für Admins)
- `GET /api/users/isAdmin` - Admin-Status prüfen

**State-Management:**
- Formular-Daten (email, name, message, organizationId, canInvite)
- Loading-State
- Error/Success-Messages
- Organisationen-Liste
- Admin-Status

**Besonderheiten:**
- URL-Parameter für vorausgefüllte Daten (`?email=...&name=...`)
- Automatische Organisation-Zuordnung für Nicht-Admins
- Responsive Design mit Tailwind CSS
- Shadcn UI Komponenten

### 5.2 Einladung annehmen (InviteAcceptPage)

**Datei:** `src/components/invite/InviteAcceptPage.tsx`

**Props:**
```typescript
interface InviteAcceptPageProps {
  token: string;  // Einladungs-Token aus URL
}
```

**Funktionalität:**
- Token-Validierung beim Laden
- Automatische Weiterleitung basierend auf Benutzer-Status
- Loading- und Error-States
- Anzeige von Einladungsinformationen

**Prozess:**
1. Token aus Props extrahieren
2. `GET /api/auth/invite/validate?token=<token>` aufrufen
3. Basierend auf Antwort:
   - **Benutzer hat Passwort:** Weiterleitung zu `/auth/login?email=...&token=...`
   - **Benutzer ohne Passwort:** Weiterleitung zu `/welcome?token=...`
4. Fehlerbehandlung bei ungültigem/abgelaufenem Token

**Weiterleitungslogik:**
```typescript
if (user.hasPassword) {
  // Bestehender Benutzer mit Passwort
  router.push(`/auth/login?email=${email}&token=${token}`)
} else {
  // Neuer Benutzer ohne Passwort
  router.push(`/welcome?token=${token}`)
}
```

### 5.3 Login-Formular Integration

**Datei:** `src/components/auth/forms/LoginForm.tsx`

**Einladungs-Unterstützung:**
- Token aus URL-Parameter lesen (`?token=...`)
- Token-Validierung beim Laden
- Automatische E-Mail-Vorausfüllung
- Passwort-Erstellung für neue Benutzer aktivieren
- Einladungs-Status-Anzeige

**Token-Verarbeitung:**
```typescript
const handleInvitationToken = async (token: string) => {
  const response = await fetch(`/api/auth/invite/validate?token=${token}`)
  const data = await response.json()
  
  if (response.ok && data.success) {
    setEmail(data.invitation.email)
    
    if (!data.user.hasPassword) {
      // Passwort-Erstellung aktivieren
      setIsNewUser(true)
      setShowPasswordCreation(true)
    }
  }
}
```

---

## 6. Authentifizierungs-Integration

### NextAuth.js Integration

**Datei:** `src/lib/auth.ts`

**Einladungs-Login-Typ:**

```typescript
// In authorize-Funktion
else if (credentials?.loginType === 'invite') {
  // Token-basierte Einladungs-Anmeldung
  if (!credentials?.token) {
    return null
  }

  // Einladung validieren
  const invitation = await UserService.findInvitationByToken(credentials.token)
  
  if (!invitation || new Date() > invitation.expiresAt) {
    return null
  }

  // Benutzer finden oder erstellen
  let user = await UserService.findByEmail(invitation.email)
  
  if (!user) {
    user = await UserService.createUser({
      email: invitation.email,
      name: invitation.name,
      role: 'user',
      organizationId: invitation.organizationId,
      organizationName: invitation.organizationName,
      // ... weitere Felder
    })
  }

  // Nur Benutzer ohne Passwort können sich mit Token anmelden
  if (user.password) {
    return null
  }

  // Session-Daten zurückgeben
  return {
    id: user._id?.toString() || '',
    email: user.email,
    name: user.name,
    // ... weitere Felder
  }
}
```

---

## 7. Implementierungsanleitung für andere Projekte

### Schritt 1: Datenbank-Schema erstellen

Erstellen Sie eine `invitations` Collection in Ihrer Datenbank mit dem oben beschriebenen Schema.

### Schritt 2: E-Mail-Service implementieren

Erstellen Sie einen E-Mail-Service, der das `InvitationEmailData`-Interface implementiert:

```typescript
// Beispiel für SendGrid
import sgMail from '@sendgrid/mail'

class EmailService {
  static async sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
    try {
      await sgMail.send({
        to: data.to,
        from: {
          email: process.env.EMAIL_FROM_EMAIL,
          name: process.env.EMAIL_FROM_NAME
        },
        subject: data.subject,
        html: this.generateInvitationHTML(data),
        text: this.generateInvitationText(data)
      })
      return true
    } catch (error) {
      console.error('E-Mail-Versand Fehler:', error)
      return false
    }
  }
  
  private static generateInvitationHTML(data: InvitationEmailData): string {
    // HTML-Template hier implementieren
  }
  
  private static generateInvitationText(data: InvitationEmailData): string {
    // Text-Template hier implementieren
  }
}
```

### Schritt 3: API-Endpunkte erstellen

Implementieren Sie die beiden API-Endpunkte:
- `POST /api/auth/invite` - Einladung erstellen und senden
- `GET /api/auth/invite/validate` - Token validieren

### Schritt 4: UserService-Methoden implementieren

Implementieren Sie die vier UserService-Methoden:
- `generateInvitationToken()`
- `createInvitation()`
- `findInvitationByToken()`
- `markInvitationAsUsed()`

### Schritt 5: Frontend-Komponenten übernehmen

Kopieren Sie die Frontend-Komponenten:
- `InviteForm.tsx` - Anpassen an Ihr Design-System
- `InviteAcceptPage.tsx` - Anpassen an Ihre Routing-Struktur
- Integration in `LoginForm.tsx` - Token-Verarbeitung hinzufügen

### Schritt 6: Authentifizierung integrieren

Integrieren Sie die Token-basierte Anmeldung in Ihr Authentifizierungssystem (z.B. NextAuth.js, Auth0, etc.).

---

## 8. Sicherheitsüberlegungen

### Token-Sicherheit
- Token wird mit `crypto.randomBytes(32)` generiert (64 Zeichen Hex)
- Token ist kryptographisch sicher und nicht vorhersagbar
- Token wird nur einmal in der Datenbank gespeichert

### Ablaufzeiten
- Standard-Gültigkeitsdauer: 7 Tage
- Ablauf wird bei jeder Validierung geprüft
- Abgelaufene Einladungen können nicht verwendet werden

### Validierung
- E-Mail-Format wird validiert (Regex)
- Token-Existenz wird geprüft
- Ablauf wird geprüft
- Benutzer-Existenz wird geprüft

### Zugriffskontrolle
- Nur authentifizierte Benutzer können Einladungen erstellen
- Token-Validierung erfordert keine Authentifizierung (öffentlich)
- Einladungen können mehrfach verwendet werden (nur Tracking durch `used`-Flag)

---

## 9. Anpassungsmöglichkeiten

### Gültigkeitsdauer ändern

In `src/app/api/auth/invite/route.ts`:

```typescript
expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 Tage
// Ändern zu:
expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 Tage
```

### E-Mail-Template anpassen

Passen Sie die HTML- und Text-Templates im E-Mail-Service an Ihre Marke an.

### Zusätzliche Felder

Erweitern Sie `IInvitation` und `CreateInvitationData` um zusätzliche Felder:
- `role` - Benutzerrolle
- `permissions` - Spezifische Berechtigungen
- `metadata` - Zusätzliche Metadaten

### Einladungslimit

Implementieren Sie ein Limit für Einladungen pro Benutzer/Zeitraum.

---

## 10. Fehlerbehandlung

### Häufige Fehler

1. **Ungültige E-Mail-Adresse**
   - Validierung: Regex-Prüfung
   - Response: 400 Bad Request

2. **Token nicht gefunden**
   - Validierung: Datenbankabfrage
   - Response: 404 Not Found

3. **Token abgelaufen**
   - Validierung: `expiresAt > now`
   - Response: 400 Bad Request

4. **E-Mail-Versand fehlgeschlagen**
   - Validierung: E-Mail-Service-Fehler
   - Response: 500 Internal Server Error
   - Einladung bleibt in Datenbank gespeichert

### Fehlerbehandlung im Frontend

- Loading-States während API-Calls
- Error-Messages für Benutzer
- Fallback-Weiterleitungen bei Fehlern
- Retry-Mechanismen für E-Mail-Versand

---

## 11. Testing

### Unit-Tests

- Token-Generierung (Eindeutigkeit, Länge)
- Einladung erstellen (Datenbank-Insert)
- Token finden (korrekte Abfrage)
- Ablauf-Prüfung (Zeit-basiert)

### Integration-Tests

- API-Endpunkt `/api/auth/invite` (vollständiger Flow)
- API-Endpunkt `/api/auth/invite/validate` (Token-Validierung)
- E-Mail-Versand (Mock-Service)

### E2E-Tests

- Einladung erstellen → E-Mail empfangen → Link klicken → Registrierung
- Bestehender Benutzer → Einladung → Login mit Passwort
- Abgelaufene Einladung → Fehlermeldung

---

## 12. Datei-Übersicht

### Backend
- `src/app/api/auth/invite/route.ts` - Einladung erstellen
- `src/app/api/auth/invite/validate/route.ts` - Token validieren
- `src/lib/services/user-service.ts` - UserService-Methoden
- `src/lib/services/mailjet-service.ts` - E-Mail-Service (Beispiel-Implementierung)
- `src/lib/auth.ts` - Authentifizierungs-Integration

### Frontend
- `src/components/auth/forms/InviteForm.tsx` - Einladungsformular
- `src/components/invite/InviteAcceptPage.tsx` - Einladung annehmen
- `src/components/auth/forms/LoginForm.tsx` - Login mit Token-Unterstützung

### Datenbank
- Collection: `invitations` - Einladungen
- Collection: `users` - Benutzer

---

## Zusammenfassung

Dieses System bietet eine vollständige, ISP-unabhängige Lösung für E-Mail-Einladungen:

✅ **Token-basierte Einladungen** - Sichere, eindeutige Links
✅ **Flexible Gültigkeitsdauer** - Konfigurierbar
✅ **Bestehende und neue Benutzer** - Unterschiedliche Flows
✅ **Organisations-Unterstützung** - Multi-Tenant-fähig
✅ **Persönliche Nachrichten** - Optionale Customisierung
✅ **Tracking** - Verwendungs-Status (optional)
✅ **Sicherheit** - Kryptographisch sichere Token
✅ **Wiederverwendbar** - ISP-unabhängige Architektur

Die Implementierung kann mit jedem E-Mail-Service-Provider verwendet werden, indem der `EmailService` entsprechend angepasst wird.



