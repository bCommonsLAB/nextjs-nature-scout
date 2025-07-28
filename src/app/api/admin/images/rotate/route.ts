import { NextRequest, NextResponse } from 'next/server';
import { AzureStorageService } from '@/lib/services/azure-storage-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sharp from 'sharp';

interface RotateRequest {
  imageUrl: string;
  rotationAngle: number;
}

export async function POST(request: Request) {
  try {
    // Authentifizierung prüfen
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    // Admin-Berechtigung prüfen
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Keine Admin-Berechtigung' }, { status: 403 });
    }

    const body: RotateRequest = await request.json();
    const { imageUrl, rotationAngle } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'Keine Bild-URL angegeben' }, { status: 400 });
    }

    if (![90, 180, 270].includes(rotationAngle)) {
      return NextResponse.json({ error: 'Ungültiger Rotationswinkel' }, { status: 400 });
    }

    console.log(`Starte Rotation für Bild um ${rotationAngle}°`);

    const azureStorage = new AzureStorageService();

    try {
      // Extrahiere Dateiname aus URL
      const urlObj = new URL(imageUrl);
      const pathSegments = urlObj.pathname.split('/');
      const filename = pathSegments[pathSegments.length - 1];
      
      if (!filename) {
        throw new Error('Dateiname konnte nicht aus URL extrahiert werden');
      }
      
      // Bestimme Low-Res Dateiname
      const isLowRes = filename.includes('_low.');
      const baseName = isLowRes ? filename.replace('_low.', '.') : filename.replace('.', '_low.');
      
      // Lade das Original-Bild
      const originalFilename = isLowRes ? baseName : filename;
      const originalUrl = imageUrl.replace(filename, originalFilename);
      
      // Lade das Bild aus Azure Storage
      const response = await fetch(originalUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      
      // Rotiere das Bild mit Sharp
      const rotatedBuffer = await sharp(imageBuffer)
        .rotate(rotationAngle)
        .jpeg({ quality: 85 })
        .toBuffer();
      
      // Lade auch das Low-Res Bild und rotiere es
      const lowResFilename = isLowRes ? filename : baseName;
      const lowResUrl = imageUrl.replace(filename, lowResFilename);
      
      const lowResResponse = await fetch(lowResUrl);
      if (lowResResponse.ok) {
        const lowResBuffer = Buffer.from(await lowResResponse.arrayBuffer());
        const rotatedLowResBuffer = await sharp(lowResBuffer)
          .rotate(rotationAngle)
          .jpeg({ quality: 80 })
          .toBuffer();
        
        // Überschreibe das Low-Res Bild
        await azureStorage.uploadImage(lowResFilename, rotatedLowResBuffer);
      }
      
      // Überschreibe das Original-Bild
      await azureStorage.uploadImage(originalFilename, rotatedBuffer);
      
      console.log(`Erfolgreich rotiert: ${filename}`);
      
      return NextResponse.json({
        success: true,
        message: `Bild ${filename} erfolgreich um ${rotationAngle}° rotiert`
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

    } catch (error) {
      console.error(`Fehler beim Rotieren von ${imageUrl}:`, error);
      return NextResponse.json({
        success: false,
        message: `Fehler beim Rotieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      });
    }

  } catch (error) {
    console.error('Fehler beim Rotieren der Bilder:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unbekannter Fehler beim Rotieren'
      }, 
      { status: 500 }
    );
  }
} 