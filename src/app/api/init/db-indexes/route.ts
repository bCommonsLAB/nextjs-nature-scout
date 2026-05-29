import { NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user-service';
import { createHabitatTypeIndexes, createAnalyseJobsIndexes } from '@/lib/services/habitat-service';
import { createHabitatGroupIndexes } from '@/lib/services/habitat-groups-service';
import { createAnalysisConfigIndexes } from '@/lib/services/analysis-config-service';
import { LoginCodeService } from '@/lib/services/login-code-service';
import { OrganizationService } from '@/lib/services/organization-service';
import { requireAdmin } from '@/lib/server-auth';

export async function GET() {
  try {
    // Nur Administratoren dürfen Datenbankindizes initialisieren
    // (siehe specs/regeln/rollen-und-rechte.md). requireAdmin wirft bei fehlenden Rechten.
    await requireAdmin();

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

    // Indizes für habitatGroups-Collection erstellen
    await createHabitatGroupIndexes();
    console.log('✅ HabitatGroups-Indizes erstellt');

    // Indizes für Analyse-Konfigurations-Collections erstellen
    await createAnalysisConfigIndexes();
    console.log('✅ Analyse-Konfigurations-Indizes erstellt');

    // Indizes für loginCodes-Collection (inkl. TTL) erstellen
    await LoginCodeService.createLoginCodeIndexes();
    console.log('✅ LoginCode-Indizes erstellt');

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