/**
 * MongoDB-Verbindungstest-Script
 * Führt einen einfachen Verbindungstest durch und gibt Debug-Informationen aus
 * 
 * Verwendet die Umgebungsvariablen aus .env.local (wird von Next.js geladen)
 * oder direkt aus process.env
 */

// Lade Umgebungsvariablen aus .env oder .env.local
const fs = require('fs');
const path = require('path');

function loadEnvFile(fileName) {
  const envPath = path.join(process.cwd(), fileName);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value.trim();
        }
      }
    });
    return true;
  }
  return false;
}

// Versuche zuerst .env.local, dann .env zu laden
if (loadEnvFile('.env.local')) {
  console.log('✅ .env.local geladen\n');
} else if (loadEnvFile('.env')) {
  console.log('✅ .env geladen\n');
} else {
  console.log('⚠️  Weder .env noch .env.local gefunden - verwende process.env\n');
}

const { MongoClient } = require('mongodb');

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DATABASE_NAME;

  console.log('🔍 MongoDB-Verbindungstest\n');
  console.log('Umgebungsvariablen:');
  console.log(`  MONGODB_URI: ${uri ? uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : '❌ NICHT GESETZT'}`);
  console.log(`  MONGODB_DATABASE_NAME: ${dbName || '❌ NICHT GESETZT'}\n`);

  if (!uri) {
    console.error('❌ FEHLER: MONGODB_URI ist nicht definiert!');
    console.log('\n💡 Tipp: Erstelle eine .env.local Datei mit:');
    console.log('   MONGODB_URI=mongodb://localhost:27017');
    console.log('   MONGODB_DATABASE_NAME=deine-datenbank');
    process.exit(1);
  }

  if (!dbName) {
    console.error('❌ FEHLER: MONGODB_DATABASE_NAME ist nicht definiert!');
    process.exit(1);
  }

  let client = null;
  try {
    console.log('🔄 Versuche Verbindung herzustellen...');
    
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000, // Kurzer Timeout für schnelles Feedback
      connectTimeoutMS: 5000
    });

    await client.connect();
    console.log('✅ Verbindung erfolgreich hergestellt!\n');

    // Teste Datenbankzugriff
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    
    console.log(`📊 Datenbank: ${dbName}`);
    console.log(`📁 Collections gefunden: ${collections.length}`);
    
    if (collections.length > 0) {
      console.log('\nCollections:');
      collections.forEach(col => {
        console.log(`  - ${col.name}`);
      });
    }

    // Teste Ping
    await db.admin().ping();
    console.log('\n✅ Ping erfolgreich - Datenbank ist erreichbar');

    // Teste eine einfache Query (falls analyseJobs existiert)
    const collectionName = process.env.MONGODB_COLLECTION_NAME || 'analyseJobs';
    const collection = db.collection(collectionName);
    const count = await collection.countDocuments({});
    console.log(`\n📈 Dokumente in "${collectionName}": ${count}`);

    console.log('\n✅ Alle Tests erfolgreich!');
    
  } catch (error) {
    console.error('\n❌ FEHLER beim Verbindungstest:');
    console.error(`   ${error.message}`);
    
    if (error.message.includes('timeout')) {
      console.log('\n💡 Mögliche Lösungen:');
      console.log('   1. Prüfe, ob MongoDB läuft: Get-Service MongoDB (Windows)');
      console.log('   2. Prüfe die MONGODB_URI (korrekte Adresse/Port?)');
      console.log('   3. Bei MongoDB Atlas: Prüfe IP-Whitelist und Credentials');
      console.log('   4. Prüfe Firewall-Einstellungen');
    } else if (error.message.includes('authentication')) {
      console.log('\n💡 Authentifizierungsfehler:');
      console.log('   1. Prüfe Benutzername und Passwort in MONGODB_URI');
      console.log('   2. Bei MongoDB Atlas: Prüfe Database User Credentials');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Netzwerkfehler:');
      console.log('   1. MongoDB-Server läuft möglicherweise nicht');
      console.log('   2. Falsche Host-Adresse in MONGODB_URI');
      console.log('   3. Port ist möglicherweise blockiert');
    }
    
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Verbindung geschlossen');
    }
  }
}

testConnection().catch(console.error);

