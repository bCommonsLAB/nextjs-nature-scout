import { NextResponse } from 'next/server';
import { createAnalysisJob, updateAnalysisJob, getAnalysisJob } from '@/lib/services/analysis-service';
import { analyzeImageStructured } from '@/lib/services/openai-service';
import { openAiResult } from '@/types/nature-scout';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  const startTime = performance.now();
  //console.log('[Start-Route] Neue Analyse-Anfrage empfangen');

  try {
    const { metadata, existingJobId } = await request.json();
    
    if (!metadata) {
      //console.warn('[Start-Route] Keine Metadaten in der Anfrage');
      return NextResponse.json(
        { error: 'Keine Metadaten übergeben.' },
        { status: 400 }
      );
    }

    // Verwende die existierende JobId, wenn vorhanden, sonst generiere eine neue
    const jobId = existingJobId || new ObjectId().toString();
    console.log(`[Start-Route] ${existingJobId ? 'Verwende bestehende' : 'Erstelle neue'} Job ID: ${jobId}`);
    
    // Wenn es eine existierende JobId ist, prüfe ob sie gültig ist
    if (existingJobId) {
      const existingJob = await getAnalysisJob(existingJobId);
      if (!existingJob) {
        console.warn(`[Start-Route] Existierende JobId ${existingJobId} nicht gefunden, erstelle neue`);
        // Wenn die bestehende JobId nicht gefunden wird, den Flow mit der neuen JobId fortsetzen
      } else {
        // Update des bestehenden Jobs mit neuen Metadaten
        await updateAnalysisJob(existingJobId, {
          status: 'pending',
          metadata: metadata
        });
      }
    }

    // Job erstellen/aktualisieren
    const createJob = true;
    if (createJob) {
      try {
        // Wenn existierende JobId, aktualisiere bestehenden Job, sonst erstelle neuen
        if (!existingJobId) {
          await createAnalysisJob(jobId, metadata, 'pending');
        }
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
        console.error(`[Start-Route] Job ${jobId} wurde nicht erfolgreich erstellt/aktualisiert`);
        return NextResponse.json(
          { error: 'Fehler beim Erstellen/Aktualisieren des Analyse-Jobs' },
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
