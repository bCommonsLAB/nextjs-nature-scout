import { NextResponse } from 'next/server';
import { analyzeImageStructured } from '@/lib/services/openai-service';
import type { TestCase, TestResult, TestRun } from '@/app/tests/types/test-types';
import { validateHabitatType } from '@/lib/services/habitat-service';

// Hilfsfunktion für strukturiertes Logging
function logTestEvent(event: string, data: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    data
  }));
}

// Gemeinsame Funktion für GET und POST
async function handleTestRun(category: string, testCaseId?: string) {
  const encoder = new TextEncoder();
  
  logTestEvent('test_run_started', { category, testCaseId });

  try {
    // Erstelle einen TransformStream für Server-Sent Events
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const testRun: TestRun = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      results: [],
      successRate: 0,
      algorithmVersion: '1.0.0'
    };

    logTestEvent('test_run_created', { 
      runId: testRun.id,
      timestamp: testRun.timestamp
    });

    // Starte asynchrone Verarbeitung
    (async () => {
      try {
        const results: TestResult[] = [];
        let processedCount = 0;

        // Lade Testfälle
        logTestEvent('loading_test_cases', { category, testCaseId });
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/tests/load-cases`, {
          method: 'POST',
          cache: 'no-store'
        });
        const { testCases } = await response.json();
        
        // Flache Liste von Testfällen erstellen
        const allTestCases = Object.values(testCases).flat() as TestCase[];
        let filteredTestCases = category === 'all' 
          ? allTestCases 
          : allTestCases.filter(tc => tc.category === category);

        // Wenn eine spezifische Testfall-ID angegeben wurde, filtere danach
        if (testCaseId) {
          filteredTestCases = filteredTestCases.filter(tc => tc.id === testCaseId);
          if (filteredTestCases.length === 0) {
            throw new Error(`Testfall mit ID ${testCaseId} nicht gefunden`);
          }
        }

        // Validiere die erwarteten Habitattypen
        for (const testCase of filteredTestCases) {
          const isValid = await validateHabitatType(testCase.expectedHabitat);
          if (!isValid) {
            throw new Error(`Ungültiger erwarteter Habitattyp "${testCase.expectedHabitat}" in Testfall ${testCase.id}`);
          }
        }

        logTestEvent('test_cases_loaded', {
          totalCases: allTestCases.length,
          filteredCases: filteredTestCases.length,
          categories: Object.keys(testCases),
          testCaseId
        });

        // Verarbeite jeden Testfall
        for (const testCase of filteredTestCases) {
          logTestEvent('processing_test_case', {
            caseId: testCase.id,
            category: testCase.category,
            expectedHabitat: testCase.expectedHabitat,
            plantCount: testCase.plants.length
          });

          // Sende Update über aktuellen Testfall
          await writer.write(encoder.encode(
            `data: ${JSON.stringify({
              type: 'progress',
              current: testCase.example,
              processed: processedCount,
              total: filteredTestCases.length
            })}\n\n`
          ));

          // Führe Analyse durch
          const analysisStartTime = performance.now();
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
          const analysisResult = await analyzeImageStructured({
            erfassungsperson: "Test",
            email: "test@example.com",
            gemeinde: testCase.category,
            flurname: testCase.subCategory,
            latitude: 0,
            longitude: 0,
            standort: testCase.description || "",
            bilder: testCase.imageUrls.map(url => ({
              imageKey: testCase.id,
              filename: url.split('/').pop() || '',
              url: url.startsWith('http') ? url : `${baseUrl}${url}`,
              analyse: testCase.plants.join(', '),
              plantnetResult: undefined
            }))
          });
          const analysisDuration = performance.now() - analysisStartTime;

          logTestEvent('analysis_completed', {
            caseId: testCase.id,
            duration: analysisDuration,
            detectedHabitat: analysisResult.result?.habitattyp,
            success: analysisResult.result?.habitattyp === testCase.expectedHabitat
          });

          const result: TestResult = {
            testCaseId: testCase.id,
            success: analysisResult.result?.habitattyp === testCase.expectedHabitat,
            detectedHabitat: analysisResult.result?.habitattyp || 'unbekannt',
            expectedHabitat: testCase.expectedHabitat,
            timestamp: new Date().toISOString(),
            analysis: analysisResult.result || undefined
          };

          results.push(result);
          processedCount++;

          // Sende Teilergebnis
          await writer.write(encoder.encode(
            `data: ${JSON.stringify({
              type: 'result',
              testResult: result,
              processed: processedCount,
              total: filteredTestCases.length
            })}\n\n`
          ));

          // Wenn wir nur einen Testfall ausführen, beenden wir hier
          if (testCaseId) {
            break;
          }
        }

        // Berechne finale Erfolgsrate
        testRun.results = results;
        testRun.successRate = (results.filter(r => r.success).length / results.length) * 100;

        logTestEvent('test_run_completed', {
          runId: testRun.id,
          totalCases: results.length,
          successRate: testRun.successRate
        });

        // Sende finales Ergebnis
        await writer.write(encoder.encode(
          `data: ${JSON.stringify({
            type: 'complete',
            testRun
          })}\n\n`
        ));
      } catch (error) {
        logTestEvent('test_run_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    logTestEvent('test_run_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Fehler beim Ausführen der Tests' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'all';
  const testCaseId = searchParams.get('testCaseId') || undefined;
  return handleTestRun(category, testCaseId);
}

export async function POST(request: Request) {
  const { category, testCaseId } = await request.json();
  return handleTestRun(category || 'all', testCaseId);
} 