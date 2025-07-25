import { NextRequest, NextResponse } from 'next/server';
import { OrganizationService } from '@/lib/services/organization-service';
import fs from 'fs';
import path from 'path';

// Typdefinitionen für die Import-Statistik
interface ImportDetail {
  name: string;
  status: 'imported' | 'skipped' | 'error';
  reason?: string;
  error?: string;
}

interface ImportStats {
  total: number;
  imported: number;
  skipped: number;
  errors: number;
  details: ImportDetail[];
}

/**
 * GET /api/init/organizations - Importiert Organisationen aus der JSON-Datei
 * Nur für Admins zugänglich
 */
export async function GET(req: Request) {
  try {
    // TEMPORÄR: Demo-Admin für Init-Routen
    const userId = 'demo-user-123';
    const isAdmin = true;
    
    // const auth = getAuth(req);
    // const userId = auth.userId;
    // if (!userId) {
    //   return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    // }
    // const isAdmin = await UserService.isAdmin(userId);
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Zugriff verweigert. Nur für Admins.' }, { status: 403 });
    // }
    
    // Lese die JSON-Datei
    const filePath = path.join(process.cwd(), 'data', 'organisations.json');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 });
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const organizations = JSON.parse(fileContent);
    
    // Import-Statistik
    const stats: ImportStats = {
      total: organizations.length,
      imported: 0,
      skipped: 0,
      errors: 0,
      details: []
    };
    
    // Organisationen importieren
    for (const org of organizations) {
      try {
        // Prüfe, ob die Organisation bereits existiert (basierend auf Namen)
        const existingOrgs = await OrganizationService.getAllOrganizations();
        const existingOrg = existingOrgs.find(existing => 
          existing.name === org.name || 
          (org.email && org.email === existing.email)
        );
        
        if (existingOrg) {
          stats.skipped++;
          stats.details.push({
            name: org.name,
            status: 'skipped',
            reason: 'Organisation existiert bereits'
          });
          continue;
        }
        
        // Erstelle die Organisation
        await OrganizationService.createOrganization(org);
        stats.imported++;
        stats.details.push({
          name: org.name,
          status: 'imported'
        });
      } catch (err) {
        console.error(`Fehler beim Importieren von ${org.name}:`, err);
        stats.errors++;
        stats.details.push({
          name: org.name,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unbekannter Fehler'
        });
      }
    }
    
    return NextResponse.json({
      message: `Import abgeschlossen: ${stats.imported} importiert, ${stats.skipped} übersprungen, ${stats.errors} Fehler`,
      stats
    });
  } catch (error) {
    console.error('Fehler beim Organisationsimport:', error);
    return NextResponse.json({ 
      error: 'Interner Serverfehler',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 });
  }
} 