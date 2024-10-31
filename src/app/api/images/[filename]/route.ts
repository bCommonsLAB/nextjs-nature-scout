import { NextRequest, NextResponse } from 'next/server';
import { ImageStorage } from '@/lib/services/image-storage';
import { config } from '@/lib/config';

const imageStorage = ImageStorage.getInstance({
  storageType: config.STORAGE.type,
  azureConfig: config.STORAGE.azure,
  uploadDir: config.STORAGE.filesystem?.uploadDir
});

export async function GET(request: NextRequest) {
  // Extrahiere den Dateinamen aus dem Pfad
  const filename = request.nextUrl.pathname.split('/').pop();
  if (!filename) {
    return NextResponse.json({ error: 'Kein Dateiname angegeben' }, { status: 400 });
  }

  const decodedFilename = decodeURIComponent(filename);

  try {
    const buffer = await imageStorage.getImage(decodedFilename);

    if (!buffer) {
      return NextResponse.json(
        { error: 'Bild nicht gefunden' },
        { status: 404 }
      );
    }

    const contentType = decodedFilename.toLowerCase().endsWith('.png')
      ? 'image/png'
      : 'image/jpeg';

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Fehler beim Bildladen:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden des Bildes' },
      { status: 500 }
    );
  }
} 