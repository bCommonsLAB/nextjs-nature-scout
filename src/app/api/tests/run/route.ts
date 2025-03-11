import { NextResponse } from 'next/server';
import { analyzeImageStructured } from '@/lib/services/openai-service';
import type { TestCase, TestResult, TestRun } from '@/app/tests/types/test-types';

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const { category } = await request.json();

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

    // Starte asynchrone Verarbeitung
    (async () => {
      try {
        const results: TestResult[] = [];
        let processedCount = 0;

        // Lade Testfälle
        const response = await fetch(`${request.headers.get('origin')}/api/tests/load-cases`, {
          method: 'POST',
          cache: 'no-store'
        });
        const { testCases } = await response.json();
        
        // Flache Liste von Testfällen erstellen
        const allTestCases = Object.values(testCases).flat() as TestCase[];
        const filteredTestCases = category === 'all' 
          ? allTestCases 
          : allTestCases.filter(tc => tc.category === category);

        // Verarbeite jeden Testfall
        for (const testCase of filteredTestCases) {
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
          const analysisResult = await analyzeImageStructured({
            bilder: testCase.imageUrls.map(url => ({
              url,
              analyse: testCase.plants.join(', ')
            }))
          });

          const result: TestResult = {
            testCaseId: testCase.id,
            success: analysisResult.result?.habitattyp === testCase.expectedHabitat,
            detectedHabitat: analysisResult.result?.habitattyp || 'unbekannt',
            expectedHabitat: testCase.expectedHabitat,
            timestamp: new Date().toISOString(),
            analysis: analysisResult.result
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
        }

        // Berechne finale Erfolgsrate
        testRun.results = results;
        testRun.successRate = (results.filter(r => r.success).length / results.length) * 100;

        // Sende finales Ergebnis
        await writer.write(encoder.encode(
          `data: ${JSON.stringify({
            type: 'complete',
            testRun
          })}\n\n`
        ));
      } catch (error) {
        // Sende Fehlermeldung
        await writer.write(encoder.encode(
          `data: ${JSON.stringify({
            type: 'error',
            error: 'Fehler bei der Testausführung'
          })}\n\n`
        ));
      } finally {
        await writer.close();
      }
    })();

    return new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Fehler bei der Testausführung:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler bei der Testausführung' },
      { status: 500 }
    );
  }
} 