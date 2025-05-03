import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { UserService } from '@/lib/services/user-service';
import { createHabitatTypeIndexes, createAnalyseJobsIndexes } from '@/lib/services/habitat-service';
import { OrganizationService } from '@/lib/services/organization-service';

export async function GET() {
  try {
    // Authentifizierung prüfen
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }
    
    // Überprüfen, ob der Benutzer Administrator ist
    const isAdmin = await UserService.isAdmin(userId);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Zugriff verweigert. Nur Administratoren können Datenbankindizes initialisieren.' },
        { status: 403 }
      );
    }
    
    console.time('Indizes erstellen');
    
    // Indizes für users-Collection erstellen
    await UserService.createUserIndexes();
    console.log('✅ User-Indizes erstellt');
    
    // Indizes für organizations-Collection erstellen
    await OrganizationService.createOrganizationIndexes();
    console.log('✅ Organizations-Indizes erstellt');
    
    // Indizes für habitatTypes-Collection erstellen
    await createHabitatTypeIndexes();
    console.log('✅ HabitatTypes-Indizes erstellt');
    
    // Indizes für analyseJobs-Collection erstellen
    await createAnalyseJobsIndexes();
    console.log('✅ AnalyseJobs-Indizes erstellt');
    
    console.timeEnd('Indizes erstellen');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Datenbankindizes wurden erfolgreich erstellt oder aktualisiert' 
    });
  } catch (error) {
    console.error('Fehler beim Initialisieren der Datenbankindizes:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
      },
      { status: 500 }
    );
  }
} 