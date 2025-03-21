import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const imagePath = path.join(
      process.env.HABITAT_TEST_IMAGES_PATH || '',
      ...params.path
    );

    const imageBuffer = await fs.readFile(imagePath);
    
    // Bestimme den MIME-Type basierend auf der Dateiendung
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
    }[ext] || 'application/octet-stream';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000', // Cache für 1 Jahr
      },
    });
  } catch (error) {
    console.error('Fehler beim Laden des Bildes:', error);
    return new NextResponse('Bild nicht gefunden', { status: 404 });
  }
} 