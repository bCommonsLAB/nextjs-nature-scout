import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { User } from '@/lib/db/models/user';
import mongoose from 'mongoose';

interface UserResult {
  name: string;
  email: string;
  tempClerkId: string;
}

interface ErgebnisStats {
  gefunden: number;
  erstellt: number;
  übersprungen: number;
  benutzer: UserResult[];
}

/**
 * WARNUNG: Dieser Endpunkt ist NUR FÜR ENTWICKLUNGSZWECKE.
 * Er erstellt Benutzer aus Archiv-Einträgen ohne Authentifizierung.
 * Er sollte NICHT in Produktion verfügbar sein.
 */
export async function GET() {
  // Sicherstellen, dass wir nicht in Produktion sind
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Dieser Endpunkt ist nur in Entwicklungsumgebungen verfügbar' },
      { status: 403 }
    );
  }
  
  try {
    // Verbinde zur Datenbank
    await connectToDatabase();
    
    // Hole die Analyse-Jobs Sammlung (anstatt archiv)
    const analyseJobsCollection = mongoose.connection.collection('analyseJobs');
    
    // Debug: Prüfe, ob die Collection existiert und Dokumente enthält
    const countDocs = await analyseJobsCollection.countDocuments();
    console.log(`Die analyseJobs-Collection enthält ${countDocs} Dokumente`);
    
    // Debug: Hole ein Beispieldokument, um die Struktur zu prüfen
    if (countDocs > 0) {
      const sampleDoc = await analyseJobsCollection.findOne();
      console.log('Beispieldokument aus der analyseJobs-Collection:');
      console.log(JSON.stringify(sampleDoc, null, 2));
    }
    
    // Hole alle eindeutigen Personen mit ihren E-Mail-Adressen und Namen aus den Analyse-Jobs
    const allPersonsAggregation = await analyseJobsCollection.aggregate([
      { $match: { deleted: { $ne: true } } },
      { 
        $group: { 
          _id: '$metadata.email', // Gruppiere nach E-Mail
          email: { $first: '$metadata.email' },
          name: { $first: '$metadata.erfassungsperson' } // Name aus erfassungsperson
        } 
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    console.log(`${allPersonsAggregation.length} eindeutige Personen in analyseJobs gefunden`);
    
    // Debug: Zeige die ersten paar Ergebnisse der Aggregation
    if (allPersonsAggregation.length > 0) {
      console.log('Beispielergebnisse der Aggregation:');
      console.log(JSON.stringify(allPersonsAggregation.slice(0, 3), null, 2));
    }
    
    const ergebnisse: ErgebnisStats = {
      gefunden: allPersonsAggregation.length,
      erstellt: 0,
      übersprungen: 0,
      benutzer: []
    };
    
    // Für jede Person aus dem Archiv
    for (const person of allPersonsAggregation) {
      const email = person.email as string;
      const personName = person.name as string || '';
      
      // Debug: Zeige die extrahierten Werte
      console.log(`Verarbeite Person: Email=${email}, Name=${personName}`);
      
      // Prüfe, ob die E-Mail gültig ist
      if (!email || !email.includes('@')) {
        console.log(`Überspringe ungültige E-Mail: ${email}`);
        ergebnisse.übersprungen++;
        continue;
      }
      
      // Prüfe, ob ein Benutzer mit dieser E-Mail bereits existiert
      // Verwende den UserService statt direktem Mongoose-Aufruf
      const userCollection = mongoose.connection.collection('users');
      const existingUser = await userCollection.findOne({ email });
      
      if (existingUser) {
        console.log(`Benutzer mit E-Mail ${email} existiert bereits`);
        ergebnisse.übersprungen++;
        continue;
      }
      
      // Verwende den Namen aus dem Archiv, oder generiere einen aus der E-Mail
      let name = personName.trim();
      if (!name) {
        // Erstelle einen Namen aus dem Teil vor dem @
        const emailParts = email.split('@');
        if (emailParts.length > 0 && emailParts[0]) {
          const namePart = emailParts[0];
          name = namePart
            .replace(/[.]/g, ' ')
            .replace(/(\w)(\w*)/g, (_g0: string, g1: string, g2: string) => g1.toUpperCase() + g2);
        } else {
          name = `Benutzer-${Math.random().toString(36).substring(2, 8)}`;
        }
      }
      
      // Generiere eine temporäre Clerk-ID, die später aktualisiert wird
      const tempClerkId = `temp_${Math.random().toString(36).substring(2, 10)}`;
      
      // Erstelle einen neuen Benutzer
      const newUser = new User({
        clerkId: tempClerkId,
        email,
        name,
        role: 'user'
      });
      
      await newUser.save();
      console.log(`Benutzer erstellt: ${name} (${email})`);
      ergebnisse.erstellt++;
      ergebnisse.benutzer.push({
        name,
        email,
        tempClerkId
      });
    }
    
    return NextResponse.json({
      message: 'Benutzer aus Analyse-Jobs erstellt',
      ergebnisse
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Benutzer aus Analyse-Jobs:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: (error as Error).message },
      { status: 500 }
    );
  }
} 