import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/services/db';
import { promises as fs } from 'fs';
import path from 'path';

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
    console.warn('HABITAT_TEST_IMAGES_PATH ist nicht in der .env Datei definiert');
    return [];
  }

  try {
    // Prüfen, ob der Pfad existiert
    try {
      await fs.access(testImagesPath);
    } catch (error) {
      console.warn(`Pfad ${testImagesPath} ist nicht zugänglich:`, error);
      return [];
    }

    const categories = await fs.readdir(testImagesPath, { withFileTypes: true });
    const testCases: TestCase[] = [];
    
    for (const category of categories) {
      if (!category.isDirectory()) continue;
      
      try {
        const categoryPath = path.join(testImagesPath, category.name);
        const subCategories = await fs.readdir(categoryPath, { withFileTypes: true });
        
        for (const subCategory of subCategories) {
          if (!subCategory.isDirectory()) continue;

          try {
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
            try {
              const examples = await fs.readdir(subCategoryPath, { withFileTypes: true });
              for (const example of examples) {
                if (!example.isDirectory() || !example.name.startsWith('Beispiel')) continue;
                
                try {
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
                } catch (exampleError) {
                  console.warn(`Fehler beim Verarbeiten des Beispiels ${example.name}:`, exampleError);
                  continue;
                }
              }
            } catch (examplesError) {
              console.warn(`Fehler beim Lesen der Beispiele in ${subCategoryPath}:`, examplesError);
            }
            
            // Falls keine Beispiele aber Pflanzen vorhanden sind
            if (subCategoryPlants.length > 0 && !testCases.some(tc => tc.habitatType === subCategory.name)) {
              testCases.push({
                habitatType: subCategory.name,
                category: category.name,
                plants: subCategoryPlants
              });
            }
          } catch (subCategoryError) {
            console.warn(`Fehler beim Verarbeiten der Unterkategorie ${subCategory.name}:`, subCategoryError);
            continue;
          }
        }
      } catch (categoryError) {
        console.warn(`Fehler beim Verarbeiten der Kategorie ${category.name}:`, categoryError);
        continue;
      }
    }
    
    return testCases;
  } catch (error) {
    console.error('Fehler beim Lesen der Testcases:', error);
    // Bei Fehler leere Liste zurückgeben
    return [];
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
  
  // Ergebnis-Objekt vorbereiten
  const result: AnalysisResult = {
    totalHabitatTypes: habitatTypes.length,
    totalTestCases: 0,
    missingHabitatTypes: [],
    habitatTypesWithMissingPlants: []
  };
  
  // Optional: Analyse überspringen, wenn kein Dateipfad definiert ist
  if (!process.env.HABITAT_TEST_IMAGES_PATH) {
    return result;
  }
  
  try {
    // Alle Testcases laden
    const testCases = await loadTestCasesFromDirectory();
    result.totalTestCases = testCases.length;
    
    // Habitattypen-Map für schnellere Suche erstellen
    const habitatTypeMap = new Map<string, HabitatTypeDB>();
    habitatTypes.forEach(ht => habitatTypeMap.set(ht.name, ht));
    
    // Für jeden Testcase prüfen, ob der Habitattyp existiert
    for (const testCase of testCases) {
      const matchingHabitatType = habitatTypeMap.get(testCase.habitatType);
      
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
      // Für schnellere Suche ein Set aus typischen Arten erstellen
      const typicalSpeciesSet = new Set(typicalSpecies);
      
      const missingPlants = testCase.plants.filter(
        plant => !typicalSpeciesSet.has(plant)
      );
      
      if (missingPlants.length > 0) {
        result.habitatTypesWithMissingPlants.push({
          name: matchingHabitatType.name,
          missingPlants: missingPlants
        });
      }
    }
  } catch (error) {
    console.error('Fehler bei der Analyse der Habitattypen:', error);
    // Bei Fehler zumindest die grundlegenden Informationen zurückgeben
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
  
  // Wenn keine Habitattypen mit fehlenden Pflanzen vorhanden sind, früh zurückkehren
  if (!analysis.habitatTypesWithMissingPlants || analysis.habitatTypesWithMissingPlants.length === 0) {
    return {
      ...analysis,
      updatedHabitatTypes: []
    };
  }
  
  // Für jeden Habitattyp mit fehlenden Pflanzen
  for (const habitat of analysis.habitatTypesWithMissingPlants) {
    try {
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
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Habitattyps ${habitat.name}:`, error);
      // Fahre mit dem nächsten Habitat fort, anstatt die gesamte Verarbeitung abzubrechen
    }
  }
  
  return {
    ...analysis,
    updatedHabitatTypes: updateResults
  };
}

export async function GET() {
  try {
    // TEMPORÄR: Mock-Auth für Demo-Modus
    const userId = 'demo-user-123';
    // const { userId } = await auth();
    // if (!userId) {
    //   return NextResponse.json(
    //     { error: 'Nicht autorisiert' },
    //     { status: 401 }
    //   );
    // }
    
    const db = await connectToDatabase();
    const collection = db.collection('habitatTypes');
    
    // Abfrage aller Habitattypen aus der Kollektion
    const habitatTypes = await collection.find({}).toArray();
    
    // Sortiere die Habitattypen alphabetisch nach Namen
    const sortedHabitatTypes = habitatTypes.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    
    // Führe die Analyse nur aus, wenn die Umgebungsvariable gesetzt ist
    if (process.env.HABITAT_TEST_IMAGES_PATH) {
      try {
        // Analyse der Testcases und Habitattypen
        const analysis = await analyzeHabitatTypes();
        console.log('Habitat-Analyse durchgeführt:', {
          missingTypes: analysis.missingHabitatTypes.length,
          typesWithMissingPlants: analysis.habitatTypesWithMissingPlants.length
        });
      } catch (analyzeError) {
        // Bei Fehler in der Analyse nur loggen, aber keine Fehlerantwort zurückgeben
        console.error('Fehler bei der Habitat-Analyse (nicht kritisch):', analyzeError);
      }
    }
    
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
    // TEMPORÄR: Mock-Auth für Demo-Modus
    const userId = 'demo-user-123';
    // const { userId } = await auth();
    // if (!userId) {
    //   return NextResponse.json(
    //     { error: 'Nicht autorisiert' },
    //     { status: 401 }
    //   );
    // }
    
    // Prüfen, ob der Test-Images-Pfad existiert
    if (!process.env.HABITAT_TEST_IMAGES_PATH) {
      return NextResponse.json({
        message: 'Keine Aktualisierung durchgeführt: HABITAT_TEST_IMAGES_PATH ist nicht definiert',
        results: {
          totalHabitatTypes: 0,
          totalTestCases: 0,
          missingHabitatTypes: [],
          habitatTypesWithMissingPlants: [],
          updatedHabitatTypes: []
        }
      });
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