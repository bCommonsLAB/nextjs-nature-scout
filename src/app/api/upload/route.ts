import { AzureStorageService } from '@/lib/services/azure-storage-service';
import sharp from 'sharp';
import { publicConfig } from '@/lib/config';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAnalysisJob, addImageToDraft } from '@/lib/services/analysis-service';
import { Bild } from '@/types/nature-scout';

const { maxWidth, maxHeight, quality } = publicConfig.imageSettings;
const LOW_RES_MAX_SIZE = 360;

/**
 * Verknüpft ein hochgeladenes Bild serverseitig mit einem Entwurf (Best-Effort, Session 1.3).
 *
 * Nur wenn `jobId` übergeben wurde, der/die Angemeldete Eigentümer:in des Entwurfs ist und der
 * Datensatz `status: 'draft'` hat. Fehler hier brechen den Upload NICHT ab – das Bild ist bereits
 * in Azure und wird zusätzlich vom Client-Auto-Save (PATCH …/draft) referenziert.
 */
async function linkImageToDraft(
  jobId: string,
  imageKey: string,
  clientImageId: string | null,
  bildData: { filename: string; url: string; lowResUrl?: string }
): Promise<void> {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) return;

    const job = await getAnalysisJob(jobId);
    if (!job || job.status !== 'draft') return;
    if (job.metadata?.email !== userEmail) return;

    const bild: Bild = {
      imageKey: imageKey || 'Bild',
      filename: bildData.filename,
      url: bildData.url,
      lowResUrl: bildData.lowResUrl,
      analyse: null,
      ...(clientImageId ? { clientImageId } : {})
    };
    await addImageToDraft(jobId, bild);
  } catch (error) {
    console.warn('Bild konnte nicht serverseitig mit Entwurf verknüpft werden:', error);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return new Response('Keine Datei gefunden', { status: 400 });
    }

    // Optionale Felder zum serverseitigen Verknüpfen mit einem Entwurf (Session 1.3)
    const jobId = (formData.get('jobId') as string) || null;
    const imageKey = (formData.get('imageKey') as string) || '';
    const clientImageId = (formData.get('clientImageId') as string) || null;

    const buffer = Buffer.from(await file.arrayBuffer());
    
    try {
      // Bild-Metadaten ermitteln und verarbeiten
      const metadata = await sharp(buffer).metadata();
      console.log('Original EXIF metadata:', metadata);
      
      // EXIF-Orientierung ermitteln (wichtig für korrekte Bilddarstellung)
      const orientation = metadata.orientation || 1;
      
      // Sharp automatisch rotieren lassen basierend auf EXIF-Orientierung
      const sharpInstance = sharp(buffer, { failOnError: false }).rotate();
      
      // Nach der automatischen Rotation die Dimensionen neu ermitteln
      const rotatedMetadata = await sharpInstance.metadata();
      const width = rotatedMetadata.width || 0;
      const height = rotatedMetadata.height || 0;
      let newWidth = width;
      let newHeight = height;

      if (width > height) {
        if (width > maxWidth) {
          newHeight = Math.round((height * maxWidth) / width);
          newWidth = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          newWidth = Math.round((width * maxHeight) / height);
          newHeight = maxHeight;
        }
      }

      // Bestimme das Ausgabeformat basierend auf dem Eingabeformat (oder nutze JPEG als Fallback)
      const outputFormat = (metadata.format === 'jpeg' || metadata.format === 'jpg') ? 'jpeg' : 
                          (metadata.format === 'png') ? 'png' : 'jpeg';
      
      // Bild optimieren mit EXIF-Orientierung und verbesserter Fehlerbehandlung
      let processedBuffer;
      if (outputFormat === 'jpeg') {
        processedBuffer = await sharp(buffer, { failOnError: false })
          .rotate() // Automatische Rotation basierend auf EXIF
          .resize(newWidth, newHeight)
          .jpeg({ 
            quality: Math.round(quality * 100)
          })
          .toBuffer();
      } else if (outputFormat === 'png') {
        processedBuffer = await sharp(buffer, { failOnError: false })
          .rotate() // Automatische Rotation basierend auf EXIF
          .resize(newWidth, newHeight)
          .png({ quality: Math.round(quality * 100) })
          .toBuffer();
      } else {
        // Fallback zu JPEG
        processedBuffer = await sharp(buffer, { failOnError: false })
          .rotate() // Automatische Rotation basierend auf EXIF
          .resize(newWidth, newHeight)
          .jpeg({ 
            quality: Math.round(quality * 100)
          })
          .toBuffer();
      }

      // Low-Resolution Version erstellen (max 360px) - mit korrigierter Orientierung
      let lowResWidth = width;
      let lowResHeight = height;
      
      if (width > height) {
        if (width > LOW_RES_MAX_SIZE) {
          lowResHeight = Math.round((height * LOW_RES_MAX_SIZE) / width);
          lowResWidth = LOW_RES_MAX_SIZE;
        }
      } else {
        if (height > LOW_RES_MAX_SIZE) {
          lowResWidth = Math.round((width * LOW_RES_MAX_SIZE) / height);
          lowResHeight = LOW_RES_MAX_SIZE;
        }
      }
      
      // Low-Res Version mit gleichem Format wie Original und korrigierter Orientierung
      let lowResBuffer;
      if (outputFormat === 'jpeg') {
        lowResBuffer = await sharp(buffer, { failOnError: false })
          .rotate() // Automatische Rotation basierend auf EXIF
          .resize(lowResWidth, lowResHeight)
          .jpeg({ quality: Math.round(quality * 80) })
          .toBuffer();
      } else if (outputFormat === 'png') {
        lowResBuffer = await sharp(buffer, { failOnError: false })
          .rotate() // Automatische Rotation basierend auf EXIF
          .resize(lowResWidth, lowResHeight)
          .png({ quality: Math.round(quality * 80) })
          .toBuffer();
      } else {
        // Fallback zu JPEG
        lowResBuffer = await sharp(buffer, { failOnError: false })
          .rotate() // Automatische Rotation basierend auf EXIF
          .resize(lowResWidth, lowResHeight)
          .jpeg({ quality: Math.round(quality * 80) })
          .toBuffer();
      }

      // Optimiertes Bild direkt in Azure Storage hochladen
      const timestamp = Date.now();
      const extension = outputFormat === 'png' ? 'png' : 'jpg';
      const filename = `${timestamp}.${extension}`;
      const lowResFilename = `${timestamp}_low.${extension}`;

      const azureStorage = new AzureStorageService();
      const url = await azureStorage.uploadImage(filename, processedBuffer);
      const lowResUrl = await azureStorage.uploadImage(lowResFilename, lowResBuffer);

      // Optional: Bild direkt am Entwurf referenzieren (verhindert verwaiste Bilder)
      if (jobId) {
        await linkImageToDraft(jobId, imageKey, clientImageId, { filename, url, lowResUrl });
      }

      return Response.json({
        filename,
        url,
        lowResFilename,
        lowResUrl,
        success: true
      });
    } catch (imageError: unknown) {
      console.error('Fehler bei der Bildverarbeitung:', imageError);
      
      // Versuche, das Bild ohne Verarbeitung hochzuladen
      try {
        const timestamp = Date.now();
        const filename = `${timestamp}_original.jpg`;
        
        const azureStorage = new AzureStorageService();
        const url = await azureStorage.uploadImage(filename, buffer);

        if (jobId) {
          await linkImageToDraft(jobId, imageKey, clientImageId, { filename, url });
        }

        return Response.json({
          filename,
          url,
          success: true,
          message: 'Bild ohne Optimierung hochgeladen aufgrund eines Verarbeitungsfehlers'
        });
      } catch (uploadError: unknown) {
        throw new Error(`Bildverarbeitung fehlgeschlagen: ${imageError instanceof Error ? imageError.message : 'Unbekannter Fehler'}. Upload-Versuch fehlgeschlagen: ${uploadError instanceof Error ? uploadError.message : 'Unbekannter Fehler'}`);
      }
    }
  } catch (error) {
    console.error('Fehler beim Upload:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Upload'
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
} 