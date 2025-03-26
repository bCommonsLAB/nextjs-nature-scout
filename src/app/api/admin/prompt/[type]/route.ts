import { NextRequest, NextResponse } from 'next/server';
import { getPrompt, updatePrompt } from '@/lib/services/analysis-config-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const prompt = await getPrompt(params.type);
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt nicht gefunden' },
        { status: 404 }
      );
    }
    return NextResponse.json(prompt);
  } catch (error) {
    console.error('Fehler beim Laden des Prompts:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const promptData = await request.json();
    
    // Validiere die erforderlichen Felder
    if (!promptData.name || !promptData.systemInstruction || !promptData.analysisPrompt) {
      return NextResponse.json(
        { error: 'Fehlende Pflichtfelder' },
        { status: 400 }
      );
    }

    // Stelle sicher, dass der Name mit dem Typ übereinstimmt
    if (promptData.name !== params.type) {
      return NextResponse.json(
        { error: 'Der Prompt-Name muss mit dem Typ übereinstimmen' },
        { status: 400 }
      );
    }

    const result = await updatePrompt(undefined, promptData);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Prompt konnte nicht gespeichert werden' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Fehler beim Speichern des Prompts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    );
  }
} 