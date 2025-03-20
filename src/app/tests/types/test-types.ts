export interface TestCase {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  expectedHabitat: string;
  imageUrls: string[] | "Bilder fehlen";
  plants: string[] | "Pflanzenliste fehlt";
  status: "vollständig" | "unvollständig";
}

export interface TestResult {
  testCaseId: string;
  expectedHabitat: string;
  predictedHabitat: string;
  confidence: number;
  isCorrect: boolean;
  timestamp: string;
}

export interface TestRun {
  id: string;
  timestamp: string;
  results: TestResult[];
  successRate: number;
}

export interface TestMetadata {
  count: number;
  categoryCounts: Record<string, number>;
}

export type GroupedTestCases = Record<string, TestCase[]>;

export interface TestState {
  isRunning: boolean;
  progress: number;
  currentExample: string;
  selectedCategory: string;
  selectedTestCaseId?: string;
}

export interface TestHistory {
  runs: TestRun[];
  averageSuccessRate: number;
  totalRuns: number;
  lastRun?: TestRun;
}

export type { 
  TestCase, 
  TestResult, 
  TestRun, 
  GroupedTestCases, 
  TestMetadata,
  TestState,
  TestHistory 
}; 