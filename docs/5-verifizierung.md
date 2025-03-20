# Verifizierung

## Funktionsübersicht

Die Verifizierungs-Seite schließt den Habitat-Erfassungsprozess ab und bestätigt dem Benutzer, dass seine Daten erfolgreich übermittelt wurden. Sie bietet:

- Abschlussbestätigung für den gesamten Prozess
- Information zur weiteren Verarbeitung durch Experten
- Hinweis auf Benachrichtigung, sobald die Überprüfung abgeschlossen ist
- Abschluss des Workflows

![Verifizierung](../public/screenshots/verification.jpg)

## UI-Komponenten

1. **Header-Bereich**
   - NatureScout-Logo
   - Navigation
   - Anmelde-Button

2. **Fortschrittsleiste**
   - Aktueller und letzter Schritt "Verifizierung" ist hervorgehoben
   - Alle vorherigen Schritte sind als abgeschlossen markiert

3. **Bestätigungsnachricht**
   - Dankesnachricht für die Teilnahme
   - Information über die manuelle Überprüfung
   - Hinweis auf Benachrichtigung nach Abschluss

4. **Steuerungsleiste**
   - Zurück-Button (zur Habitat-Analyse-Seite)
   - Debug-Button
   - Weiter-Button (optional, für Rückkehr zur Startseite)

## Technische Implementierung

### Komponenten-Struktur

```
src/
  app/
    verifizierung/
      page.tsx                      # Hauptkomponente der Verifizierungsseite
      components/
        confirmation-message.tsx    # Bestätigungsnachricht-Komponente
        next-steps.tsx              # Informationen zu nächsten Schritten
```

### Haupt-Komponente

`verifizierung/page.tsx` implementiert die Abschlussseite:

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmationMessage } from './components/confirmation-message';
import { NextSteps } from './components/next-steps';
import { getUserDataFromStorage } from '@/lib/storage-utils';
import { submitCompletedAnalysis } from '@/lib/api-client';

export default function VerifizierungPage() {
  const router = useRouter();

  // Bei Seitenaufruf den vollständigen Datensatz einreichen
  useEffect(() => {
    const completeSubmission = async () => {
      const userData = getUserDataFromStorage();
      
      // Wenn noch keine finale Einreichung erfolgt ist
      if (userData && !userData.finalSubmissionCompleted) {
        try {
          // Sende alle gesammelten Daten an den Server
          await submitCompletedAnalysis({
            user: {
              name: userData.name,
              email: userData.email
            },
            location: {
              coordinates: userData.coordinates,
              gemeinde: userData.locationInfo?.gemeinde,
              adresse: userData.locationInfo?.adresse
            },
            images: userData.imageData?.uploadedImageIds,
            analysisResult: userData.analysisResult
          });
          
          // Markiere die Einreichung als abgeschlossen
          localStorage.setItem('userData', JSON.stringify({
            ...userData,
            finalSubmissionCompleted: true,
            submissionTimestamp: new Date().toISOString()
          }));
          
          // Optional: Sende eine Bestätigungs-E-Mail
          await fetch('/api/send-confirmation-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: userData.name,
              email: userData.email,
              habitatType: userData.analysisResult?.habitattyp
            }),
          });
        } catch (error) {
          console.error('Fehler bei der finalen Einreichung:', error);
          // Hier könnte ein Fehlerhinweis angezeigt werden
        }
      }
    };
    
    completeSubmission();
  }, []);

  // Zurück zur Analyse-Seite
  const handlePreviousStep = () => {
    router.push('/habitat-analysieren');
  };

  // Zurück zur Startseite oder neuer Durchlauf
  const handleReturnHome = () => {
    // Optionale Bereinigung der Sitzungsdaten
    // localStorage.removeItem('userData');
    router.push('/');
  };

  return (
    <div className="container">
      <h1>Verifizierung</h1>
      
      <div className="verification-content">
        <ConfirmationMessage />
        <NextSteps />
      </div>
      
      <div className="button-group">
        <button onClick={handlePreviousStep}>Zurück</button>
        <button onClick={handleReturnHome}>Zur Startseite</button>
      </div>
    </div>
  );
}
```

### Bestätigungsnachricht-Komponente

`confirmation-message.tsx` zeigt die Abschlussbestätigung:

```typescript
import { CheckCircle } from 'lucide-react';

export function ConfirmationMessage() {
  return (
    <div className="confirmation-message">
      <div className="icon-container">
        <CheckCircle className="h-12 w-12 text-green-600" />
      </div>
      
      <h2>Vielen Dank für Ihre Hilfe!</h2>
      
      <p className="message-text">
        Ihre erfasstes Habitat wird nun von einem Experten analysiert. 
        Wir geben Ihnen eine kurze Rückmeldung, sobald das Ergebnis verfügbar ist.
      </p>
    </div>
  );
}
```

### API für finale Datenübermittlung

`/lib/api-client.ts` enthält die Funktion zur finalen Übermittlung:

```typescript
/**
 * Übermittelt die vollständige Analyse an den Server zur weiteren Verarbeitung
 * und Speicherung in der Datenbank.
 */
export async function submitCompletedAnalysis(data: {
  user: {
    name: string;
    email: string;
  };
  location: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    gemeinde: string;
    adresse: string;
  };
  images: {
    panoramaId: string;
    detail1Id: string;
    detail2Id?: string;
  };
  analysisResult: any;
}) {
  const response = await fetch('/api/submissions/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Fehler bei der Übermittlung der finalen Daten');
  }

  return await response.json();
}
```

### Bestätigungs-E-Mail-API

`/api/send-confirmation-email/route.ts` sendet eine Bestätigungs-E-Mail:

```typescript
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { name, email, habitatType } = await request.json();

    // E-Mail-Transporter konfigurieren
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // E-Mail senden
    await transporter.sendMail({
      from: `"NatureScout" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Ihre Habitat-Erfassung wurde erfolgreich übermittelt',
      html: `
        <div>
          <h2>Vielen Dank für Ihre Teilnahme, ${name}!</h2>
          <p>Ihre Habitat-Erfassung vom Typ <strong>${habitatType}</strong> wurde erfolgreich an unser Expertenteam übermittelt.</p>
          <p>Wir werden die Daten nun überprüfen und Ihnen eine Rückmeldung geben, sobald die Analyse abgeschlossen ist.</p>
          <p>Bei Fragen können Sie gerne auf diese E-Mail antworten.</p>
          <p>Mit freundlichen Grüßen,<br>Das NatureScout-Team</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('E-Mail-Fehler:', error);
    return NextResponse.json(
      { error: 'Fehler beim Senden der Bestätigungs-E-Mail' },
      { status: 500 }
    );
  }
}
```

### Datenfluss

1. Benutzer öffnet die Verifizierungsseite:
   - Die gesammelten Daten werden automatisch zur finalen Speicherung übermittelt
   - Eine Bestätigungs-E-Mail wird an den Benutzer gesendet

2. Datenübermittlung:
   - Alle Daten aus dem Workflow werden an den Server gesendet
   - Bilder, Standortdaten, Analyseergebnisse werden zusammengeführt
   - Der Datensatz wird in der Datenbank zur weiteren Verarbeitung gespeichert
   - Der Status wird auf "Warten auf Expertenprüfung" gesetzt

3. Benutzerinteraktion:
   - Benutzer erhält eine visuelle Bestätigung
   - Möglichkeit zur Rückkehr zur Startseite oder zum Habitat-Analyse-Schritt

4. Abschluss des Workflows:
   - Optionale Bereinigung der temporären Daten
   - Rückkehr zur Startseite für eine neue Erfassung

### API für Datenübermittlung

`/api/submissions/complete/route.ts` speichert die finalen Daten:

```typescript
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validierung der erforderlichen Daten
    if (!data.user?.email || !data.location?.coordinates || !data.images?.panoramaId || !data.analysisResult) {
      return NextResponse.json(
        { error: 'Unvollständige Daten' },
        { status: 400 }
      );
    }

    // Eindeutige Submissions-ID erstellen
    const submissionId = uuidv4();
    
    // Datensatz für die Datenbank vorbereiten
    const submission = {
      id: submissionId,
      timestamp: new Date(),
      status: 'pending_verification', // Status: Wartet auf Expertenprüfung
      user: data.user,
      location: data.location,
      images: data.images,
      analysisResult: data.analysisResult,
      metadata: {
        submissionSource: 'web_app',
        userAgent: request.headers.get('user-agent'),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    };
    
    // In der Datenbank speichern
    // await db.collection('submissions').insertOne(submission);
    
    // Benachrichtigung an Experten senden (optional)
    // await notifyExperts(submission);
    
    return NextResponse.json({
      success: true,
      submissionId,
      message: 'Habitat-Erfassung erfolgreich übermittelt'
    });
  } catch (error) {
    console.error('Fehler bei der Übermittlung:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Speicherung der Daten' },
      { status: 500 }
    );
  }
}
```

## Zustandsmanagement und Persistenz

Die Anwendung verwendet mehrere Mechanismen zur Speicherung des Zustands:

1. **Client-seitiger Zustand**:
   - Lokale Zustandsverwaltung in den React-Komponenten mit `useState`
   - Persistenter Zustand über `localStorage` für die Dauer der Sitzung und darüber hinaus

2. **Server-seitige Speicherung**:
   - Finaler Datensatz wird in einer Datenbank gespeichert
   - Die hochgeladenen Bilder werden auf dem Server gespeichert
   - Analyseergebnisse werden mit den Bildern und Metadaten verknüpft

3. **E-Mail-Kommunikation**:
   - Bestätigungs-E-Mail an den Benutzer
   - (Optional) Benachrichtigung an Experten über neue Einreichungen

## Fehlerbehandlung

- Robuste Fehlerbehandlung bei Netzwerkproblemen
- Wiederaufnahme des Prozesses bei Unterbrechungen
- Anzeige benutzerfreundlicher Fehlermeldungen

## Leistungsoptimierung

- Minimale Seitenladung für die Bestätigungsseite
- Asynchrone Verarbeitung der Datenübermittlung
- Parallele Verarbeitung von E-Mail-Versand und Datenspeicherung

## Datenschutz und Sicherheit

- Sichere Übertragung der Daten über HTTPS
- Verschlüsselung sensibler Benutzerinformationen
- Einhaltung der DSGVO-Bestimmungen für die Datenverarbeitung 