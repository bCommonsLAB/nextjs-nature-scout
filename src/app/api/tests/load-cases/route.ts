import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { TestCase } from '@/app/tests/types/test-types';

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

async function loadTestCasesFromDirectory(): Promise<TestCase[]> {
  const testImagesPath = process.env.HABITAT_TEST_IMAGES_PATH;
  const publicImagesPath = path.join(process.cwd(), 'public/test-images');
  
  if (!testImagesPath) {
    throw new Error('HABITAT_TEST_IMAGES_PATH ist nicht in der .env Datei definiert');
  }

  const testCases: TestCase[] = [];

  try {
    const categories = await fs.readdir(testImagesPath, { withFileTypes: true });
    
    for (const category of categories) {
      if (!category.isDirectory()) continue;
      
      const categoryPath = path.join(testImagesPath, category.name);
      const subCategories = await fs.readdir(categoryPath, { withFileTypes: true });

      for (const subCategory of subCategories) {
        if (!subCategory.isDirectory()) continue;

        const subCategoryPath = path.join(categoryPath, subCategory.name);
        const examples = await fs.readdir(subCategoryPath, { withFileTypes: true });

        // Prüfe ob es eine pflanzen.md auf Subkategorie-Ebene gibt
        const subCategoryPlantsFile = path.join(subCategoryPath, 'pflanzen.md');
        let subCategoryPlants: string[] = [];
        if (await fileExists(subCategoryPlantsFile)) {
          subCategoryPlants = await readPlantsFile(subCategoryPlantsFile);
        }

        for (const example of examples) {
          if (!example.isDirectory() || !example.name.startsWith('Beispiel')) continue;

          const examplePath = path.join(subCategoryPath, example.name);
          
          // Suche nach Bildern im Beispielordner
          const images = await findImageFiles(examplePath);
          if (images.length === 0) continue;

          // Suche nach pflanzen.md im Beispielordner oder verwende die von der Subkategorie
          let plants = subCategoryPlants;
          const examplePlantsFile = path.join(examplePath, 'pflanzen.md');
          if (await fileExists(examplePlantsFile)) {
            plants = await readPlantsFile(examplePlantsFile);
          }
          
          // Erstelle nur einen Testcase wenn wir Bilder UND Pflanzen haben
          if (plants.length > 0) {
            // Kopiere alle Bilder und erstelle die URLs
            const imageUrls = await Promise.all(images.map(async (image) => {
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
            }));

            // Erstelle einen Testcase für das Beispiel mit allen Bildern
            testCases.push({
              id: `${category.name}-${subCategory.name}-${example.name}`,
              imageUrls,
              plants,
              expectedHabitat: subCategory.name,
              category: category.name,
              subCategory: subCategory.name,
              example: example.name,
              description: `${subCategory.name} - ${example.name}`
            });
          }
        }
      }
    }

    console.log(`${testCases.length} Testfälle mit Bildern und Pflanzendaten gefunden`);
    return testCases;
  } catch (error) {
    console.error('Fehler beim Lesen des Verzeichnisses:', error);
    throw error;
  }
}

export async function POST() {
  try {
    const testCases = await loadTestCasesFromDirectory();
    
    // Gruppiere die Testfälle nach Kategorien
    const groupedTestCases = testCases.reduce((acc, testCase) => {
      const key = testCase.category;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(testCase);
      return acc;
    }, {} as Record<string, TestCase[]>);

    return NextResponse.json({
      testCases: groupedTestCases,
      metadata: {
        count: testCases.length,
        categoryCounts: Object.entries(groupedTestCases).reduce((acc, [category, cases]) => {
          acc[category] = cases.length;
          return acc;
        }, {} as Record<string, number>),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Fehler beim Laden der Testfälle:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Testfälle aus dem Verzeichnis' },
      { status: 500 }
    );
  }
} 