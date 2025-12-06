# React2Shell Sicherheitsupdate (CVE-2025-55182)

## Übersicht

Dieses Dokument beschreibt die Sicherheitslücke React2Shell (CVE-2025-55182) und die durchgeführten Maßnahmen zur Absicherung des Projekts.

## Was ist React2Shell?

React2Shell ist eine kritische Sicherheitslücke in React Server Components, die es Angreifern ermöglicht, ohne Authentifizierung beliebigen Code auf dem Server auszuführen (Remote Code Execution - RCE).

### Betroffene Versionen

- **Next.js**: Versionen zwischen 15.0.0 und 16.0.6
- **Unser Projekt**: War betroffen mit Next.js 15.3.1

### Gepatchte Versionen

- **Next.js 15.3.x**: Ab Version 15.3.6
- **Next.js 16.x**: Ab Version 16.0.7

## Durchgeführte Maßnahmen

### 1. Next.js Update

**Datum**: 06.12.2025  
**Von**: Next.js 15.3.1  
**Auf**: Next.js 15.3.6

```bash
npm install next@15.3.6
```

**Status**: ✅ Abgeschlossen

### 2. Code-Analyse

Es wurde eine umfassende Analyse des Codes durchgeführt, um potenzielle Angriffsvektoren zu identifizieren.

#### Server Components mit User-Input

Die folgenden Server Components wurden analysiert:

1. **`src/app/invite/[token]/page.tsx`**
   - Extrahiert `token` aus URL-Parametern
   - Gibt Token als Prop an Client Component weiter
   - **Risiko**: Niedrig - Token wird validiert und nur als String weitergegeben
   - **Status**: ✅ Sicher

2. **`src/app/admin/layout.tsx`**
   - Keine User-Inputs
   - **Risiko**: Kein Risiko
   - **Status**: ✅ Sicher

3. **`src/app/naturescout/page.tsx`**
   - Keine User-Inputs
   - **Risiko**: Kein Risiko
   - **Status**: ✅ Sicher

4. **`src/app/page.tsx`**
   - Keine User-Inputs
   - **Risiko**: Kein Risiko
   - **Status**: ✅ Sicher

#### API Routes

Alle API Routes wurden auf unsichere Deserialisierung geprüft:

- ✅ Keine Verwendung von `eval()` gefunden
- ✅ Keine Verwendung von `dangerouslySetInnerHTML` gefunden
- ✅ Keine Verwendung von `Function()` Constructor gefunden
- ✅ User-Inputs werden über `request.json()` verarbeitet und validiert

#### Client Components

Client Components sind nicht direkt von React2Shell betroffen, da die Schwachstelle spezifisch für React Server Components ist.

### 3. Best Practices für zukünftige Entwicklung

#### Server Components

1. **Nie unvalidierte User-Inputs direkt rendern**
   ```typescript
   // ❌ SCHLECHT
   export default function Page({ params }: { params: { id: string } }) {
     return <div>{params.id}</div>; // Gefährlich!
   }
   
   // ✅ GUT
   export default function Page({ params }: { params: { id: string } }) {
     const validatedId = validateId(params.id); // Validierung
     return <div>{validatedId}</div>;
   }
   ```

2. **Immer Validierung verwenden**
   - Verwende Zod oder ähnliche Validierungsbibliotheken
   - Prüfe Datentypen und Formate
   - Sanitize User-Inputs

3. **Keine dynamische Code-Ausführung**
   - Keine `eval()`
   - Keine `Function()` Constructor
   - Keine `dangerouslySetInnerHTML` ohne Sanitization

#### API Routes

1. **Input-Validierung**
   ```typescript
   import { z } from 'zod';
   
   const schema = z.object({
     email: z.string().email(),
     name: z.string().min(1)
   });
   
   export async function POST(request: Request) {
     const body = await request.json();
     const validated = schema.parse(body); // Wirft Fehler bei ungültigen Daten
     // ...
   }
   ```

2. **Fehlerbehandlung**
   - Keine detaillierten Fehlermeldungen an Clients
   - Logge Fehler server-seitig
   - Verwende generische Fehlermeldungen

## Überwachung

### Empfohlene Maßnahmen

1. **Regelmäßige Updates**
   - Prüfe monatlich auf Next.js Security Updates
   - Abonniere Next.js Security Advisories
   - Verwende `npm audit` regelmäßig

2. **Logging**
   - Überwache ungewöhnliche API-Anfragen
   - Logge alle Fehler in API Routes
   - Setze Alerts für verdächtige Aktivitäten

3. **WAF (Web Application Firewall)**
   - Wenn auf Vercel gehostet: WAF-Regeln sind bereits aktiv
   - Prüfe Vercel Dashboard auf Blocked Requests

## Referenzen

- [Vercel Blog: Resources for protecting against React2Shell](https://vercel.com/blog/resources-for-protecting-against-react2shell)
- [CVE-2025-55182](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2025-55182)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)

## Changelog

- **06.12.2025**: Next.js von 15.3.1 auf 15.3.6 aktualisiert
- **06.12.2025**: Code-Analyse durchgeführt
- **06.12.2025**: Sicherheitsdokumentation erstellt

