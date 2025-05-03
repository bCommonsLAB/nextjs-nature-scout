import { connectToDatabase } from './db';
import { ObjectId } from 'mongodb';
import { normalizeSchutzstatus } from '@/lib/utils/data-validation';

export interface HabitatType {
  _id?: ObjectId;
  name: string;
  description: string;
  typicalSpecies: string[];
  habitatFamilie?: string;
  schutzstatus?: string;
}

/**
 * Erstellt Indizes für die Habitat-Sammlung
 */
export async function createHabitatTypeIndexes(): Promise<void> {
  const db = await connectToDatabase();
  const collection = db.collection('habitatTypes');
  
  // Index für den Namen (häufig für Suche und Sortierung verwendet)
  await collection.createIndex({ name: 1 }, { unique: true });
  
  // Index für habitatFamilie, falls häufig danach gefiltert wird
  await collection.createIndex({ habitatFamilie: 1 });
  
  // Index für schutzstatus, falls häufig danach gefiltert wird
  await collection.createIndex({ schutzstatus: 1 });
  
  console.log('Habitat-Indizes wurden erstellt oder aktualisiert');
}

/**
 * Erstellt Indizes für die analyseJobs-Sammlung (Habitat-Daten)
 * um Filterungen und Sortierungen zu beschleunigen
 */
export async function createAnalyseJobsIndexes(): Promise<void> {
  const db = await connectToDatabase();
  const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
  
  // Grundlegende Indizes für Einzelfelder
  await collection.createIndex({ 'metadata.gemeinde': 1 });
  await collection.createIndex({ 'metadata.erfassungsperson': 1 });
  await collection.createIndex({ 'metadata.email': 1 });
  await collection.createIndex({ 'metadata.organizationName': 1 });
  await collection.createIndex({ 'result.habitattyp': 1 });
  await collection.createIndex({ 'result.habitatfamilie': 1 });
  await collection.createIndex({ 'result.schutzstatus': 1 });
  await collection.createIndex({ 'verifiedResult.habitatfamilie': 1 });
  await collection.createIndex({ verified: 1 });
  await collection.createIndex({ deleted: 1 });
  await collection.createIndex({ updatedAt: -1 });
  
  // Verbundindizes für häufige Abfragen in der öffentlichen Ansicht
  await collection.createIndex({ deleted: 1, verified: 1 });
  await collection.createIndex({ deleted: 1, verified: 1, 'metadata.organizationName': 1 });
  await collection.createIndex({ deleted: 1, verified: 1, 'metadata.gemeinde': 1 });
  await collection.createIndex({ deleted: 1, verified: 1, 'result.habitattyp': 1 });
  await collection.createIndex({ deleted: 1, verified: 1, 'result.habitatfamilie': 1 });
  await collection.createIndex({ deleted: 1, verified: 1, 'result.schutzstatus': 1 });
  
  // Verbundindizes für Sortierung und Filterung
  await collection.createIndex({ deleted: 1, updatedAt: -1 });
  await collection.createIndex({ deleted: 1, verified: 1, updatedAt: -1 });
  
  // Text-Index für die Suchfunktion (für Freitextsuche)
  await collection.createIndex(
    { 
      'metadata.erfassungsperson': 'text', 
      'metadata.gemeinde': 'text', 
      'metadata.flurname': 'text',
      'result.habitattyp': 'text'
    },
    { name: 'text_search_index' }
  );
  
  console.log('AnalyseJobs-Indizes wurden erstellt oder aktualisiert');
}

// Cache für Filter-Optionen
interface FilterOptionsCache {
  gemeinden?: { data: string[], timestamp: number };
  habitate?: { data: string[], timestamp: number };
  familien?: { data: string[], timestamp: number };
  schutzstati?: { data: string[], timestamp: number };
  personen?: { data: string[], timestamp: number };
}

// Cache-Lebensdauer in Millisekunden (5 Minuten)
const FILTER_CACHE_TTL = 5 * 60 * 1000; 

// In-Memory-Cache
const filterOptionsCache: FilterOptionsCache = {};

/**
 * Lädt Filter-Optionen für Drop-downs aus der Datenbank mit Caching
 * @param type Art der Filteroption (gemeinden, habitate, familien, schutzstati, personen)
 * @param userEmail E-Mail des anfragenden Benutzers (für Berechtigungsprüfung)
 * @param hasAdvancedPermissions Gibt an, ob der Benutzer erweiterte Berechtigungen hat
 * @param forceRefresh Erzwingt das Neuladen aus der Datenbank, ignoriert den Cache
 */
export async function getFilterOptions(
  type: 'gemeinden' | 'habitate' | 'familien' | 'schutzstati' | 'personen',
  userEmail: string,
  hasAdvancedPermissions: boolean = false,
  forceRefresh: boolean = false
): Promise<string[]> {
  // Prüfe Cache, wenn kein Neuladen erzwungen wird
  const now = Date.now();
  const cachedData = filterOptionsCache[type];
  if (!forceRefresh && cachedData && (now - cachedData.timestamp) < FILTER_CACHE_TTL) {
    return cachedData.data;
  }
  
  const db = await connectToDatabase();
  const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');
  
  // Basisfilter: nicht gelöschte Dokumente
  const baseMatch: { 
    deleted?: { $ne: boolean },
    'metadata.email'?: string 
  } = { deleted: { $ne: true } };
  
  // Für normale Benutzer: Nur eigene Einträge
  if (!hasAdvancedPermissions) {
    baseMatch['metadata.email'] = userEmail;
  }
  
  let results: string[] = [];
  
  switch (type) {
    case 'gemeinden':
      const gemeindenAgg = await collection.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$metadata.gemeinde' } },
        { $match: { _id: { $ne: null } } },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      results = gemeindenAgg
        .map(item => item._id)
        .filter(Boolean) as string[];
      break;
      
    case 'habitate':
      const habitateAgg = await collection.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$result.habitattyp' } },
        { $match: { _id: { $ne: null } } },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      results = habitateAgg
        .map(item => item._id)
        .filter(Boolean) as string[];
      break;
      
    case 'familien':
      const habitateForFamilies = await collection.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$result.habitatfamilie' } },
        { $match: { _id: { $ne: null } } },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      results = habitateForFamilies
        .map(item => item._id)
        .filter(Boolean) as string[];
      break;
      
    case 'schutzstati':
      const schutzstatiAgg = await collection.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$result.schutzstatus' } },
        { $match: { _id: { $ne: null } } },
      ]).toArray();
      
      // Normalisiere die Schutzstatus-Werte
      const schutzstatiSet = new Set<string>();
      schutzstatiAgg.forEach(item => {
        if (item._id) {
          const normalizedStatus = normalizeSchutzstatus(item._id);
          if (normalizedStatus) schutzstatiSet.add(normalizedStatus);
        }
      });
      
      results = Array.from(schutzstatiSet).sort();
      break;
      
    case 'personen':
      if (!hasAdvancedPermissions) {
        // Benutze den Erfasser-Namen des Benutzers
        const personName = await collection.findOne(
          { 'metadata.email': userEmail },
          { projection: { 'metadata.erfassungsperson': 1 } }
        );
        
        if (personName?.metadata?.erfassungsperson) {
          results = [personName.metadata.erfassungsperson];
        }
      } else {
        // Für Experten/Admins: Alle Personen anzeigen
        const personenAgg = await collection.aggregate([
          { $match: { deleted: { $ne: true } } },
          { $group: { _id: '$metadata.erfassungsperson' } },
          { $match: { _id: { $ne: null } } },
          { $sort: { _id: 1 } }
        ]).toArray();
        
        results = personenAgg
          .map(item => item._id)
          .filter(Boolean) as string[];
      }
      break;
  }
  
  // Aktualisiere den Cache
  filterOptionsCache[type] = {
    data: results,
    timestamp: now
  };
  
  return results;
}

// Funktion zum Leeren des Caches
export function clearFilterOptionsCache(): void {
  Object.keys(filterOptionsCache).forEach(key => {
    delete filterOptionsCache[key as keyof FilterOptionsCache];
  });
}

export async function initializeHabitatTypes(): Promise<void> {
  const db = await connectToDatabase();
  const collection = db.collection('habitatTypes');

  // Indizes erstellen
  await createHabitatTypeIndexes();

  // Prüfe ob bereits Habitattypen existieren
  const count = await collection.countDocuments();
  if (count > 0) return;

  // Initial-Daten für Habitattypen
  const habitatTypes: Omit<HabitatType, '_id'>[] = [
    {
      name: 'Verlandungsbereich',
      description: 'Übergangsbereich zwischen Gewässer und Land',
      typicalSpecies: ['Typha latifolia (Breitblättriger Rohrkolben)', 'Iris pseudacorus (Gelbe Schwertlilie)', 'Lythrum salicaria (Blutweiderich)', 'Myosotis palustris (Sumpf-Vergissmeinnicht)']
    },
    {
      name: 'Schilf',
      description: 'Von Schilfrohr dominierte Flächen',
      typicalSpecies: ['Phragmites australis (Gemeines Schilfrohr)', 'Phalaris arundinacea (Rohrglanzgras)', 'Glyceria maxima (Wasserschwaden)']
    },
    {
      name: 'Röhricht',
      description: 'Von Röhrichtpflanzen dominierte Flächen',
      typicalSpecies: ['Typha angustifolia (Schmalblättriger Rohrkolben)', 'Schoenoplectus lacustris (Seebinse)', 'Bolboschoenus maritimus (Gewöhnliche Strandsimse)']
    },
    {
      name: 'Großsegge',
      description: 'Von großen Seggenarten dominierte Flächen',
      typicalSpecies: ['Carex elata (Steife Segge)', 'Carex acutiformis (Sumpf-Segge)', 'Carex riparia (Ufer-Segge)', 'Carex paniculata (Rispen-Segge)']
    },
    {
      name: 'Moor',
      description: 'Torfbildende Feuchtgebiete',
      typicalSpecies: ['Sphagnum sp. (Torfmoose)', 'Drosera rotundifolia (Rundblättriger Sonnentau)', 'Eriophorum vaginatum (Scheidiges Wollgras)', 'Vaccinium oxycoccos (Moosbeere)']
    },
    {
      name: 'Auwald',
      description: 'Periodisch überflutete Waldgesellschaften',
      typicalSpecies: ['Alnus incana (Grauerle)', 'Fraxinus excelsior (Gewöhnliche Esche)', 'Salix alba (Silber-Weide)', 'Populus nigra (Schwarz-Pappel)']
    },
    {
      name: 'Sumpfwald',
      description: 'Dauerhaft nasse Waldgesellschaften',
      typicalSpecies: ['Alnus glutinosa (Schwarzerle)', 'Salix cinerea (Grau-Weide)', 'Frangula alnus (Faulbaum)', 'Caltha palustris (Sumpfdotterblume)']
    },
    {
      name: 'Bruchwald',
      description: 'Waldgesellschaften auf nassem, nährstoffreichem Boden',
      typicalSpecies: ['Betula pubescens (Moor-Birke)', 'Carex elongata (Walzen-Segge)', 'Dryopteris carthusiana (Dorniger Wurmfarn)']
    },
    {
      name: 'Quellbereich',
      description: 'Austrittsstellen von Grundwasser',
      typicalSpecies: ['Cardamine amara (Bitteres Schaumkraut)', 'Chrysosplenium alternifolium (Wechselblättriges Milzkraut)', 'Veronica beccabunga (Bachbunge)']
    },
    {
      name: 'Naturnaher Bachlauf',
      description: 'Natürlich mäandrierende Fließgewässer',
      typicalSpecies: ['Petasites hybridus (Gewöhnliche Pestwurz)', 'Mentha aquatica (Wasserminze)', 'Nasturtium officinale (Brunnenkresse)']
    },
    {
      name: 'Wassergraben',
      description: 'Künstliche Wasserführungen',
      typicalSpecies: ['Berula erecta (Aufrechter Merk)', 'Veronica anagallis-aquatica (Gauchheil-Ehrenpreis)', 'Glyceria fluitans (Flutender Schwaden)']
    },
    {
      name: 'Trockenrasen',
      description: 'Niedrigwüchsige Rasengesellschaften auf trockenen Standorten',
      typicalSpecies: ['Bromus erectus (Aufrechte Trespe)', 'Festuca valesiaca (Walliser Schwingel)', 'Artemisia campestris (Feld-Beifuß)', 'Dianthus carthusianorum (Karthäuser-Nelke)']
    },
    {
      name: 'Felsensteppe',
      description: 'Steppenartige Vegetation auf felsigem Untergrund',
      typicalSpecies: ['Stipa pennata (Federgras)', 'Bothriochloa ischaemum (Bartgras)', 'Festuca rupicola (Felsen-Schwingel)', 'Astragalus onobrychis (Esparsetten-Tragant)', 'Achillea tomentosa (Filzige Schafgarbe)']
    },
    {
      name: 'Magerwiese',
      description: 'Extensiv genutzte Wiesen auf nährstoffarmen Standorten',
      typicalSpecies: ['Briza media (Zittergras)', 'Salvia pratensis (Wiesen-Salbei)', 'Anthyllis vulneraria (Wundklee)', 'Centaurea scabiosa (Skabiosen-Flockenblume)']
    },
    {
      name: 'Magerweide',
      description: 'Extensiv beweidete Flächen auf nährstoffarmen Standorten',
      typicalSpecies: ['Nardus stricta (Borstgras)', 'Thymus praecox (Früher Thymian)', 'Potentilla erecta (Blutwurz)', 'Carlina acaulis (Silberdistel)']
    },
    {
      name: 'Fettwiese',
      description: 'Intensiv genutzte Wiesen auf nährstoffreichen Standorten',
      typicalSpecies: ['Arrhenatherum elatius (Glatthafer)', 'Trifolium pratense (Rot-Klee)', 'Dactylis glomerata (Knaulgras)', 'Taraxacum officinale (Löwenzahn)']
    },
    {
      name: 'Fettweide',
      description: 'Intensiv beweidete Flächen auf nährstoffreichen Standorten',
      typicalSpecies: ['Lolium perenne (Deutsches Weidelgras)', 'Trifolium repens (Weiß-Klee)', 'Cynosurus cristatus (Kammgras)', 'Bellis perennis (Gänseblümchen)']
    },
    {
      name: 'Kunstrasen',
      description: 'Stark anthropogen beeinflusste Rasenflächen',
      typicalSpecies: ['Poa annua (Einjähriges Rispengras)', 'Plantago major (Breit-Wegerich)', 'Polygonum aviculare (Vogel-Knöterich)']
    },
    {
      name: 'Parkanlage',
      description: 'Gestaltete Grünflächen mit Gehölzen',
      typicalSpecies: ['Acer pseudoplatanus (Berg-Ahorn)', 'Tilia cordata (Winter-Linde)', 'Poa pratensis (Wiesen-Rispengras)', 'Hedera helix (Efeu)']
    },
    {
      name: 'Ruderalfläche',
      description: 'Gestörte Standorte mit spontaner Vegetation',
      typicalSpecies: ['Artemisia vulgaris (Gemeiner Beifuß)', 'Urtica dioica (Große Brennnessel)', 'Chenopodium album (Weißer Gänsefuß)', 'Cirsium arvense (Acker-Kratzdistel)']
    }
  ];

  await collection.insertMany(habitatTypes);
}

// Einfacher In-Memory-Cache für häufige Abfragen
let habitatTypesCache: {
  data: HabitatType[] | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

// Cache-Lebensdauer in Millisekunden (5 Minuten)
const CACHE_TTL = 5 * 60 * 1000;

export async function getAllHabitatTypes(): Promise<HabitatType[]> {
  try {
    // Cache-Check: Wenn Daten im Cache und nicht älter als CACHE_TTL
    const now = Date.now();
    if (habitatTypesCache.data && (now - habitatTypesCache.timestamp) < CACHE_TTL) {
      return habitatTypesCache.data;
    }
    
    const db = await connectToDatabase();
    const collection = db.collection<HabitatType>('habitatTypes');
    
    // Nutze den Index für name, um die Sortierung zu beschleunigen
    const habitatTypes = await collection.find({})
      .sort({ name: 1 })
      .toArray();
    
    // Aktualisiere den Cache
    habitatTypesCache = {
      data: habitatTypes,
      timestamp: now
    };
    
    // Logging nur im Development
    if (process.env.NODE_ENV === 'development') {
      console.log('Geladene Habitat-Typen:', {
        count: habitatTypes.length,
        types: habitatTypes.map(h => h.name),
        source: 'Datenbank'
      });
    }
    
    return habitatTypes;
  } catch (error) {
    console.error('Fehler beim Laden der Habitat-Typen:', error);
    throw error;
  }
}

export async function getHabitatTypeById(id: string): Promise<HabitatType | null> {
  const db = await connectToDatabase();
  const collection = db.collection<HabitatType>('habitatTypes');
  return collection.findOne({ _id: new ObjectId(id) });
}

/**
 * Setzt den Cache zurück, wenn Habitattypen geändert werden
 */
function invalidateCache(): void {
  habitatTypesCache.data = null;
}

export async function createHabitatType(habitatType: Omit<HabitatType, '_id'>): Promise<HabitatType> {
  const db = await connectToDatabase();
  const collection = db.collection<HabitatType>('habitatTypes');
  
  // Prüfe ob der Name bereits existiert
  const existing = await collection.findOne({ name: habitatType.name });
  if (existing) {
    throw new Error(`Habitattyp mit Namen "${habitatType.name}" existiert bereits`);
  }

  const result = await collection.insertOne(habitatType);
  
  // Cache zurücksetzen
  invalidateCache();
  
  return {
    _id: result.insertedId,
    ...habitatType
  };
}

export async function updateHabitatType(id: string, updates: Partial<Omit<HabitatType, '_id'>>): Promise<HabitatType | null> {
  const db = await connectToDatabase();
  const collection = db.collection<HabitatType>('habitatTypes');
  
  // Prüfe bei Namensänderung ob der neue Name bereits existiert
  if (updates.name) {
    const existing = await collection.findOne({ 
      name: updates.name,
      _id: { $ne: new ObjectId(id) }
    });
    if (existing) {
      throw new Error(`Habitattyp mit Namen "${updates.name}" existiert bereits`);
    }
  }

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updates },
    { returnDocument: 'after' }
  );

  // Cache zurücksetzen
  invalidateCache();
  
  return result;
}

export async function deleteHabitatType(id: string): Promise<boolean> {
  const db = await connectToDatabase();
  const collection = db.collection<HabitatType>('habitatTypes');
  
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  
  // Cache zurücksetzen
  invalidateCache();
  
  return result.deletedCount === 1;
}

export async function validateHabitatType(habitatName: string): Promise<boolean> {
  const db = await connectToDatabase();
  const collection = db.collection<HabitatType>('habitatTypes');
  const habitat = await collection.findOne({ name: habitatName });
  return habitat !== null;
}

export async function getHabitatTypeDescription(): Promise<string> {
  const habitatTypes = await getAllHabitatTypes();
  return habitatTypes
    .map(ht => `${ht.name}${ht.typicalSpecies.length > 0 ? `\n typischen Arten: ${ht.typicalSpecies.join(', ')}` : ''}`)
    .join('\n\n');
} 