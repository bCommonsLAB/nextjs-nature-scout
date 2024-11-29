import { NextResponse, NextRequest } from 'next/server';
import { createAnalysisJob, updateAnalysisJob, getAnalysisJob } from '@/lib/services/analysis-service';
import { analyzeImageStructured } from '@/lib/services/openai-service';
import { openAiResult } from '@/types/nature-scout';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  console.log('[Start-Route] Neue Analyse-Anfrage empfangen');

  try {
    const { metadata } = await request.json();
    
    if (!metadata) {
      console.warn('[Start-Route] Keine Metadaten in der Anfrage');
      return NextResponse.json(
        { error: 'Keine Metadaten übergeben.' },
        { status: 400 }
      );
    }

    const jobId = new ObjectId().toString();
    console.log(`[Start-Route] Erstelle neuen Job mit ID: ${jobId}`);
    const createJob = true;
    if (createJob) {
      try {
        await createAnalysisJob(jobId, metadata, 'pending');
      } catch (dbError) {
        console.error('[Start-Route] Datenbankfehler:', dbError);
        return NextResponse.json(
          { 
            error: 'Datenbankfehler',
            details: 'Die Verbindung zur Datenbank konnte nicht hergestellt werden',
            technicalDetails: dbError instanceof Error ? dbError.message : 'Unbekannter Fehler'
          },
          { status: 503 }
        );
      }
      const job = await getAnalysisJob(jobId);
      
      if (!job) {
        console.error(`[Start-Route] Job ${jobId} wurde nicht erfolgreich erstellt`);
        return NextResponse.json(
          { error: 'Fehler beim Erstellen des Analyse-Jobs' },
          { status: 500 }
        );
      }
    }
    // Starte die Analyse asynchron
    (async () => {
      try {
        const analysisResult: openAiResult = await analyzeImageStructured(metadata);
        if (createJob) {
        
          if (analysisResult.error) {
            await updateAnalysisJob(jobId, {
              status: 'failed',
              error: analysisResult.error
            });
            return;
          }

          await updateAnalysisJob(jobId, {
            status: 'completed',
            result: analysisResult.result,
            llmInfo: analysisResult.llmInfo
          });
        }
      } catch (error) {
        console.error(`[Start-Route] Fehler bei der Analyse für Job ${jobId}:`, error);
        await updateAnalysisJob(jobId, {
          status: 'failed',
          error: 'Fehler bei der Bildanalyse'
        });
      }
    })();

    return NextResponse.json({ jobId });
  } catch (error) {
    const endTime = performance.now();
    console.error('[Start-Route] Fehler beim Starten der Analyse:', {
      error,
      verarbeitungszeit: `${(endTime - startTime).toFixed(2)}ms`
    });

    return NextResponse.json(
      { error: 'Fehler beim Starten der Analyse' },
      { status: 500 }
    );
  }
}
