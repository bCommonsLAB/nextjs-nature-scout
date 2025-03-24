import { connectToDatabase } from './db';
import { ObjectId } from 'mongodb';

export interface HabitatType {
  _id?: ObjectId;
  name: string;
  description: string;
  typicalSpecies: string[];
  habitatFamilie?: string;
  schutzstatus?: string;
}

export async function initializeHabitatTypes(): Promise<void> {
  const db = await connectToDatabase();
  const collection = db.collection('habitatTypes');

  // Prüfe ob bereits Habitattypen existieren
  const count = await collection.countDocuments();
  if (count > 0) return;

  // Initial-Daten für Habitattypen
  const habitatTypes: HabitatType[] = [
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

export async function getAllHabitatTypes(): Promise<HabitatType[]> {
  const db = await connectToDatabase();
  const collection = db.collection<HabitatType>('habitatTypes');
  return collection.find().toArray();
}

export async function getHabitatTypeById(id: string): Promise<HabitatType | null> {
  const db = await connectToDatabase();
  const collection = db.collection<HabitatType>('habitatTypes');
  return collection.findOne({ _id: new ObjectId(id) });
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

  return result;
}

export async function deleteHabitatType(id: string): Promise<boolean> {
  const db = await connectToDatabase();
  const collection = db.collection<HabitatType>('habitatTypes');
  
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export async function validateHabitatType(habitatName: string): Promise<boolean> {
  const db = await connectToDatabase();
  const collection = db.collection('habitatTypes');
  const count = await collection.countDocuments({ name: habitatName });
  return count > 0;
}

export async function getHabitatTypeDescription(): Promise<string> {
  const habitatTypes = await getAllHabitatTypes();
  return habitatTypes.map(ht => 
    `'${ht.name}': mit typischen Arten wie ${ht.typicalSpecies.join(', ')}`
  ).join('\n');
} 