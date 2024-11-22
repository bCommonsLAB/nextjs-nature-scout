import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisJob } from '@/lib/services/analysis-service';

export async function GET(request: NextRequest) {
  const startTime = performance.now();
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { error: 'jobId ist erforderlich' },
      { status: 400 }
    );
  }

  console.log(`[Status-Route] Anfrage für Job ID: ${jobId}`);

  try {
    console.log(`[Status-Route] Rufe getAnalysisJob Service auf für ID: ${jobId}`);
    
    const job = await getAnalysisJob(jobId);

    if (!job) {
      console.warn(`[Status-Route] Job ${jobId} nicht gefunden`);
      return NextResponse.json(
        { error: 'Analyse-Job nicht gefunden' },
        { status: 404 }
      );
    }

    const endTime = performance.now();
    console.log(`[Status-Route] Verarbeitung abgeschlossen in ${(endTime - startTime).toFixed(2)}ms`);

    return NextResponse.json({
      status: job.status,
      result: job.result,
      error: job.error
    });
  } catch (error) {
    const endTime = performance.now();
    console.error('[Status-Route] Fehler beim Abrufen des Analyse-Status:', {
      error,
      verarbeitungszeit: `${(endTime - startTime).toFixed(2)}ms`,
      jobId
    });

    return NextResponse.json(
      { error: 'Fehler beim Abrufen des Analyse-Status' },
      { status: 500 }
    );
  }
} 