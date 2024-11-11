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
    console.log('kommentar', kommentar);
    // Hier würde normalerweise die Analyse in einer Queue gestartet
    const jobId = Date.now().toString(); // Dummy jobId

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error('Fehler beim Starten der Analyse:', error);
    return NextResponse.json(
      { error: 'Fehler beim Starten der Analyse' },
      { status: 500 }
    );
  }
}
