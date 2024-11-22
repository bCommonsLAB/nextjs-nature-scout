import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Angenommen, Sie verwenden Azure Blob Storage, importieren Sie das notwendige SDK
// import { BlobServiceClient } from '@azure/storage-blob';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    // Konvertieren Sie die Metadaten in einen String
    console.log(JSON.stringify(data));

    // Hier kommt die Logik zum Speichern des JSON in Ihrem Blob-Speicher
    // Zum Beispiel mit Azure Blob Storage:
    // const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
    // const containerClient = blobServiceClient.getContainerClient('your-container-name');
    // const blockBlobClient = containerClient.getBlockBlobClient('metadata.json');
    // await blockBlobClient.upload(json, json.length);

    // Senden Sie eine Erfolgsmeldung zurück
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}