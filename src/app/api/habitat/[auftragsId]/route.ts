import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { auth } from '@clerk/nextjs/server';
import { UserService } from '@/lib/services/user-service';

export async function GET(
  request: Request, 
  { params }: { params: { auftragsId: string } }
) {
  const { auftragsId } = await params;
  const jobId = auftragsId;
  
  try {
    // Hole den aktuellen Benutzer und prüfe seine Berechtigungen
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }
    
    // Überprüfen, ob Benutzer erweiterte Rechte hat (Admin oder Experte)
    const isAdmin = await UserService.isAdmin(userId);
    const isExpert = await UserService.isExpert(userId);
    const hasAdvancedPermissions = isAdmin || isExpert;
    
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
    console.error('Fehler beim Abrufen des Habitateintrags:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen des Habitateintrags' },
      { status: 500 }
    );
  }
}

// API-Route zum Markieren eines Eintrags als gelöscht
export async function DELETE(
  request: Request,
  { params }: { params: { auftragsId: string } }
) {
  const { auftragsId } = await params;
  const jobId = auftragsId;
  
  try {
    // Hole den aktuellen Benutzer und prüfe seine Berechtigungen
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }
    
    // Überprüfen, ob Benutzer erweiterte Rechte hat (Admin oder Experte)
    const isAdmin = await UserService.isAdmin(userId);
    const isExpert = await UserService.isExpert(userId);
    const hasAdvancedPermissions = isAdmin || isExpert;
    
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
    // Nur eigene Einträge oder als Admin/Experte
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
          role: isAdmin ? 'admin' : (isExpert ? 'experte' : 'user')
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

// API-Route für eine erneute Analyse
export async function POST(
  request: Request,
  { params }: { params: { auftragsId: string } }
) {
  const { auftragsId } = await params;
  const jobId = auftragsId;
  
  try {
    // Hole den aktuellen Benutzer und prüfe seine Berechtigungen
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }
    
    // Überprüfen, ob Benutzer berechtigt ist (Admin oder Experte oder Ersteller)
    const isAdmin = await UserService.isAdmin(userId);
    const isExpert = await UserService.isExpert(userId);
    const hasAdvancedPermissions = isAdmin || isExpert;
    
    // Holen des Benutzers
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
    
    // Aktuellen Eintrag abrufen
    const entry = await collection.findOne({ jobId });
    
    if (!entry) {
      return NextResponse.json(
        { error: 'Eintrag nicht gefunden' },
        { status: 404 }
      );
    }
    
    // Prüfe, ob der Benutzer berechtigt ist
    if (!hasAdvancedPermissions && entry.metadata?.email !== userEmail) {
      return NextResponse.json(
        { error: 'Zugriff verweigert. Sie haben keine Berechtigung, diesen Eintrag zu analysieren.' },
        { status: 403 }
      );
    }
    
    // Hole die neuen Analysedaten aus dem Request
    const body = await request.json();
    const { 
      newAnalysisModule = 'Standard-Reanalyse',
      newBilder, 
      kommentar 
    } = body;

    // Status auf 'analyzing' setzen für die Detailansicht
    await collection.updateOne(
      { jobId },
      { $set: { status: 'analyzing' } }
    );
    
    // Für die Analyse die aktuellen Bilder und Metadaten verwenden
    const metadata = entry.metadata || {};
    
    // Bilder aktualisieren falls vorhanden
    if (newBilder && newBilder.length > 0) {
      metadata.bilder = newBilder;
    }
    
    // Kommentar aktualisieren falls vorhanden
    if (kommentar) {
      metadata.kommentar = kommentar;
    }

    // Durchführung der tatsächlichen Analyse mit dem OpenAI-Service
    const { analyzeImageStructured } = await import('@/lib/services/openai-service');
    const analysisResult = await analyzeImageStructured(metadata);
    
    // Erstelle einen Eintrag für die Versionshistorie
    const historyEntry = {
      date: new Date(),
      user: {
        userId,
        userName: currentUser.name,
        email: currentUser.email,
        role: isAdmin ? 'admin' : (isExpert ? 'experte' : 'user')
      },
      module: newAnalysisModule,
      previousResult: entry.result ? {
        habitattyp: entry.result.habitattyp,
        habitatfamilie: entry.result.habitatfamilie,
        schutzstatus: entry.result.schutzstatus,
        kommentar: entry.metadata?.kommentar
      } : null,
      changes: {
        bildCount: metadata.bilder?.length || 0,
        habitattyp: analysisResult.result?.habitattyp,
        habitatfamilie: analysisResult.result?.habitatfamilie,
        schutzstatus: analysisResult.result?.schutzstatus,
        kommentar: metadata.kommentar
      }
    };

    let updateOperation;

    if (analysisResult.error) {
      // Bei Fehler setze Status auf 'failed' und speichere den Fehler
      updateOperation = { $set: {
        status: 'failed',
        error: analysisResult.error,
        updatedAt: new Date(),
        history: {
          $cond: {
            if: { $isArray: "$history" },
            then: { $concatArrays: ["$history", [historyEntry]] },
            else: [historyEntry]
          }
        }
      }};
    } else {
      // Bei Erfolg setze Status auf 'completed' und speichere die Ergebnisse
      updateOperation = { $set: {
        status: 'completed',
        result: analysisResult.result,
        llmInfo: analysisResult.llmInfo,
        updatedAt: new Date(),
        metadata: metadata,
        error: null,
        history: {
          $cond: {
            if: { $isArray: "$history" },
            then: { $concatArrays: ["$history", [historyEntry]] },
            else: [historyEntry]
          }
        }
      }};
    }
    
    // Füge den Verlaufseintrag hinzu und aktualisiere die Daten
    const result = await collection.updateOne(
      { jobId },
      [updateOperation]
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Eintrag konnte nicht aktualisiert werden' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Analyse wurde erfolgreich durchgeführt und aktualisiert',
      status: analysisResult.error ? 'failed' : 'completed',
      historyEntry 
    });
    
  } catch (error) {
    console.error('Fehler bei der erneuten Analyse:', error);
    return NextResponse.json(
      { error: 'Fehler bei der erneuten Analyse' },
      { status: 500 }
    );
  }
} 