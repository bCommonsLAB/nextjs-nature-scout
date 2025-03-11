'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CategorySelect } from './category-select';
import { RefreshCw } from 'lucide-react';
import type { GroupedTestCases, TestState, TestResult, TestRun } from '../types/test-types';

interface TestControlsProps {
  testCases: GroupedTestCases;
  onReload?: () => Promise<void>;
  onTestProgress?: (current: string, progress: number) => void;
  onTestResult?: (result: TestResult) => void;
  onTestComplete?: (testRun: TestRun) => void;
}

export function TestControls({ 
  testCases, 
  onReload,
  onTestProgress,
  onTestResult,
  onTestComplete 
}: TestControlsProps) {
  const [state, setState] = useState<TestState>({
    selectedCategory: 'all',
    isRunning: false,
    progress: 0,
    currentExample: ''
  });

  const [isReloading, setIsReloading] = useState(false);

  async function handleReload() {
    if (!onReload) return;
    
    setIsReloading(true);
    try {
      await onReload();
    } finally {
      setIsReloading(false);
    }
  }

  async function startTest() {
    setState(prev => ({ ...prev, isRunning: true, progress: 0, currentExample: '' }));
    
    try {
      const eventSource = new EventSource(`/api/tests/run?category=${state.selectedCategory}`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'progress':
            const progress = (data.processed / data.total) * 100;
            setState(prev => ({ 
              ...prev, 
              progress,
              currentExample: data.current 
            }));
            onTestProgress?.(data.current, progress);
            break;

          case 'result':
            onTestResult?.(data.testResult);
            break;

          case 'complete':
            setState(prev => ({ 
              ...prev, 
              isRunning: false, 
              progress: 100 
            }));
            onTestComplete?.(data.testRun);
            eventSource.close();
            break;

          case 'error':
            console.error('Test Fehler:', data.error);
            setState(prev => ({ 
              ...prev, 
              isRunning: false 
            }));
            eventSource.close();
            break;
        }
      };

      eventSource.onerror = () => {
        console.error('EventSource Fehler');
        setState(prev => ({ ...prev, isRunning: false }));
        eventSource.close();
      };
    } catch (error) {
      console.error('Test Fehler:', error);
      setState(prev => ({ 
        ...prev, 
        isRunning: false 
      }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <CategorySelect
            categories={testCases}
            selectedCategory={state.selectedCategory}
            onCategoryChange={(category) => 
              setState(prev => ({ ...prev, selectedCategory: category }))
            }
          />
        </div>

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
          onClick={startTest} 
          disabled={state.isRunning}
          variant="default"
        >
          {state.isRunning ? 'Test läuft...' : 'Test starten'}
        </Button>
      </div>

      {state.isRunning && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Aktuell: {state.currentExample}</span>
            <span>{Math.round(state.progress)}%</span>
          </div>
          <Progress value={state.progress} className="w-full" />
        </div>
      )}
      
      {state.progress === 100 && !state.isRunning && (
        <div className="text-green-600">Test abgeschlossen!</div>
      )}
    </div>
  );
} 