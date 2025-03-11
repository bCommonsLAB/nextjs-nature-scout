'use client';

import { Suspense, useState } from 'react';
import { TestControls } from './components/test-controls';
import { TestTable } from './components/test-table';
import { TestHistory } from './components/test-history';
import type { GroupedTestCases } from './types/test-types';
import { useRouter } from 'next/navigation';

async function loadInitialTestCases(): Promise<{
  testCases: GroupedTestCases;
  metadata: {
    count: number;
    categoryCounts: Record<string, number>;
  };
}> {
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const host = window.location.host;
  
  const response = await fetch(`${protocol}://${host}/api/tests/load-cases`, {
    method: 'POST',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('Fehler beim Laden der Testfälle');
  }

  return response.json();
}

export default function TestPage() {
  const router = useRouter();
  const [data, setData] = useState<Awaited<ReturnType<typeof loadInitialTestCases>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Lade die initialen Daten
  useState(() => {
    loadInitialTestCases()
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  });

  // Reload Funktion
  async function handleReload() {
    setIsLoading(true);
    try {
      const newData = await loadInitialTestCases();
      setData(newData);
      router.refresh(); // Aktualisiere die Route um sicherzustellen, dass alle Server-Komponenten neu geladen werden
    } catch (error) {
      console.error('Fehler beim Neuladen:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading || !data) {
    return <div>Lade Testfälle...</div>;
  }

  const { testCases, metadata } = data;
  const allTestCases = Object.values(testCases).flat();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Habitat-Erkennungs-Tests</h1>
      
      <div className="space-y-8">
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Test Kontrollen</h2>
          <Suspense fallback={<div>Lade Kontrollen...</div>}>
            <TestControls 
              testCases={testCases} 
              onReload={handleReload}
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
                <TestHistory />
              </Suspense>
            </div>
          </div>
          
          <Suspense fallback={<div>Lade Testergebnisse...</div>}>
            <TestTable testCases={allTestCases} />
          </Suspense>
        </div>
      </div>
    </div>
  );
} 