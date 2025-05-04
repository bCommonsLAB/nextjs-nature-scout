import { AzureStorageService } from '@/lib/services/azure-storage-service';
import sharp from 'sharp';
import { publicConfig } from '@/lib/config';

const { maxWidth, maxHeight, quality } = publicConfig.imageSettings;
const LOW_RES_MAX_SIZE = 360;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return new Response('Keine Datei gefunden', { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Bild-Metadaten ermitteln und verarbeiten
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    let newWidth = width;
    let newHeight = height;

    if (width > height) {
      if (width > maxWidth) {
        newHeight = Math.round((height * maxWidth) / width);
        newWidth = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        newWidth = Math.round((width * maxHeight) / height);
        newHeight = maxHeight;
      }
    }

    // Bild optimieren
    const processedBuffer = await sharp(buffer)
      .resize(newWidth, newHeight)
      .jpeg({ quality: Math.round(quality * 100) })
      .toBuffer();

    // Low-Resolution Version erstellen (max 360px)
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
    
    const lowResBuffer = await sharp(buffer)
      .resize(lowResWidth, lowResHeight)
      .jpeg({ quality: Math.round(quality * 80) }) // Etwas niedrigere Qualität für kleine Vorschau
      .toBuffer();

    // Optimiertes Bild direkt in Azure Storage hochladen
    const timestamp = Date.now();
    const filename = `${timestamp}.jpg`;
    const lowResFilename = `${timestamp}_low.jpg`;

    const azureStorage = new AzureStorageService();
    const url = await azureStorage.uploadImage(filename, processedBuffer);
    const lowResUrl = await azureStorage.uploadImage(lowResFilename, lowResBuffer);

    return Response.json({ 
      filename,
      url,
      lowResFilename,
      lowResUrl,
      success: true 
    });

  } catch (error) {
    console.error('Fehler beim Upload:', error);
    return new Response('Upload fehlgeschlagen', { status: 500 });
  }
} 