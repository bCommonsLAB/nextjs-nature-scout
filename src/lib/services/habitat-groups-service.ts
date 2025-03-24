import { connectToDatabase } from './db';
import { ObjectId } from 'mongodb';

export interface HabitatGroup {
  _id?: ObjectId;
  name: string;
  description: string;
  imageUrl: string;
  pos: number;
}

export async function initializeHabitatGroups(): Promise<void> {
  const db = await connectToDatabase();
  const collection = db.collection('habitatGroups');

  // Prüfe ob bereits Gruppen existieren
  const count = await collection.countDocuments();
  if (count > 0) return;

  // Initial-Daten für Habitat-Gruppen
  const habitatGroups: HabitatGroup[] = [
    {
      name: 'Wälder',
      description: 'Verschiedene Waldtypen und -formen',
      imageUrl: '/images/habitat/wald.jpg',
      pos: 1
    },
    {
      name: 'Gewässer',
      description: 'Seen, Flüsse, Bäche und andere Wasserlebensräume',
      imageUrl: '/images/habitat/gewaesser.jpg',
      pos: 2
    },
    {
      name: 'Wiesen und Weiden',
      description: 'Offene Grünlandschaften',
      imageUrl: '/images/habitat/wiese.jpg',
      pos: 3
    },
    {
      name: 'Sonderbiotope',
      description: 'Spezielle Lebensräume wie Moore, Felsen, etc.',
      imageUrl: '/images/habitat/moor.jpg',
      pos: 4
    }
  ];

  await collection.insertMany(habitatGroups);
}

export async function getAllHabitatGroups(): Promise<HabitatGroup[]> {
  const db = await connectToDatabase();
  const collection = db.collection<HabitatGroup>('habitatGroups');
  return collection.find().sort({ pos: 1 }).toArray();
}

export async function getHabitatGroupById(id: string): Promise<HabitatGroup | null> {
  const db = await connectToDatabase();
  const collection = db.collection<HabitatGroup>('habitatGroups');
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function createHabitatGroup(habitatGroup: Omit<HabitatGroup, '_id'>): Promise<HabitatGroup> {
  const db = await connectToDatabase();
  const collection = db.collection<HabitatGroup>('habitatGroups');
  
  // Prüfe ob der Name bereits existiert
  const existing = await collection.findOne({ name: habitatGroup.name });
  if (existing) {
    throw new Error(`Habitat-Familie mit Namen "${habitatGroup.name}" existiert bereits`);
  }

  const result = await collection.insertOne(habitatGroup);
  return {
    _id: result.insertedId,
    ...habitatGroup
  };
}

export async function updateHabitatGroup(id: string, updates: Partial<Omit<HabitatGroup, '_id'>>): Promise<HabitatGroup | null> {
  const db = await connectToDatabase();
  const collection = db.collection<HabitatGroup>('habitatGroups');
  
  // Prüfe bei Namensänderung ob der neue Name bereits existiert
  if (updates.name) {
    const existing = await collection.findOne({ 
      name: updates.name,
      _id: { $ne: new ObjectId(id) }
    });
    if (existing) {
      throw new Error(`Habitat-Familie mit Namen "${updates.name}" existiert bereits`);
    }
  }

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updates },
    { returnDocument: 'after' }
  );

  return result;
}

export async function deleteHabitatGroup(id: string): Promise<boolean> {
  const db = await connectToDatabase();
  const collection = db.collection<HabitatGroup>('habitatGroups');
  
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
} 