import { NextResponse } from 'next/server'
import { LoginCodeService } from '@/lib/services/login-code-service'

export async function POST() {
  try {
    // Erstelle die benötigten Indizes für Login-Codes
    await LoginCodeService.createLoginCodeIndexes()
    
    return NextResponse.json({
      message: 'Login-Code-Indizes erfolgreich erstellt',
      success: true
    })
  } catch (error) {
    console.error('Fehler beim Erstellen der Login-Code-Indizes:', error)
    return NextResponse.json(
      { 
        error: 'Fehler beim Erstellen der Indizes',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
} 