import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { UserService } from '@/lib/services/user-service';
import { requireAuth } from '@/lib/server-auth';

// API-Route zum Zurücknehmen einer Verifizierung
export async function POST(
  request: Request,
  { params }: { params: { auftragsId: string } }
) {
  const { auftragsId } = await params;
  const jobId = auftragsId;
  
  try {
    // Echte Authentifizierung
    const currentUser = await requireAuth();
    const userEmail = currentUser.email;
    
    // Überprüfen, ob Benutzer erweiterte Rechte hat (Admin oder Experte)
    const isAdmin = await UserService.isAdmin(userEmail);
    const isExpert = await UserService.isExpert(userEmail);
    const hasAdvancedPermissions = isAdmin || isExpert;
    
    if (!hasAdvancedPermissions) {
      return NextResponse.json(
        { error: 'Nur Administratoren und Experten können Verifizierungen zurücknehmen.' },
        { status: 403 }
      );
    }
    
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    // Aktuellen Eintrag abrufen
    const entry = await collection.findOne({ jobId });
    
    if (!entry) {
      return NextResponse.json(
        { error: 'Eintrag nicht gefunden' },
        { status: 404 }
      );
    }
    
    // Prüfe, ob das Habitat überhaupt verifiziert ist
    if (!entry.verified) {
      return NextResponse.json(
        { error: 'Das Habitat ist nicht verifiziert' },
        { status: 400 }
      );
    }
    
    // Verifizierung zurücknehmen
    const result = await collection.updateOne(
      { jobId },
      { 
        $unset: { 
          verified: "",
          verifiedAt: "",
          verifiedBy: "",
          verifiedResult: ""
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Eintrag konnte nicht aktualisiert werden' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Verifizierung wurde erfolgreich zurückgenommen' 
    });
    
  } catch (error) {
    console.error('Fehler beim Zurücknehmen der Verifizierung:', error);
    return NextResponse.json(
      { error: 'Fehler beim Zurücknehmen der Verifizierung' },
      { status: 500 }
    );
  }
}
