import { connectToDatabase } from '@/lib/services/db';
import { Organization } from '../models/organization';
import { ObjectId } from 'mongodb';

export interface IOrganization {
  _id?: string | ObjectId;
  name: string;
  logo?: string;
  address?: string;
  email?: string;
  description?: string;
  web?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class OrganizationService {
  // Collection-Helper
  private static async getOrganizationsCollection() {
    const db = await connectToDatabase();
    return db.collection<IOrganization>('organizations');
  }
  
  /**
   * Erstellt die benötigten Indizes für die organizations-Collection
   */
  static async createOrganizationIndexes(): Promise<void> {
    const collection = await this.getOrganizationsCollection();
    
    // Index auf name für schnellere Suche und Sortierung
    await collection.createIndex({ name: 1 });
    
    // Index auf email für Suche nach E-Mail-Adressen
    await collection.createIndex({ email: 1 }, { sparse: true });
    
    // Index auf createdAt für zeitbasierte Abfragen
    await collection.createIndex({ createdAt: -1 });
    
    console.log('Organization-Indizes erfolgreich erstellt');
  }
  
  // Alle Organisationen abrufen
  static async getAllOrganizations(): Promise<IOrganization[]> {
    const collection = await this.getOrganizationsCollection();
    return collection.find({}).sort({ name: 1 }).toArray();
  }

  // Eine bestimmte Organisation nach ID abrufen
  static async findById(id: string): Promise<IOrganization | null> {
    const collection = await this.getOrganizationsCollection();
    return collection.findOne({ _id: new ObjectId(id) as any });
  }

  // Organisation erstellen
  static async createOrganization(organizationData: IOrganization): Promise<IOrganization> {
    const collection = await this.getOrganizationsCollection();
    
    const newOrganization = {
      ...organizationData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await collection.insertOne(newOrganization as any);
    return { ...newOrganization, _id: result.insertedId };
  }

  // Organisation aktualisieren
  static async updateOrganization(id: string, updateData: Partial<IOrganization>): Promise<IOrganization | null> {
    const collection = await this.getOrganizationsCollection();
    
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) as any },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    
    return result;
  }

  // Organisation löschen
  static async deleteOrganization(id: string): Promise<boolean> {
    const collection = await this.getOrganizationsCollection();
    
    const result = await collection.deleteOne({ _id: new ObjectId(id) as any });
    return result.deletedCount > 0;
  }
} 