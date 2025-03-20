import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { TestCase } from '@/app/tests/types/test-types';
import { validateHabitatType } from '@/lib/services/habitat-service';

interface TestCaseResponse {
  testCases: Record<string, TestCaseInfo[]>;
  metadata: {
    count: number;
    categoryCounts: Record<string, number>;
    timestamp: string;
  };
  warning?: string;
  invalidHabitats?: { testCase: string; habitat: string }[];
}

interface TestCaseInfo {
  id: string;
  imageUrls: string[] | "Bilder fehlen";
  plants: string[] | "Pflanzenliste fehlt";
  expectedHabitat: string;
  category: string;
  subCategory: string;
  example: string;
  description: string;
  status: "vollständig" | "unvollständig";
}

// Rekursive Funktion zum Auslesen der Verzeichnisstruktur
async function printDirectoryStructure(dirPath: string, prefix = ''): Promise<string> {
  let output = '';
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      output += `${prefix}📁 ${entry.name}/\n`;
      output += await printDirectoryStructure(fullPath, prefix + '  ');
    } else {
      output += `${prefix}📄 ${entry.name}\n`;
    }
  }
  return output;
}

// Prüft ob eine Datei existiert
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Kopiert eine Datei und erstellt fehlende Verzeichnisse
async function copyFile(source: string, target: string): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}

// Liest die Pflanzen aus der pflanzen.md Datei
async function readPlantsFile(filePath: string): Promise<string[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

// Findet alle Bilddateien in einem Verzeichnis
async function findImageFiles(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath);
  return entries.filter(file => 
    file.toLowerCase().endsWith('.jpg') || 
    file.toLowerCase().endsWith('.jpeg') ||
    file.toLowerCase().endsWith('.png')
  );
}

/**
 * Liest Testfälle aus einer definierten Verzeichnisstruktur.
 * 
 * Verzeichnisstruktur:
 * /test-images/
 *   /{kategorie}/              # z.B. "Wiesen", "Wälder"
 *     /{habitattyp}/           # z.B. "Feuchtwiese", "Buchenwald"
 *       /pflanzen.md           # Optional: Standard-Pflanzenliste für alle Beispiele
 *       /Beispiel1/            # Testfall-Verzeichnis (muss mit "Beispiel" beginnen)
 *         /bild1.jpg           # Beliebige Anzahl Bilder
 *         /bild2.jpg
 *         /pflanzen.md         # Optional: Spezifische Pflanzenliste für dieses Beispiel
 *       /Beispiel2/
 *         ...
 * 
 * Logik:
 * 1. Durchsucht alle Kategorie-Verzeichnisse
 * 2. In jeder Kategorie werden Habitat-Verzeichnisse durchsucht
 * 3. Für jeden Habitattyp:
 *    - Prüft ob der Habitattyp in der Datenbank existiert
 *    - Liest optional eine Standard-Pflanzenliste (pflanzen.md)
 * 4. In jedem Habitat werden "Beispiel*"-Verzeichnisse gesucht
 * 5. Für jedes Beispiel:
 *    - Sucht nach Bildern
 *    - Verwendet entweder spezifische oder Standard-Pflanzenliste
 *    - Kopiert Bilder in den public-Ordner
 *    - Erstellt einen Testfall mit allen Informationen
 */
async function loadTestCasesFromDirectory(): Promise<TestCaseResponse> {
  const testImagesPath = process.env.HABITAT_TEST_IMAGES_PATH;
  const publicImagesPath = path.join(process.cwd(), 'public/test-images');
  
  if (!testImagesPath) {
    throw new Error('HABITAT_TEST_IMAGES_PATH ist nicht in der .env Datei definiert');
  }

  console.log('Starte Verarbeitung von:', testImagesPath);
  const testCases: TestCaseInfo[] = [];
  const invalidHabitats: { testCase: string; habitat: string }[] = [];

  try {
    const categories = await fs.readdir(testImagesPath, { withFileTypes: true });
    
    for (const category of categories) {
      if (!category.isDirectory()) continue;
      console.log(`\nVerarbeite Kategorie: ${category.name}`);
      
      const categoryPath = path.join(testImagesPath, category.name);
      const subCategories = await fs.readdir(categoryPath, { withFileTypes: true });
      
      for (const subCategory of subCategories) {
        if (!subCategory.isDirectory()) continue;
        console.log(`\n  Verarbeite Habitat: ${subCategory.name}`);

        const subCategoryPath = path.join(categoryPath, subCategory.name);
        const examples = await fs.readdir(subCategoryPath, { withFileTypes: true });

        // Prüfe Standard-Pflanzenliste
        const subCategoryPlantsFile = path.join(subCategoryPath, 'pflanzen.md');
        let subCategoryPlants: string[] = [];
        if (await fileExists(subCategoryPlantsFile)) {
          subCategoryPlants = await readPlantsFile(subCategoryPlantsFile);
          console.log(`    ✓ Standard-Pflanzenliste gefunden mit ${subCategoryPlants.length} Pflanzen`);
        }

        // Prüfe Habitat-Typ
        const isValidHabitat = await validateHabitatType(subCategory.name);
        if (!isValidHabitat) {
          console.log(`    ✗ Ungültiger Habitattyp: ${subCategory.name}`);
          invalidHabitats.push({
            testCase: `${category.name}-${subCategory.name}`,
            habitat: subCategory.name
          });
        }

        // Erstelle einen Eintrag für das Verzeichnis selbst, wenn keine Beispiele vorhanden sind
        const exampleDirs = examples.filter(e => e.isDirectory() && e.name.startsWith('Beispiel'));
        if (exampleDirs.length === 0) {
          testCases.push({
            id: `${category.name}-${subCategory.name}`,
            imageUrls: "Bilder fehlen",
            plants: subCategoryPlants.length > 0 ? subCategoryPlants : "Pflanzenliste fehlt",
            expectedHabitat: subCategory.name,
            category: category.name,
            subCategory: subCategory.name,
            example: "keine Beispiele",
            description: `${subCategory.name} - keine Beispiele`,
            status: "unvollständig"
          });
          continue;
        }

        // Verarbeite alle Beispielverzeichnisse
        for (const example of examples) {
          if (!example.isDirectory() || !example.name.startsWith('Beispiel')) continue;
          console.log(`\n    Verarbeite Beispiel: ${example.name}`);

          const examplePath = path.join(subCategoryPath, example.name);
          const images = await findImageFiles(examplePath);
          const imageUrls = images.length > 0 ? 
            await Promise.all(images.map(async (image) => {
              const relativePath = path.join(
                category.name,
                subCategory.name,
                example.name,
                image
              ).replace(/\\/g, '/');
              const sourcePath = path.join(examplePath, image);
              const targetPath = path.join(publicImagesPath, relativePath);
              await copyFile(sourcePath, targetPath);
              return '/test-images/' + relativePath;
            })) : 
            "Bilder fehlen";

          // Prüfe Pflanzenliste
          let plants: string[] | "Pflanzenliste fehlt" = "Pflanzenliste fehlt";
          const examplePlantsFile = path.join(examplePath, 'pflanzen.md');
          if (await fileExists(examplePlantsFile)) {
            plants = await readPlantsFile(examplePlantsFile);
          } else if (subCategoryPlants.length > 0) {
            plants = subCategoryPlants;
          }

          // Erstelle den Testfall
          testCases.push({
            id: `${category.name}-${subCategory.name}-${example.name}`,
            imageUrls,
            plants,
            expectedHabitat: subCategory.name,
            category: category.name,
            subCategory: subCategory.name,
            example: example.name,
            description: `${subCategory.name} - ${example.name}`,
            status: typeof imageUrls !== "string" && typeof plants !== "string" ? "vollständig" : "unvollständig"
          });
        }
      }
    }

    // Gruppiere die Testfälle nach Kategorien
    const groupedTestCases = testCases.reduce((acc, testCase) => {
      const key = testCase.category;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(testCase);
      return acc;
    }, {} as Record<string, TestCaseInfo[]>);

    const response: TestCaseResponse = {
      testCases: groupedTestCases,
      metadata: {
        count: testCases.length,
        categoryCounts: Object.entries(groupedTestCases).reduce((acc, [category, cases]) => {
          acc[category] = cases.length;
          return acc;
        }, {} as Record<string, number>),
        timestamp: new Date().toISOString()
      }
    };

    if (invalidHabitats.length > 0) {
      return {
        ...response,
        warning: `Warnung: ${invalidHabitats.length} Testfälle haben ungültige Habitattypen:`,
        invalidHabitats
      };
    }

    return response;

  } catch (error) {
    console.error('Fehler beim Lesen des Verzeichnisses:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const result = await loadTestCasesFromDirectory();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Fehler beim Laden der Testfälle:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Testfälle aus dem Verzeichnis' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
} 