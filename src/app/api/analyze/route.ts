import { analyzeImageStructured } from '@/lib/services/openai-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { images, kommentar } = await request.json();

    if (!images || !Array.isArray(images)) {
      return NextResponse.json(
        { error: 'Keine Bilder übergeben.' },
        { status: 400 }
      );
    }

    const analysisResult = await analyzeImageStructured(images, kommentar);
    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error('Fehler bei der Bildanalyse:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Bildanalyse' },
      { status: 500 }
    );
  }
} 