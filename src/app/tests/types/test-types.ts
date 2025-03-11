interface TestCase {
  id: string;
  imageUrls: string[];  // Array von Bild-URLs statt einzelner URL
  plants: string[];
  expectedHabitat: string;
  description?: string;
  category: string;      // z.B. "Grasland_Wiesen"
  subCategory: string;   // z.B. "alpines Grasland"
  example: string;       // z.B. "Beispiel1"
}

interface TestResult {
  testCaseId: string;
  success: boolean;
  detectedHabitat: string;
  expectedHabitat: string;
  timestamp: string;
  analysis?: {
    habitattyp: string;
    standort: any;
    vegetationsstruktur: any;
    blühaspekte: any;
    nutzung: any;
    zusammenfassung: string;
  };
}

interface TestRun {
  id: string;
  timestamp: string;
  results: TestResult[];
  successRate: number;
  algorithmVersion: string;
  category?: string;     // Die Kategorie für die der Test durchgeführt wurde
}

interface GroupedTestCases {
  [category: string]: TestCase[];
}

interface TestMetadata {
  count: number;
  categoryCounts: Record<string, number>;
  timestamp: string;
}

interface TestState {
  selectedCategory: string;  // "all" oder eine spezifische Kategorie
  isRunning: boolean;
  progress: number;
  currentExample?: string;   // Aktuell analysiertes Beispiel
  currentResults?: TestRun;
}

export type { 
  TestCase, 
  TestResult, 
  TestRun, 
  GroupedTestCases, 
  TestMetadata,
  TestState 
}; 