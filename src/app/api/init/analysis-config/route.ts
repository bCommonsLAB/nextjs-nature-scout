import { NextResponse } from 'next/server';
import { initializeAnalysisConfigs } from '@/lib/services/analysis-config-service';
import { requireAdmin } from '@/lib/server-auth';

export async function GET() {
  try {
    // Nur Administratoren (siehe specs/regeln/rollen-und-rechte.md)
    await requireAdmin();

    await initializeAnalysisConfigs();
    return NextResponse.json({ 
      success: true, 
      message: 'Analyse-Konfigurationen erfolgreich initialisiert' 
    });
  } catch (error) {
    console.error('Fehler beim Initialisieren der Analyse-Konfigurationen:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
      },
      { status: 500 }
    );
  }
} 