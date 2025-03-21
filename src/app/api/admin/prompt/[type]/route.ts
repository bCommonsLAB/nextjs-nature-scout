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
    await updatePrompt(params.type, promptData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Speichern des Prompts:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
} 