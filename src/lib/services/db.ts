import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;

export async function connectToDatabase() {
  try {
    // Check if client exists and is connected
    if (client?.connect && client.db(process.env.MONGODB_DATABASE_NAME)) {
      return client.db(process.env.MONGODB_DATABASE_NAME);
    }

    // Wenn keine Verbindung besteht, neue aufbauen
    client = new MongoClient(process.env.MONGODB_URI as string, {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000
    });

    await client.connect();
    
    // Ping zur Überprüfung der Verbindung
    await client.db("admin").command({ ping: 1 });
    console.log("MongoDB Verbindung erfolgreich hergestellt");
    
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
