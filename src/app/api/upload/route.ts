import { NextRequest } from 'next/server';
import { AzureStorageService } from '@/lib/services/azure-storage-service';
import sharp from 'sharp';
import { publicConfig } from '@/lib/config';

const { maxWidth, maxHeight, quality } = publicConfig.imageSettings;

export async function POST(request: NextRequest) {
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

    // Optimiertes Bild direkt in Azure Storage hochladen
    const timestamp = Date.now();
    const filename = `${timestamp}.jpg`;

    const azureStorage = new AzureStorageService();
    const url = await azureStorage.uploadImage(filename, processedBuffer);

    return Response.json({ 
      filename,
      url,
      success: true 
    });

  } catch (error) {
    console.error('Fehler beim Upload:', error);
    return new Response('Upload fehlgeschlagen', { status: 500 });
  }
} 