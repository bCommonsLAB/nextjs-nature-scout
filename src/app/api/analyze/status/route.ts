import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisJob } from '@/lib/services/analysis-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { error: 'jobId ist erforderlich' },
      { status: 400 }
    );
  }

  try {
    
    const job = await getAnalysisJob(jobId);
    //console.log(`[Status-Route] Service-Antwort für Job ${jobId}:`, job?.status);

    if (!job) {
      //console.warn(`[Status-Route] Job ${jobId} nicht gefunden`);
      return NextResponse.json(
        { error: 'Analyse-Job nicht gefunden' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      status: job.status,
      result: job.result,
      llmInfo: job.llmInfo,
      error: job.error
    });
  } catch (error) {
    console.error('[Status-Route] Fehler beim Abrufen des Analyse-Status:', {
      error,
      jobId
    });

    return NextResponse.json(
      { error: 'Fehler beim Abrufen des Analyse-Status' },
      { status: 500 }
    );
  }
} 