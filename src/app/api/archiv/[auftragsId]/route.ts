import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { getAuth } from '@clerk/nextjs/server';
import { UserService } from '@/lib/services/user-service';

export async function GET(
  request: Request, 
  { params }: { params: { auftragsId: string } }
) {
  const jobId = params.auftragsId;
  
  try {
    // Hole den aktuellen Benutzer und prüfe seine Berechtigungen
    const auth = getAuth(request);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }
    
    // Überprüfen, ob Benutzer erweiterte Rechte hat (Admin oder Biologe)
    const isAdmin = await UserService.isAdmin(userId);
    const isBiologist = await UserService.isBiologist(userId);
    const hasAdvancedPermissions = isAdmin || isBiologist;
    
    // Holen des Benutzers, um die E-Mail für die Filterung zu bekommen
    const currentUser = await UserService.findByClerkId(userId);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }
    
    const userEmail = currentUser.email;
    
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    const entry = await collection.findOne({ jobId });
    
    if (!entry) {
      return NextResponse.json(
        { error: 'Eintrag nicht gefunden' },
        { status: 404 }
      );
    }
    
    // Prüfe, ob der Benutzer berechtigt ist, diesen Eintrag zu sehen
    if (!hasAdvancedPermissions && entry.metadata?.email !== userEmail) {
      return NextResponse.json(
        { error: 'Zugriff verweigert. Sie haben keine Berechtigung, diesen Eintrag zu sehen.' },
        { status: 403 }
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
  { params }: { params: { auftragsId: string } }
) {
  const jobId = params.auftragsId;
  
  try {
    // Hole den aktuellen Benutzer und prüfe seine Berechtigungen
    const auth = getAuth(request);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }
    
    // Nur Benutzer mit erweiterten Rechten dürfen Einträge verifizieren
    const isAdmin = await UserService.isAdmin(userId);
    const isBiologist = await UserService.isBiologist(userId);
    const hasAdvancedPermissions = isAdmin || isBiologist;
    
    if (!hasAdvancedPermissions) {
      return NextResponse.json(
        { error: 'Zugriff verweigert. Nur Administratoren und Biologen können Einträge verifizieren.' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { verified } = body;
    
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    // Für die Protokollierung den Benutzer abrufen
    const currentUser = await UserService.findByClerkId(userId);
    const userName = currentUser ? currentUser.name : 'Unbekannter Benutzer';
    
    const result = await collection.updateOne(
      { jobId },
      { $set: { 
        verified,
        verifiedAt: new Date(),
        verifiedBy: {
          userId,
          userName,
          role: isAdmin ? 'admin' : 'biologe'
        }
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

// API-Route zum Markieren eines Eintrags als gelöscht
export async function DELETE(
  request: Request,
  { params }: { params: { auftragsId: string } }
) {
  const jobId = params.auftragsId;
  
  try {
    // Hole den aktuellen Benutzer und prüfe seine Berechtigungen
    const auth = getAuth(request);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }
    
    // Überprüfen, ob Benutzer erweiterte Rechte hat (Admin oder Biologe)
    const isAdmin = await UserService.isAdmin(userId);
    const isBiologist = await UserService.isBiologist(userId);
    const hasAdvancedPermissions = isAdmin || isBiologist;
    
    // Hole den Benutzer und den Eintrag
    const currentUser = await UserService.findByClerkId(userId);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }
    
    const userEmail = currentUser.email;
    
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
    
    // Zuerst den Eintrag abfragen, um zu prüfen, ob der Benutzer Zugriff hat
    const entry = await collection.findOne({ jobId });
    
    if (!entry) {
      return NextResponse.json(
        { error: 'Eintrag nicht gefunden' },
        { status: 404 }
      );
    }
    
    // Prüfe, ob der Benutzer berechtigt ist, diesen Eintrag zu löschen
    // Nur eigene Einträge oder als Admin/Biologe
    if (!hasAdvancedPermissions && entry.metadata?.email !== userEmail) {
      return NextResponse.json(
        { error: 'Zugriff verweigert. Sie können nur Ihre eigenen Einträge löschen.' },
        { status: 403 }
      );
    }
    
    // Den Eintrag nicht wirklich löschen, sondern als gelöscht markieren
    const result = await collection.updateOne(
      { jobId },
      { $set: { 
        deleted: true,
        deletedAt: new Date(),
        deletedBy: {
          userId,
          userName: currentUser.name,
          role: isAdmin ? 'admin' : (isBiologist ? 'biologe' : 'user')
        }
      }}
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Eintrag konnte nicht aktualisiert werden' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'Eintrag als gelöscht markiert' });
  } catch (error) {
    console.error('Fehler beim Markieren des Eintrags als gelöscht:', error);
    return NextResponse.json(
      { error: 'Fehler beim Markieren des Eintrags als gelöscht' },
      { status: 500 }
    );
  }
} 