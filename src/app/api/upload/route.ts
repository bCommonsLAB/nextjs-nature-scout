import { type NextRequest } from 'next/server';
import { ImageStorage } from '@/lib/services/image-storage';
import { config } from '@/lib/config';

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .replace(/--+/g, '-');
}

const imageStorage = ImageStorage.getInstance({
  storageType: config.STORAGE.type,
  azureConfig: config.STORAGE.azure,
  uploadDir: config.STORAGE.filesystem?.uploadDir
});

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('image') as File;
        
        if (!file) {
            return Response.json(
                { error: 'Kein Bild hochgeladen.' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const sanitizedFilename = sanitizeFilename(`${Date.now()}-${file.name}`);

        await imageStorage.saveImage(sanitizedFilename, buffer);

        return Response.json({ 
            success: true, 
            filename: sanitizedFilename 
        });

    } catch (error) {
        console.error('Fehler beim Upload:', error);
        return Response.json(
            { error: 'Fehler beim Bildupload' },
            { status: 500 }
        );
    }
} 