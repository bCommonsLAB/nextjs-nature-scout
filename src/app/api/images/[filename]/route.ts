import { NextRequest } from 'next/server';
import { AzureStorageService } from '@/lib/services/azure-storage-service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    console.log("📸 Bildanfrage für:", filename);
    
    const decodedFilename = decodeURIComponent(filename);
    const azureStorage = new AzureStorageService();
    const buffer = await azureStorage.getImage(decodedFilename);

    if (!buffer) {
      console.error("❌ Bild nicht gefunden:", decodedFilename);
      return new Response('Bild nicht gefunden', { status: 404 });
    }

    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error("❌ Fehler beim Laden des Bildes:", error);
    return new Response('Fehler beim Laden des Bildes', { status: 500 });
  }
} 