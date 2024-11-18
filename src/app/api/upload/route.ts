import { NextRequest } from 'next/server';
import { AzureStorageService } from '@/lib/services/azure-storage-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return new Response('Keine Datei gefunden', { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const filename = `${timestamp}`;  //-${file.name}

    const azureStorage = new AzureStorageService();
    const url = await azureStorage.uploadImage(filename, buffer);

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