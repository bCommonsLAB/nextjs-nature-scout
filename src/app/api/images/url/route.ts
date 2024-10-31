import { NextRequest } from 'next/server';
import { AzureStorageService } from '@/lib/services/azure-storage-service';

export async function GET(request: NextRequest) {
  try {
    const filename = request.nextUrl.searchParams.get('filename');
    
    if (!filename) {
      return new Response('Filename ist erforderlich', { status: 400 });
    }

    const azureStorage = new AzureStorageService();
    const imageUrl = azureStorage.getImageUrl(filename);

    return Response.json({ url: imageUrl });
  } catch (error) {
    console.error('Fehler beim Generieren der Image-URL:', error);
    return new Response('Fehler beim Generieren der URL', { status: 500 });
  }
} 