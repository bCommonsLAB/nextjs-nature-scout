/**
 * Dieses Skript erstellt einen Admin-Benutzer in der MongoDB
 * Ausführung: node src/scripts/create-admin.js
 */

// Lade Umgebungsvariablen
require('dotenv').config();

const mongoose = require('mongoose');
const readline = require('readline');

// Verbindung zur MongoDB herstellen
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI muss in der .env-Datei definiert sein.');
  process.exit(1);
}

// User-Schema definieren
const UserSchema = new mongoose.Schema({
  clerkId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  email: { 
    type: String, 
    required: true,
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'superadmin'], 
    default: 'user' 
  },
}, {
  timestamps: true,
});

// Benutzer-Interface für die Eingabe
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAdmin() {
  try {
    // Verbindung zur Datenbank herstellen
    console.log('Verbindung zur MongoDB wird hergestellt...');
    await mongoose.connect(MONGODB_URI);
    
    // User-Modell erstellen
    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    
    // Benutzerdaten abfragen
    rl.question('Clerk-ID des Benutzers: ', (clerkId) => {
      rl.question('E-Mail des Benutzers: ', (email) => {
        rl.question('Name des Benutzers: ', async (name) => {
          try {
            // Prüfen, ob Benutzer bereits existiert
            const existingUser = await User.findOne({ clerkId });
            
            if (existingUser) {
              // Update den bestehenden Benutzer zum Admin
              existingUser.role = 'admin';
              await existingUser.save();
              console.log(`Benutzer ${existingUser.name} wurde zum Admin hochgestuft.`);
            } else {
              // Erstelle neuen Admin-Benutzer
              const adminUser = new User({
                clerkId,
                email,
                name,
                role: 'admin'
              });
              
              await adminUser.save();
              console.log(`Admin-Benutzer ${name} wurde erfolgreich erstellt.`);
            }
          } catch (error) {
            console.error('Fehler beim Erstellen oder Aktualisieren des Admin-Benutzers:', error);
          } finally {
            // Verbindung schließen und Programm beenden
            mongoose.connection.close();
            rl.close();
          }
        });
      });
    });
  } catch (error) {
    console.error('Fehler bei der Verbindung zur Datenbank:', error);
    rl.close();
  }
}

createAdmin(); 