import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { auth } from '@clerk/nextjs/server';
import { UserService } from '@/lib/services/user-service';
import { AzureStorageService } from '@/lib/services/azure-storage-service';
import sharp from 'sharp';

// Interface für die Bildmetadaten
interface StorageImage {
  url: string;
  filename: string;
  inUse: boolean;
  lowResExists: boolean;
}

// Nur Admin-Zugriff
async function checkAdminAccess() {
  const { userId } = await auth();
  
  if (!userId) {
    return { isAdmin: false, error: 'Nicht angemeldet' };
  }
  
  const isAdmin = await UserService.isAdmin(userId);
  
  if (!isAdmin) {
    return { isAdmin: false, error: 'Keine Administratorrechte' };
  }
  
  return { isAdmin: true, error: null };
}

// Liste aller Bilder aus Azure Storage abrufen
async function getAllStorageImages(): Promise<StorageImage[]> {
  try {
    const azureStorage = new AzureStorageService();
    const storedImages = await azureStorage.getStoredImages();
    
    // Konvertiere die abgerufenen Bilder in das StorageImage-Format
    // Filtere explizit alle _low.jpg Dateien aus der Hauptliste heraus
    const filteredImages = storedImages.filter(image => !image.filename.endsWith('_low.jpg'));
    
    console.log(`Von ${storedImages.length} Bildern in Azure sind ${filteredImages.length} normale Bilder und ${storedImages.length - filteredImages.length} Low-Resolution-Bilder`);
    
    return filteredImages.map(image => ({
      url: image.url,
      filename: image.filename,
      inUse: false, // Wird später in der Hauptfunktion aktualisiert
      lowResExists: storedImages.some(img => 
        img.filename === image.filename.replace('.jpg', '_low.jpg'))
    }));
  } catch (error) {
    console.error("Fehler beim Abrufen der Bilder aus Azure Storage:", error);
    return [];
  }
}

// Bilder in Verwendung ermitteln
async function getImagesInUse(): Promise<Set<string>> {
  const usedImages = new Set<string>();
  
  try {
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    // Nur aktive (nicht gelöschte) Habitate einbeziehen
    const cursor = collection.find(
      { deleted: { $ne: true } }, 
      { projection: { 'metadata.bilder': 1 } }
    );
    
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const bilder = doc?.metadata?.bilder || [];
      
      for (const bild of bilder) {
        if (bild.url) {
          usedImages.add(bild.url);
          
          // Auch Low-Res-URLs hinzufügen, falls vorhanden
          if (bild.lowResUrl) {
            usedImages.add(bild.lowResUrl);
          }
        }
      }
    }
    
    await cursor.close();
  } catch (error) {
    console.error('Fehler beim Abrufen der verwendeten Bilder:', error);
  }
  
  return usedImages;
}

// Low-Resolution-Version eines Bildes erstellen
async function createLowResVersion(imageUrl: string, filename: string, simulateOnly = true): Promise<string | null> {
  // Prüfen, ob es sich bereits um ein _low Bild handelt - in diesem Fall nichts tun
  if (filename.includes('_low.jpg')) {
    console.log(`Überspringe ${filename}: Bereits ein Low-Resolution-Bild`);
    return null;
  }
  
  console.log(`Start createLowResVersion für ${filename}, Simulationsmodus: ${simulateOnly}`);
  
  if (simulateOnly === true) {
    // Simulation: Low-Res-Dateiname zurückgeben
    const lowResFilename = filename.replace('.jpg', '_low.jpg');
    const simulatedUrl = `${imageUrl.substring(0, imageUrl.lastIndexOf('/'))}/${lowResFilename}`;
    console.log(`Simulation: Low-Res URL wäre: ${simulatedUrl}`);
    return simulatedUrl;
  }
  
  try {
    console.log("ECHTMODUS aktiviert - erstelle tatsächlich Low-Res-Version!");
    const LOW_RES_MAX_SIZE = 360;
    console.log(`Echtmodus: Lade Bild herunter von: ${imageUrl}`);
    
    // Original-Bild herunterladen
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Fehler beim Herunterladen des Bildes: ${response.statusText}`);
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`Bild heruntergeladen: ${imageBuffer.length} Bytes`);
    
    // Bild-Metadaten ermitteln
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    console.log(`Bild-Dimensionen: ${width}x${height}`);
    
    // Neue Dimensionen berechnen
    let lowResWidth = width;
    let lowResHeight = height;
    
    if (width > height) {
      if (width > LOW_RES_MAX_SIZE) {
        lowResHeight = Math.round((height * LOW_RES_MAX_SIZE) / width);
        lowResWidth = LOW_RES_MAX_SIZE;
      }
    } else {
      if (height > LOW_RES_MAX_SIZE) {
        lowResWidth = Math.round((width * LOW_RES_MAX_SIZE) / height);
        lowResHeight = LOW_RES_MAX_SIZE;
      }
    }
    
    console.log(`Neue Dimensionen für Low-Res: ${lowResWidth}x${lowResHeight}`);
    
    // Low-Res-Version erstellen
    const lowResBuffer = await sharp(imageBuffer)
      .resize(lowResWidth, lowResHeight)
      .jpeg({ quality: 80 })
      .toBuffer();
    
    console.log(`Low-Res-Version erstellt: ${lowResBuffer.length} Bytes`);
    
    // Neuen Dateinamen erstellen
    const lowResFilename = filename.replace('.jpg', '_low.jpg');
    console.log(`Neuer Dateiname: ${lowResFilename}`);
    
    // Auf Azure hochladen
    const azureStorage = new AzureStorageService();
    console.log(`Lade Low-Res-Version auf Azure hoch...`);
    const lowResUrl = await azureStorage.uploadImage(lowResFilename, lowResBuffer);
    
    console.log(`Low-Res-Version hochgeladen, URL: ${lowResUrl}`);
    return lowResUrl;
  } catch (error) {
    console.error(`FEHLER beim Erstellen der Low-Res-Version für ${filename}:`, error);
    return null;
  }
}

// Bilder aktualisieren in der Datenbank
async function updateImagesInDatabase(updatedImages: Map<string, string>, simulateOnly = true): Promise<number> {
  console.log(`Start updateImagesInDatabase mit ${updatedImages.size} Bildern, Simulationsmodus: ${simulateOnly}`);
  
  if (simulateOnly === true || updatedImages.size === 0) {
    console.log(`Simulationsmodus (${simulateOnly}) oder keine Bilder zum Aktualisieren (${updatedImages.size}). Rückgabe: ${updatedImages.size}`);
    return updatedImages.size;
  }
  
  console.log("ECHTMODUS aktiviert - aktualisiere tatsächlich die Datenbank!");
  
  let updatedCount = 0;
  
  try {
    const db = await connectToDatabase();
    const collectionName = process.env.MONGODB_COLLECTION_NAME || 'analyseJobs';
    console.log(`Verbunden mit Datenbank, Collection: ${collectionName}`);
    
    const collection = db.collection(collectionName);
    
    // Für jedes Dokument prüfen und aktualisieren
    console.log(`Suche nach Dokumenten zum Aktualisieren...`);
    const cursor = collection.find(
      { deleted: { $ne: true } }, 
      { projection: { _id: 1, 'metadata.bilder': 1 } }
    );
    
    let processedDocs = 0;
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      processedDocs++;
      
      if (!doc?._id || !doc?.metadata?.bilder) {
        console.log(`Dokument #${processedDocs} hat keine Bilder oder keine ID`);
        continue;
      }
      
      let updated = false;
      const bilder = doc.metadata.bilder;
      console.log(`Dokument #${processedDocs} - ID: ${doc._id}, Bilder: ${bilder.length}`);
      
      // Prüfen, ob Bilder aktualisiert werden müssen
      for (const bild of bilder) {
        if (bild.url && updatedImages.has(bild.url) && !bild.lowResUrl) {
          const newLowResUrl = updatedImages.get(bild.url);
          console.log(`Update für Bild: ${bild.url} -> Low-Res: ${newLowResUrl}`);
          bild.lowResUrl = newLowResUrl;
          updated = true;
        }
      }
      
      // Dokument aktualisieren, wenn nötig
      if (updated) {
        console.log(`Aktualisiere Dokument ${doc._id}...`);
        const result = await collection.updateOne(
          { _id: doc._id },
          { $set: { 'metadata.bilder': bilder } }
        );
        console.log(`Aktualisierungsergebnis: ${JSON.stringify(result)}`);
        updatedCount++;
      } else {
        console.log(`Keine Updates nötig für Dokument ${doc._id}`);
      }
    }
    
    await cursor.close();
    console.log(`Datenbankaktualisierung abgeschlossen, ${updatedCount} Dokumente aktualisiert`);
  } catch (error) {
    console.error('FEHLER bei der Datenbankaktualisierung:', error);
  }
  
  return updatedCount;
}

export async function GET(request: Request) {
  // Prüfen, ob der Aufruf von einem Admin kommt
  const { isAdmin, error } = await checkAdminAccess();
  
  if (!isAdmin) {
    return NextResponse.json({ error }, { status: 403 });
  }
  
  // Parameter für Simulation aus der Anfrage lesen
  const { searchParams } = new URL(request.url);
  const simulateParam = searchParams.get('simulate');
  const simulateOnly = simulateParam !== 'false';
  
  // Parameter für automatisches Löschen ungenutzter Bilder
  const autoDeleteParam = searchParams.get('delete');
  const autoDeleteUnused = autoDeleteParam === 'true';
  
  console.log(`Storage-Bereinigung gestartet, URL-Parameter simulate=${simulateParam}, autoDelete=${autoDeleteParam}`);
  console.log(`Simulationsmodus aktiv: ${simulateOnly}, Automatisches Löschen aktiv: ${autoDeleteUnused}`);
  
  try {
    // 1. Alle Bilder aus dem Storage abrufen
    console.log("Schritt 1: Abrufen aller Bilder aus Azure Storage...");
    const allImages = await getAllStorageImages();
    console.log(`${allImages.length} Bilder gefunden in Azure Storage`);
    
    // 2. Alle in Verwendung befindlichen Bilder ermitteln
    console.log("Schritt 2: Ermitteln aller verwendeten Bilder in der Datenbank...");
    const imagesInUse = await getImagesInUse();
    console.log(`${imagesInUse.size} Bilder in Verwendung gefunden`);
    
    // 3. Status der Bilder aktualisieren
    console.log("Schritt 3: Aktualisiere Status der Bilder...");
    for (const image of allImages) {
      image.inUse = imagesInUse.has(image.url);
      
      // Low-Res URL prüfen (prüfen, ob *_low.jpg existiert)
      const lowResUrl = image.url.replace('.jpg', '_low.jpg');
      image.lowResExists = imagesInUse.has(lowResUrl);
    }
    
    // Statistiken
    const totalImages = allImages.length;
    const unusedImages = allImages.filter(img => !img.inUse);
    const imagesNeedingLowRes = allImages.filter(img => img.inUse && !img.lowResExists);
    
    console.log("Statistik:");
    console.log(`- Gesamtzahl Bilder: ${totalImages}`);
    console.log(`- Unbenutzte Bilder: ${unusedImages.length}`);
    console.log(`- Bilder ohne Low-Res Version: ${imagesNeedingLowRes.length}`);
    
    // 4. Low-Res-Versionen erstellen, wo nötig
    console.log(`Schritt 4: Erstellen von Low-Res-Versionen... (Simulationsmodus: ${simulateOnly})`);
    const updatedImages = new Map<string, string>();
    
    for (const image of imagesNeedingLowRes) {
      console.log(`Verarbeite Bild: ${image.filename}`);
      const lowResUrl = await createLowResVersion(image.url, image.filename, simulateOnly);
      
      if (lowResUrl) {
        console.log(`Low-Res-Version erstellt: ${lowResUrl}`);
        updatedImages.set(image.url, lowResUrl);
      } else {
        console.log(`Fehler beim Erstellen der Low-Res-Version für: ${image.filename}`);
      }
    }
    
    // 5. Datenbank-Dokumente aktualisieren
    console.log(`Schritt 5: Aktualisieren der Datenbankeinträge... (Simulationsmodus: ${simulateOnly})`);
    const updatedDocuments = await updateImagesInDatabase(updatedImages, simulateOnly);
    console.log(`${updatedDocuments} Dokumente in der Datenbank aktualisiert`);
    
    // 6. Optional: Unbenutzte Bilder automatisch löschen, wenn autoDeleteUnused=true und simulateOnly=false
    let deletedImages = 0;
    let failedDeletes = 0;
    let skippedLowResImages = 0;
    
    if (autoDeleteUnused && !simulateOnly) {
      console.log(`Schritt 6: Automatisches Löschen von ${unusedImages.length} ungenutzten Bildern...`);
      const azureStorage = new AzureStorageService();
      
      // Sammle alle Bild-URLs (ohne _low), die noch in Verwendung sind
      const mainImagesInUse = new Set<string>();
      imagesInUse.forEach(url => {
        if (!url.includes('_low.jpg')) {
          mainImagesInUse.add(url);
        }
      });
      
      for (const image of unusedImages) {
        try {
          // Wenn es sich um ein _low-Bild handelt, prüfen ob das Hauptbild noch in Verwendung ist
          if (image.filename.includes('_low.jpg')) {
            // Extrahiere den Hauptbild-Dateinamen
            const mainFilename = image.filename.replace('_low.jpg', '.jpg');
            const mainImageUrl = image.url.replace('_low.jpg', '.jpg');
            
            // Wenn das Hauptbild noch verwendet wird, überspringe das Löschen des _low-Bildes
            if (mainImagesInUse.has(mainImageUrl)) {
              console.log(`Überspringe Löschen von ${image.url}, weil Hauptbild ${mainImageUrl} in Verwendung ist`);
              skippedLowResImages++;
              continue;
            }
          }
          
          console.log(`Lösche ungenutztes Bild: ${image.url}`);
          const success = await azureStorage.deleteImage(image.url);
          
          if (success) {
            deletedImages++;
            console.log(`Erfolgreich gelöscht: ${image.url}`);
          } else {
            failedDeletes++;
            console.log(`Konnte Bild nicht löschen: ${image.url}`);
          }
        } catch (deleteError) {
          failedDeletes++;
          console.error(`Fehler beim Löschen von ${image.url}:`, deleteError);
        }
      }
      
      console.log(`Automatisches Löschen abgeschlossen: ${deletedImages} Bilder gelöscht, ${failedDeletes} fehlgeschlagen, ${skippedLowResImages} Low-Res-Bilder übersprungen`);
    } else if (autoDeleteUnused && simulateOnly) {
      console.log(`Automatisches Löschen wurde angefordert, aber Simulationsmodus ist aktiv. Keine Bilder wurden gelöscht.`);
    }
    
    // Zusammenfassung für die Antwort
    return NextResponse.json({
      simulateOnly,
      autoDeleteUnused,
      statistics: {
        totalImages,
        usedImages: totalImages - unusedImages.length,
        unusedImages: unusedImages.length,
        imagesWithoutLowRes: imagesNeedingLowRes.length,
        createdLowResVersions: updatedImages.size,
        updatedDocuments,
        deletedImages: autoDeleteUnused && !simulateOnly ? deletedImages : 0,
        failedDeletes: autoDeleteUnused && !simulateOnly ? failedDeletes : 0,
        skippedLowResImages: autoDeleteUnused && !simulateOnly ? skippedLowResImages : 0
      },
      // Beispieldaten immer anzeigen für bessere Transparenz
      sampleData: {
        unusedImages: unusedImages.slice(0, 10).map(img => img.url),
        imagesNeedingLowRes: imagesNeedingLowRes.slice(0, 10).map(img => img.url)
      },
      message: simulateOnly 
        ? 'Simulation abgeschlossen. Verwende ?simulate=false für echte Änderungen.'
        : autoDeleteUnused 
          ? `Storage-Bereinigung erfolgreich durchgeführt. ${deletedImages} ungenutzte Bilder wurden gelöscht, ${skippedLowResImages} Low-Res-Bilder übersprungen.`
          : 'Storage-Bereinigung erfolgreich durchgeführt. Für automatisches Löschen ungenutzter Bilder verwende zusätzlich ?delete=true.'
    });
  } catch (error) {
    console.error('Fehler bei der Storage-Bereinigung:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Storage-Bereinigung', details: String(error) },
      { status: 500 }
    );
  }
}

// POST-Endpunkt zum tatsächlichen Löschen von Bildern
export async function POST(request: Request) {
  // Prüfen, ob der Aufruf von einem Admin kommt
  const { isAdmin, error } = await checkAdminAccess();
  
  if (!isAdmin) {
    return NextResponse.json({ error }, { status: 403 });
  }
  
  try {
    const body = await request.json();
    const { deleteImages, simulateOnly = true } = body;
    
    console.log(`POST-Anfrage zum Löschen von Bildern, Parameter simulateOnly=${simulateOnly}`);
    console.log(`Anzahl der zu löschenden Bilder: ${deleteImages?.length || 0}`);
    
    if (!Array.isArray(deleteImages) || deleteImages.length === 0) {
      console.log('Keine Bilder zum Löschen angegeben');
      return NextResponse.json(
        { error: 'Keine Bilder zum Löschen angegeben' },
        { status: 400 }
      );
    }
    
    // Bilder in Verwendung prüfen (Sicherheitscheck)
    console.log('Prüfe, welche Bilder in Verwendung sind...');
    const imagesInUse = await getImagesInUse();
    const safeToDelete = deleteImages.filter(url => !imagesInUse.has(url));
    const cannotDelete = deleteImages.filter(url => imagesInUse.has(url));
    
    console.log(`Sicherheitscheck: ${safeToDelete.length} sicher zu löschen, ${cannotDelete.length} in Verwendung`);
    
    // Bilder löschen
    let deletedCount = 0;
    
    if (simulateOnly === false) {
      console.log('Beginne mit dem tatsächlichen Löschen der Bilder...');
      const azureStorage = new AzureStorageService();
      
      for (const url of safeToDelete) {
        console.log(`Lösche Bild: ${url}`);
        try {
          const success = await azureStorage.deleteImage(url);
          if (success) {
            console.log(`Erfolgreich gelöscht: ${url}`);
            deletedCount++;
          } else {
            console.log(`Löschen fehlgeschlagen: ${url}`);
          }
        } catch (deleteError) {
          console.error(`Fehler beim Löschen des Bildes ${url}:`, deleteError);
        }
      }
      
      console.log(`Löschen abgeschlossen. ${deletedCount} von ${safeToDelete.length} Bildern gelöscht.`);
    } else {
      // Im Simulationsmodus nur die Anzahl zurückgeben
      console.log('Simulationsmodus: Keine Bilder wurden tatsächlich gelöscht');
      deletedCount = safeToDelete.length;
    }
    
    return NextResponse.json({
      success: true,
      simulateOnly,
      statistics: {
        requestedToDelete: deleteImages.length,
        safeToDelete: safeToDelete.length,
        cannotDelete: cannotDelete.length,
        actuallyDeleted: simulateOnly ? 0 : deletedCount
      },
      message: simulateOnly
        ? 'Simulation abgeschlossen. Setze simulateOnly=false, um die Bilder tatsächlich zu löschen.'
        : `${deletedCount} Bilder wurden erfolgreich gelöscht.`
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Bilder:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Bilder', details: String(error) },
      { status: 500 }
    );
  }
} 