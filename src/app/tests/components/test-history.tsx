'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TestRun } from '../types/test-types';

interface TestHistoryProps {
  testRuns?: TestRun[];
  onSelectTestRun?: (testRun: TestRun) => void;
}

export function TestHistory({ testRuns = [], onSelectTestRun }: TestHistoryProps) {
  const [selectedRunId, setSelectedRunId] = useState<string>('');

  const handleSelect = (value: string) => {
    setSelectedRunId(value);
    const selectedRun = testRuns.find(run => run.id === value);
    if (selectedRun && onSelectTestRun) {
      onSelectTestRun(selectedRun);
    }
  };

  return (
    <div className="w-[300px]">
      <Select value={selectedRunId} onValueChange={handleSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Wähle einen Testlauf" />
        </SelectTrigger>
        <SelectContent>
          {testRuns.map((run) => (
            <SelectItem key={run.id} value={run.id}>
              {new Date(run.timestamp).toLocaleString()} - 
              {run.successRate.toFixed(1)}% Erfolg
            </SelectItem>
          ))}
          {testRuns.length === 0 && (
            <SelectItem value="none" disabled>
              Keine Testläufe verfügbar
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
} 