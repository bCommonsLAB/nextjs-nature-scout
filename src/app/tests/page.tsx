'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TestControls } from './components/test-controls';
import { TestTable } from './components/test-table';
import { TestHistory } from './components/test-history';
import type { GroupedTestCases, TestResult, TestRun } from './types/test-types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Hilfsfunktion für strukturiertes Logging
function logTestEvent(event: string, data: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    data
  }));
}

export default function TestPage() {
  const router = useRouter();
  const [testCases, setTestCases] = useState<GroupedTestCases>({});
  const [metadata, setMetadata] = useState({
    count: 0,
    categoryCounts: {} as Record<string, number>
  });
  const [currentResults, setCurrentResults] = useState<TestResult[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [invalidHabitats, setInvalidHabitats] = useState<{ testCase: string; habitat: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Lade initiale Testfälle
  useEffect(() => {
    loadTestCases();
  }, []);

  const loadTestCases = async () => {
    logTestEvent('loading_initial_test_cases', {});
    try {
      const response = await fetch('/api/tests/load-cases', {
        method: 'POST',
        cache: 'no-store'
      });
      const data = await response.json();
      
      logTestEvent('test_cases_loaded', {
        categoryCount: Object.keys(data.testCases).length,
        totalCases: Object.values(data.testCases).flat().length
      });

      setTestCases(data.testCases);
      setMetadata(data.metadata);
      if (data.warning) {
        setWarning(data.warning);
        setInvalidHabitats(data.invalidHabitats || []);
      } else {
        setWarning(null);
        setInvalidHabitats([]);
      }
    } catch (error) {
      logTestEvent('test_cases_load_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('Fehler beim Laden der Testfälle:', error);
    }
  };

  const handleReload = async () => {
    logTestEvent('reloading_test_cases', {});
    await loadTestCases();
  };

  const handleTestProgress = (current: string, progress: number) => {
    logTestEvent('test_progress', { current, progress });
  };

  const handleTestResult = (result: TestResult) => {
    logTestEvent('test_result_received', {
      caseId: result.testCaseId,
      success: result.success,
      detectedHabitat: result.detectedHabitat,
      expectedHabitat: result.expectedHabitat
    });
    setCurrentResults(prev => [...prev, result]);
  };

  const handleTestComplete = (testRun: TestRun) => {
    logTestEvent('test_run_completed', {
      runId: testRun.id,
      successRate: testRun.successRate,
      totalCases: testRun.results.length
    });
    setTestRuns(prev => [testRun, ...prev]);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  // Erstelle flache Liste aller Testfälle
  const allTestCases = Object.values(testCases).flat();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Habitat-Erkennungs-Tests</h1>
      
      {warning && invalidHabitats.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Warnung: Ungültige Habitattypen gefunden!</AlertTitle>
          <AlertDescription>
            <p>{warning}</p>
            <ul className="list-disc pl-4 mt-2">
              {invalidHabitats.map((invalid, index) => (
                <li key={index}>
                  Testfall {invalid.testCase}: "{invalid.habitat}" ist kein gültiger Habitattyp
                </li>
              ))}
            </ul>
            <p className="mt-2 font-semibold">
              Bitte korrigieren Sie die Testfälle oder initialisieren Sie die Habitattypen-Datenbank mit /api/init
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-8">
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Test Kontrollen</h2>
          <Suspense fallback={<div>Lade Kontrollen...</div>}>
            <TestControls 
              testCases={testCases} 
              onReload={handleReload}
              onTestProgress={handleTestProgress}
              onTestResult={handleTestResult}
              onTestComplete={handleTestComplete}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </Suspense>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Testergebnisse</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {metadata.count} Testfälle in {Object.keys(metadata.categoryCounts).length} Kategorien
              </span>
              <Suspense fallback={<div>Lade Historie...</div>}>
                <TestHistory testRuns={testRuns} />
              </Suspense>
            </div>
          </div>
          
          <Suspense fallback={<div>Lade Testergebnisse...</div>}>
            <TestTable 
              testCases={allTestCases} 
              results={currentResults}
              selectedCategory={selectedCategory}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
} 