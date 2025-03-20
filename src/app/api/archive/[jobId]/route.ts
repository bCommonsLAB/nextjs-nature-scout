import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';

export async function GET(
  request: Request, 
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  
  try {
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    const entry = await collection.findOne({ jobId });
    
    if (!entry) {
      return NextResponse.json(
        { error: 'Eintrag nicht gefunden' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(entry);
  } catch (error) {
    console.error('Fehler beim Abrufen des Archiveintrags:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen des Archiveintrags' },
      { status: 500 }
    );
  }
}

// API-Route für die Verifizierung eines Eintrags
export async function PATCH(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  
  try {
    const body = await request.json();
    const { verified } = body;
    
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    const result = await collection.updateOne(
      { jobId },
      { $set: { 
        verified,
        verifiedAt: new Date()
      }}
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Eintrag nicht gefunden' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, verified });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Verifizierungsstatus:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Verifizierungsstatus' },
      { status: 500 }
    );
  }
} 