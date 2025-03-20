'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CategorySelect } from './category-select';
import { RefreshCw } from 'lucide-react';
import type { GroupedTestCases, TestState, TestResult, TestRun } from '../types/test-types';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { v4 as uuidv4 } from 'uuid';

interface TestControlsProps {
  testCases: GroupedTestCases;
  onReload?: () => Promise<void>;
  onTestProgress?: (current: string, progress: number) => void;
  onTestResult?: (result: TestResult) => void;
  onTestComplete?: (testRun: TestRun) => void;
  data?: {
    warning?: string;
    invalidHabitats?: { testCase: string; habitat: string }[];
  };
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function TestControls({ 
  testCases, 
  onReload,
  onTestProgress,
  onTestResult,
  onTestComplete,
  data,
  selectedCategory,
  onCategoryChange
}: TestControlsProps) {
  const [state, setState] = useState<TestState>({
    selectedCategory: 'all',
    isRunning: false,
    progress: 0,
    currentExample: '',
    selectedTestCaseId: undefined
  });

  const [isReloading, setIsReloading] = useState(false);

  // Extrahiere alle Hauptkategorien
  const mainCategories = Object.keys(testCases).sort();

  async function handleReload() {
    if (!onReload) return;
    
    setIsReloading(true);
    try {
      await onReload();
    } finally {
      setIsReloading(false);
    }
  }

  // Starte Tests für die ausgewählte Kategorie oder alle
  const runTests = async () => {
    setState(prev => ({ ...prev, isRunning: true, progress: 0, currentExample: '' }));
    
    const selectedTests = selectedCategory === 'all' 
      ? Object.values(testCases).flat()
      : testCases[selectedCategory] || [];

    const totalTests = selectedTests.length;
    let completed = 0;
    let successCount = 0;

    const testRun: TestRun = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      results: [],
      successRate: 0
    };

    for (const testCase of selectedTests) {
      if (!testCase.imageUrls || typeof testCase.imageUrls === 'string') {
        completed++;
        continue;
      }

      setState(prev => ({ ...prev, currentExample: testCase.name }));
      const progress = (completed / totalTests) * 100;
      setState(prev => ({ ...prev, progress }));
      onTestProgress?.(testCase.name, progress);

      try {
        const response = await fetch('/api/tests/run-test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testCase),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: TestResult = await response.json();
        if (result.isCorrect) {
          successCount++;
        }
        testRun.results.push(result);
        onTestResult?.(result);
    } catch (error) {
        console.error('Error running test:', error);
      }

      completed++;
    }

    // Berechne die Erfolgsrate
    testRun.successRate = (successCount / totalTests) * 100;

    setState(prev => ({ ...prev, isRunning: false, progress: 100 }));
    onTestComplete?.(testRun);
  };

  // Erstelle eine flache Liste aller Testfälle für die Auswahl
  const allTestCases = Object.values(testCases).flat();

  return (
    <div className="space-y-4">
      {data?.warning && data.invalidHabitats && (
        <Alert variant="destructive">
          <AlertTitle>Warnung: Ungültige Habitattypen</AlertTitle>
          <AlertDescription>
            <p>{data.warning}</p>
            <ul className="list-disc pl-4 mt-2">
              {data.invalidHabitats.map((invalid, index) => (
                <li key={index}>
                  Testfall {invalid.testCase}: "{invalid.habitat}"
                </li>
              ))}
            </ul>
            <p className="mt-2">
              Bitte stellen Sie sicher, dass alle erwarteten Habitattypen in der Datenbank existieren.
              Rufen Sie ggf. /api/init auf, um die Habitattypen zu initialisieren.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Kategorie wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kategorien</SelectItem>
              {mainCategories.map(category => (
                <SelectItem key={category} value={category}>
                  {category.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select
          value={state.selectedTestCaseId}
          onValueChange={(value) => setState(prev => ({ ...prev, selectedTestCaseId: value }))}
        >
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Wähle einen Testfall" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={undefined}>Alle Testfälle</SelectItem>
            {allTestCases.map((testCase) => (
              <SelectItem key={testCase.id} value={testCase.id}>
                {testCase.category} - {testCase.subCategory} - {testCase.example}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          size="icon"
          title="Testdaten von Verzeichnis neu laden"
          onClick={handleReload}
          disabled={isReloading || !onReload || state.isRunning}
          className={isReloading ? 'animate-spin' : ''}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button 
          onClick={runTests} 
          disabled={state.isRunning}
        >
          Tests starten
        </Button>
      </div>

      {state.isRunning && (
        <Card className="p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
              <span>Aktueller Test: {state.currentExample}</span>
            <span>{Math.round(state.progress)}%</span>
            </div>
            <Progress value={state.progress} />
          </div>
        </Card>
      )}
      
      {state.progress === 100 && !state.isRunning && (
        <div className="text-green-600">Test abgeschlossen!</div>
      )}
    </div>
  );
} 