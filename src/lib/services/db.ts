import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let connectionPromise: Promise<Db> | null = null;

export async function connectToDatabase(): Promise<Db> {
  // Wenn bereits eine Verbindung läuft, warte darauf
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = _connectToDatabase();
  return connectionPromise;
}

async function _connectToDatabase(): Promise<Db> {
  try {
    // Check if client exists and is connected
    if (client?.connect && client.db(process.env.MONGODB_DATABASE_NAME)) {
      return client.db(process.env.MONGODB_DATABASE_NAME);
    }

    // Wenn keine Verbindung besteht, neue aufbauen
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI ist nicht definiert');
    }

    // Verbesserte Konfiguration für Produktionsumgebung
    client = new MongoClient(uri, {
      maxPoolSize: 20, // Erhöht für bessere Performance
      minPoolSize: 10, // Erhöht für stabilere Verbindungen
      serverSelectionTimeoutMS: 10000, // Reduziert von 30s auf 10s
      socketTimeoutMS: 45000, // Reduziert von 75s auf 45s
      connectTimeoutMS: 10000, // Reduziert von 30s auf 10s
      retryWrites: true,
      retryReads: true,
      // Zusätzliche Optionen für bessere Stabilität
      maxIdleTimeMS: 30000, // Verbindungen nach 30s Leerlauf schließen
      heartbeatFrequencyMS: 10000, // Häufigere Heartbeats
      // Retry-Logik für Verbindungsfehler
      retryReads: true,
      retryWrites: true,
      // Writable concern für bessere Konsistenz
      w: 'majority',
      wtimeout: 5000
    });

    await client.connect();
    
    const dbName = process.env.MONGODB_DATABASE_NAME;
    if (!dbName) {
      throw new Error('MONGODB_DATABASE_NAME ist nicht definiert');
    }
    
    console.log('✅ MongoDB-Verbindung erfolgreich hergestellt');
    return client.db(dbName);
  } catch (error) {
    console.error('❌ MongoDB Verbindungsfehler:', error);
    
    // Verbindung bei Fehler zurücksetzen
    if (client) {
      await client.close();
      client = null;
    }
    
    // Connection Promise zurücksetzen für Retry
    connectionPromise = null;
    
    throw new Error(
      `Datenbankverbindung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    );
  }
}

// Optional: Cleanup-Funktion für die Verbindung
export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
  connectionPromise = null;
}

// Prozess-Beendigung behandeln
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await closeDatabaseConnection();
    process.exit(0);
  });
}
