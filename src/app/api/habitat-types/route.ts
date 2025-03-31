import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { auth } from '@clerk/nextjs/server';
import { promises as fs } from 'fs';
import path from 'path';
import { validateHabitatType } from '@/lib/services/habitat-service';
import { Document, WithId } from 'mongodb';

// Typdefinitionen
interface TestCase {
  habitatType: string;
  category: string;
  plants: string[];
}

interface HabitatTypeDB {
  _id: any;
  name: string;
  typicalSpecies?: string[];
  // weitere Felder hier ergänzen
}

interface MissingHabitatType {
  name: string;
  category: string;
}

interface HabitatWithMissingPlants {
  name: string;
  missingPlants: string[];
}

interface AnalysisResult {
  totalHabitatTypes: number;
  totalTestCases: number;
  missingHabitatTypes: MissingHabitatType[];
  habitatTypesWithMissingPlants: HabitatWithMissingPlants[];
}

interface UpdateResult extends AnalysisResult {
  updatedHabitatTypes: {
    name: string;
    addedPlants: string[];
    totalPlants: number;
  }[];
}

// Hilfsfunktion zum Laden der Testcases
async function loadTestCasesFromDirectory(): Promise<TestCase[]> {
  const testImagesPath = process.env.HABITAT_TEST_IMAGES_PATH;
  
  if (!testImagesPath) {
    throw new Error('HABITAT_TEST_IMAGES_PATH ist nicht in der .env Datei definiert');
  }

  try {
    const categories = await fs.readdir(testImagesPath, { withFileTypes: true });
    const testCases: TestCase[] = [];
    
    for (const category of categories) {
      if (!category.isDirectory()) continue;
      
      const categoryPath = path.join(testImagesPath, category.name);
      const subCategories = await fs.readdir(categoryPath, { withFileTypes: true });
      
      for (const subCategory of subCategories) {
        if (!subCategory.isDirectory()) continue;

        const subCategoryPath = path.join(categoryPath, subCategory.name);
        
        // Prüfe Standard-Pflanzenliste
        const subCategoryPlantsFile = path.join(subCategoryPath, 'pflanzen.md');
        let subCategoryPlants: string[] = [];
        
        try {
          const fileContent = await fs.readFile(subCategoryPlantsFile, 'utf-8');
          subCategoryPlants = fileContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        } catch {
          // Datei existiert nicht oder kann nicht gelesen werden
        }

        // Alle Beispielverzeichnisse durchsuchen
        const examples = await fs.readdir(subCategoryPath, { withFileTypes: true });
        for (const example of examples) {
          if (!example.isDirectory() || !example.name.startsWith('Beispiel')) continue;
          
          const examplePath = path.join(subCategoryPath, example.name);
          const examplePlantsFile = path.join(examplePath, 'pflanzen.md');
          
          let plants: string[] = [...subCategoryPlants]; // Standard-Pflanzen als Basis
          
          try {
            const fileContent = await fs.readFile(examplePlantsFile, 'utf-8');
            const examplePlants = fileContent
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0);
            
            // Beispiel-spezifische Pflanzen hinzufügen
            plants = Array.from(new Set([...plants, ...examplePlants]));
          } catch {
            // Datei existiert nicht oder kann nicht gelesen werden
          }
          
          if (plants.length > 0) {
            testCases.push({
              habitatType: subCategory.name,
              category: category.name,
              plants: plants
            });
          }
        }
        
        // Falls keine Beispiele aber Pflanzen vorhanden sind
        if (subCategoryPlants.length > 0 && !testCases.some(tc => tc.habitatType === subCategory.name)) {
          testCases.push({
            habitatType: subCategory.name,
            category: category.name,
            plants: subCategoryPlants
          });
        }
      }
    }
    
    return testCases;
  } catch (error) {
    console.error('Fehler beim Lesen der Testcases:', error);
    throw error;
  }
}

// Analyse der Habitattypen und Pflanzen
async function analyzeHabitatTypes(): Promise<AnalysisResult> {
  const db = await connectToDatabase();
  const collection = db.collection('habitatTypes');
  
  // Alle Habitattypen aus der Datenbank laden
  const habitatTypesRaw = await collection.find({}).toArray();
  // Konvertierung zu HabitatTypeDB
  const habitatTypes: HabitatTypeDB[] = habitatTypesRaw.map(doc => doc as unknown as HabitatTypeDB);
  
  // Alle Testcases laden
  const testCases = await loadTestCasesFromDirectory();
  
  // Ergebnis-Objekt vorbereiten
  const result: AnalysisResult = {
    totalHabitatTypes: habitatTypes.length,
    totalTestCases: testCases.length,
    missingHabitatTypes: [],
    habitatTypesWithMissingPlants: []
  };
  
  // Für jeden Testcase prüfen, ob der Habitattyp existiert
  for (const testCase of testCases) {
    const matchingHabitatType = habitatTypes.find(ht => ht.name === testCase.habitatType);
    
    if (!matchingHabitatType) {
      // Habitattyp existiert nicht in der Datenbank
      if (!result.missingHabitatTypes.some(mht => mht.name === testCase.habitatType)) {
        result.missingHabitatTypes.push({
          name: testCase.habitatType,
          category: testCase.category
        });
      }
      continue;
    }
    
    // Prüfen, ob alle Pflanzen im Habitattyp vorhanden sind
    const typicalSpecies = matchingHabitatType.typicalSpecies || [];
    const missingPlants = testCase.plants.filter(
      plant => !typicalSpecies.includes(plant)
    );
    
    if (missingPlants.length > 0) {
      result.habitatTypesWithMissingPlants.push({
        name: matchingHabitatType.name,
        missingPlants: missingPlants
      });
    }
  }
  
  return result;
}

// Aktualisieren der Habitattypen mit fehlenden Pflanzen
async function updateHabitatTypesWithMissingPlants(): Promise<UpdateResult> {
  const db = await connectToDatabase();
  const collection = db.collection('habitatTypes');
  
  // Analyse durchführen
  const analysis = await analyzeHabitatTypes();
  const updateResults: {
    name: string;
    addedPlants: string[];
    totalPlants: number;
  }[] = [];
  
  // Für jeden Habitattyp mit fehlenden Pflanzen
  for (const habitat of analysis.habitatTypesWithMissingPlants) {
    const habitatType = await collection.findOne({ name: habitat.name }) as unknown as HabitatTypeDB;
    
    if (habitatType) {
      const typicalSpecies = habitatType.typicalSpecies || [];
      const updatedSpecies = Array.from(new Set([...typicalSpecies, ...habitat.missingPlants]));
      
      // Aktualisieren des Habitattyps
      await collection.updateOne(
        { _id: habitatType._id },
        { $set: { typicalSpecies: updatedSpecies } }
      );
      
      updateResults.push({
        name: habitat.name,
        addedPlants: habitat.missingPlants,
        totalPlants: updatedSpecies.length
      });
    }
  }
  
  return {
    ...analysis,
    updatedHabitatTypes: updateResults
  };
}

export async function GET() {
  try {
    // Authentifizierung prüfen
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }
    
    const db = await connectToDatabase();
    const collection = db.collection('habitatTypes');
    
    // Abfrage aller Habitattypen aus der Kollektion
    const habitatTypes = await collection.find({}).toArray();
    
    // Sortiere die Habitattypen alphabetisch nach Namen
    const sortedHabitatTypes = habitatTypes.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    
    // Analyse der Testcases und Habitattypen
    const analysis = await analyzeHabitatTypes();
    
    return NextResponse.json(sortedHabitatTypes);
  } catch (error) {
    console.error('Fehler beim Abrufen der Habitattypen:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Habitattypen' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Authentifizierung prüfen
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }
    
    // Führe die Aktualisierung durch
    const updateResults = await updateHabitatTypesWithMissingPlants();
    
    return NextResponse.json({
      message: 'Habitattypen erfolgreich aktualisiert',
      results: updateResults
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Habitattypen:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Habitattypen' },
      { status: 500 }
    );
  }
} 