import { MongoClient } from 'mongodb';
//test
const uri = process.env.MONGODB_URI || '';
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client: MongoClient | null = null;

export async function connectToDatabase() {
  let step=0;
  try {
    if (!client) {
      client = new MongoClient(uri, options);
      step+=1;
      await client.connect();
      step+=1;
    }
    return client.db(process.env.MONGODB_DATABASE_NAME || 'naturescout');
  } catch (error) {
    console.error('MongoDB Verbindungsfehler:', error);
    throw new Error(
      `Datenbankverbindung fehlgeschlagen: step ${step} ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    );
  }
}

// Optional: Cleanup-Funktion für Tests oder Server-Shutdown
export async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
  }
}
