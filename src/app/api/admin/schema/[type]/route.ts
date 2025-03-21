import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisSchema, updateAnalysisSchema } from '@/lib/services/analysis-config-service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await context.params;
    const schema = await getAnalysisSchema(type);
    
    if (!schema) {
      return NextResponse.json(
        { error: 'Schema nicht gefunden' },
        { status: 404 }
      );
    }
    return NextResponse.json(schema);
  } catch (error) {
    console.error('Fehler beim Laden des Schemas:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await context.params;
    const schema = await request.json();
    console.log('Empfangene Schema-Daten:', schema);
    
    // Validiere die Schema-Struktur
    if (!schema || typeof schema !== 'object') {
      return NextResponse.json(
        { error: 'Ungültiges Schema-Format' },
        { status: 400 }
      );
    }

    // Stelle sicher, dass die erforderlichen Felder vorhanden sind
    if (!schema.name || !schema.version || !schema.description || !schema.schema) {
      return NextResponse.json(
        { error: 'Fehlende Pflichtfelder im Schema' },
        { status: 400 }
      );
    }

    const result = await updateAnalysisSchema(schema._id, schema);
    if (!result) {
      return NextResponse.json(
        { error: 'Schema konnte nicht aktualisiert werden' },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Fehler beim Speichern des Schemas:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    );
  }
} 