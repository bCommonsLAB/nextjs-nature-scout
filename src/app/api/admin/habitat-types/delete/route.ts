import { NextResponse } from 'next/server';
import { deleteHabitatType } from '@/lib/services/habitat-service';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID ist erforderlich' }, { status: 400 });
    }
    
    const result = await deleteHabitatType(id);
    
    if (!result) {
      return NextResponse.json({ error: 'Kein Habitat-Typ gefunden' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen des Habitat-Typs:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Serverfehler' 
    }, { status: 500 });
  }
} 