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

// Neue Interfaces für Habitat-Typen-Analyse
export interface MissingHabitatType {
  name: string;
  category: string;
}

export interface HabitatWithMissingPlants {
  name: string;
  missingPlants: string[];
}

export interface HabitatAnalysisResult {
  totalHabitatTypes: number;
  totalTestCases: number;
  missingHabitatTypes: MissingHabitatType[];
  habitatTypesWithMissingPlants: HabitatWithMissingPlants[];
}

export interface HabitatUpdateResult extends HabitatAnalysisResult {
  updatedHabitatTypes: {
    name: string;
    addedPlants: string[];
    totalPlants: number;
  }[];
} 