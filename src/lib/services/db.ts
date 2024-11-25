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
  try {
    if (!client) {
      client = new MongoClient(uri, options);
      await client.connect();
    }
    
    return client.db('naturescout');
  } catch (error) {
    console.error('MongoDB Verbindungsfehler:', error);
    throw new Error('Datenbankverbindung konnte nicht hergestellt werden');
  }
}

// Optional: Cleanup-Funktion für Tests oder Server-Shutdown
export async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
  }
}
