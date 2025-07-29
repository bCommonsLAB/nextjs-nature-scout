import { NextRequest, NextResponse } from 'next/server';
import { AzureStorageService } from '@/lib/services/azure-storage-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface StorageFile {
  name: string;
  url: string;
  size: number;
  lastModified: string;
}

export async function GET(request: Request) {
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

    console.log('Lade Bild-Galerie für Admin...');

    const azureStorage = new AzureStorageService();
    
    // Alle Bilder aus dem Storage laden
    const allFiles = await azureStorage.getStoredImages();
    
    // Bilder in Paare gruppieren (Original + Low-Res)
    const imagePairs: any[] = [];
    const processedFiles = new Set<string>();
    
    for (const file of allFiles) {
      if (processedFiles.has(file.filename)) continue;
      
      const isLowRes = file.filename.includes('_low.');
      const baseName = isLowRes ? file.filename.replace('_low.', '.') : file.filename.replace('.', '_low.');
      
      // Suche nach dem entsprechenden Partner
      const partnerFile = allFiles.find((f: { filename: string }) => f.filename === baseName);
      
              if (partnerFile) {
          // Paar gefunden
          const originalFile = isLowRes ? partnerFile : file;
          const lowResFile = isLowRes ? file : partnerFile;
          
          // Nur Original-Bilder zur Liste hinzufügen (nicht Low-Res)
          if (!isLowRes) {
            imagePairs.push({
              url: originalFile.url,
              lowResUrl: lowResFile.url,
              filename: originalFile.filename,
              lowResFilename: lowResFile.filename,
              size: originalFile.size,
              lowResSize: lowResFile.size,
              lastModified: originalFile.lastModified,
              isSelected: false,
              rotation: 0 // Standard-Rotation
            });
          }
          
          // Beide Dateien als verarbeitet markieren
          processedFiles.add(file.filename);
          processedFiles.add(partnerFile.filename);
        } else {
          // Kein Partner gefunden - einzelnes Bild
          if (!isLowRes) {
            imagePairs.push({
              url: file.url,
              lowResUrl: file.url, // Fallback auf Original
              filename: file.filename,
              lowResFilename: file.filename,
              size: file.size,
              lowResSize: file.size,
              lastModified: file.lastModified,
              isSelected: false,
              rotation: 0
            });
          }
          processedFiles.add(file.filename);
        }
    }
    
    // Sortiere nach Datum (neueste zuerst)
    imagePairs.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    
    console.log(`Gefunden: ${imagePairs.length} Bildpaare`);
    
    return NextResponse.json({
      success: true,
      images: imagePairs,
      totalCount: imagePairs.length,
      message: `${imagePairs.length} Bilder gefunden`
    });
    
  } catch (error) {
    console.error('Fehler beim Laden der Bild-Galerie:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Laden der Bilder'
      }, 
      { status: 500 }
    );
  }
} 