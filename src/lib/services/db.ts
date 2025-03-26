import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;

export async function connectToDatabase(): Promise<Db> {
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

    client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 75000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      retryReads: true
    });

    await client.connect();
    
    const dbName = process.env.MONGODB_DATABASE_NAME;
    if (!dbName) {
      throw new Error('MONGODB_DATABASE_NAME ist nicht definiert');
    }
    
    return client.db(dbName);
  } catch (error) {
    console.error('MongoDB Verbindungsfehler:', error);
    
    // Verbindung bei Fehler zurücksetzen
    if (client) {
      await client.close();
      client = null;
    }
    
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
}

// Prozess-Beendigung behandeln
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await closeDatabaseConnection();
    process.exit(0);
  });
}
