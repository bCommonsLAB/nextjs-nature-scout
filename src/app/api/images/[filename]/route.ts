import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filepath = join(process.cwd(), 'uploads', params.filename);
    const fileBuffer = await readFile(filepath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error: unknown) {
    console.error('Fehler beim Bildladen:', error);
    return NextResponse.json(
      { error: 'Bild nicht gefunden' },
      { status: 404 }
    );
  }
} 