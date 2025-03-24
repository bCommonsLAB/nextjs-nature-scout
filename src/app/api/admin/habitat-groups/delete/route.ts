import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID ist erforderlich' }, { status: 400 });
    }
    
    const db = await connectToDatabase();
    const collection = db.collection('habitatGroups');
    
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Keine Habitat-Familie gefunden' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen der Habitat-Familie:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
} 