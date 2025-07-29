import { BlobServiceClient } from '@azure/storage-blob';
import { serverConfig } from '../config';

export class AzureStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient;
  private uploadDir: string;
  private baseUrl: string;

  constructor() {
    if (!serverConfig.STORAGE.connectionString) {
      throw new Error('Azure Storage connection string ist nicht konfiguriert');
    }

    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      serverConfig.STORAGE.connectionString
    );
    
    this.containerClient = this.blobServiceClient.getContainerClient(
      serverConfig.STORAGE.containerName
    );
    
    this.uploadDir = serverConfig.STORAGE.uploadDir;
    this.baseUrl = serverConfig.STORAGE.baseUrl || '';
  }

  async uploadImage(filename: string, buffer: Buffer): Promise<string> {
    try {
      const blobName = `${this.uploadDir}/${filename}`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: 'image/jpeg',
          blobCacheControl: 'no-cache, no-store, must-revalidate' // Cache-Control Header
        }
      });
      
      return `${this.baseUrl}/${blobName}`;
    } catch (error) {
      console.error('Fehler beim Upload des Bildes:', error);
      throw new Error(`Upload fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  getImageUrl(filename: string): string {
    return `${this.baseUrl}/${this.uploadDir}/${filename}`;
  }

  // Neue Methode: Alle gespeicherten Bilder im angegebenen Verzeichnis abrufen
  async getStoredImages(): Promise<Array<{ url: string; filename: string; size: number; lastModified: string }>> {
    const images = [];
    
    // Nur Dateien im Upload-Verzeichnis auflisten
    const dirPrefix = `${this.uploadDir}/`;
    
    try {
      // Alle Blobs mit dem Präfix auflisten
      for await (const blob of this.containerClient.listBlobsFlat({ prefix: dirPrefix })) {
        // Vollständige URL konstruieren
        const url = `${this.baseUrl}/${blob.name}`;
        
        // Dateiname extrahieren (ohne Pfad)
        const filename = blob.name.substring(dirPrefix.length);
        
        images.push({ 
          url, 
          filename,
          size: blob.properties.contentLength || 0,
          lastModified: blob.properties.lastModified?.toISOString() || new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der gespeicherten Bilder:', error);
    }
    
    return images;
  }

  // Neue Methode: Bild aus Azure Storage löschen
  async deleteImage(imageUrl: string): Promise<boolean> {
    try {
      // Extraktion des Bildpfades aus der URL
      const urlObj = new URL(imageUrl);
      const pathSegments = urlObj.pathname.split('/');
      
      // Extrahiere den Blobpfad (alles nach dem Container-Namen)
      const containerIndex = pathSegments.findIndex(segment => 
        segment === serverConfig.STORAGE.containerName);
      
      if (containerIndex === -1) {
        throw new Error(`Container ${serverConfig.STORAGE.containerName} nicht in URL gefunden`);
      }
      
      const blobPath = pathSegments.slice(containerIndex + 1).join('/');
      
      // Blob-Client erstellen und löschen
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath);
      
      await blockBlobClient.delete();
      return true;
    } catch (error) {
      console.error(`Fehler beim Löschen des Bildes ${imageUrl}:`, error);
      return false;
    }
  }
}
