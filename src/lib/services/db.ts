import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;

export async function connectToDatabase() {
  try {
    console.log("MONGODB_DATABASE_NAME: ", process.env.MONGODB_DATABASE_NAME);
    // Check if client exists and is connected
    if (client?.connect && client.db(process.env.MONGODB_DATABASE_NAME)) {
      return client.db(process.env.MONGODB_DATABASE_NAME);
    }

    console.log("MONGODB_URI: ", process.env.MONGODB_URI);
    // Wenn keine Verbindung besteht, neue aufbauen
    client = new MongoClient(process.env.MONGODB_URI as string, {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 75000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      retryReads: true
    });

    await client.connect();
    
    return client.db(process.env.MONGODB_DATABASE_NAME);
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
export async function closeDatabaseConnection() {
  if (client) {
    await client.close();
    client = null;
    console.log('MongoDB Verbindung geschlossen');
  }
}

// Prozess-Beendigung behandeln
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await closeDatabaseConnection();
    process.exit(0);
  });
}
