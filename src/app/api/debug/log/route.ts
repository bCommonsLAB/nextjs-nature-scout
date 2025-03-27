import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

/**
 * Debug-Endpunkt zum Erfassen von Client-seitigen Ereignissen
 * Diese Route ist öffentlich zugänglich, um Client-seitiges Debugging zu ermöglichen
 */
export async function POST(req: NextRequest) {
  try {
    const auth = getAuth(req);
    const userId = auth.userId;
    
    // Log-Daten aus Request-Body extrahieren
    const logData = await req.json();
    
    // Zeitstempel und Benutzerinformationen hinzufügen
    const enrichedLogData = {
      ...logData,
      timestamp: new Date().toISOString(),
      userId: userId || 'anonymous',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      url: req.headers.get('referer') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown'
    };
    
    // In Konsole loggen für Server-Debugging
    console.log('[DEBUG LOG]', JSON.stringify(enrichedLogData, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Logging:', error);
    return NextResponse.json(
      { error: 'Fehler beim Verarbeiten der Log-Daten' },
      { status: 500 }
    );
  }
} 