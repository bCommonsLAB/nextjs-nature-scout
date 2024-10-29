import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('image') as File;
        
        if (!file) {
            return NextResponse.json(
                { error: 'Kein Bild hochgeladen.' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Stellen Sie sicher, dass das Verzeichnis existiert
        const uploadDir = join(process.cwd(), 'uploads');
        const filename = `${Date.now()}-${file.name}`;
        const filepath = join(uploadDir, filename);

        await writeFile(filepath, buffer);

        return NextResponse.json({ 
            success: true, 
            filename 
        });

    } catch (error) {
        console.error('Fehler beim Upload:', error);
        return NextResponse.json(
            { error: 'Fehler beim Bildupload' },
            { status: 500 }
        );
    }
} 