import { NextRequest, NextResponse } from 'next/server';
import { ImageStorage } from '@/lib/services/image-storage';
import { config } from '@/lib/config';

const imageStorage = ImageStorage.getInstance({
  storageType: config.STORAGE.type,
  uploadDir: config.STORAGE.uploadDir,
  azureConfig: config.STORAGE.azure
});

export async function GET(request: NextRequest) {
  const filename = request.nextUrl.pathname.split('/').pop();
  if (!filename) {
    return NextResponse.json(
      { error: 'Kein Dateiname angegeben' },
      { status: 400 }
    );
  }

  console.log('Versuche Bild zu laden:', {
    filename,
    storageType: config.STORAGE.type,
    uploadDir: config.STORAGE.uploadDir
  });

  const decodedFilename = decodeURIComponent(filename);
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
} 