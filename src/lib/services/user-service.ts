import { connectToDatabase } from '@/lib/services/db';
import { ObjectId } from 'mongodb';

export interface IUser {
  _id?: string | ObjectId;
  clerkId: string;
  email: string;
  name: string;
  role: 'user' | 'experte' | 'admin' | 'superadmin';
  image?: string;
  organizationId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastAccess?: Date;
  consent_data_processing?: boolean;
  consent_image_ccby?: boolean;
  habitat_name_visibility?: 'public' | 'members' | null;
}

export interface CreateUserData {
  clerkId: string;
  email: string;
  name: string;
  role?: 'user' | 'experte' | 'admin' | 'superadmin';
  organizationId?: string;
  consent_data_processing?: boolean;
  consent_image_ccby?: boolean;
  habitat_name_visibility?: 'public' | 'members' | null;
}

export interface UpdateUserData {
  clerkId?: string;
  email?: string;
  name?: string;
  role?: 'user' | 'experte' | 'admin' | 'superadmin';
  image?: string;
  organizationId?: string;
  consent_data_processing?: boolean;
  consent_image_ccby?: boolean;
  habitat_name_visibility?: 'public' | 'members' | null;
}

export class UserService {
  
  private static async getUsersCollection() {
    const db = await connectToDatabase();
    return db.collection<IUser>('users');
  }
  
  /**
   * Erstellt die benötigten Indizes für die users-Collection
   */
  static async createUserIndexes(): Promise<void> {
    const collection = await this.getUsersCollection();
    
    // Index auf clerkId für schnelle Benutzerabfragen
    await collection.createIndex({ clerkId: 1 }, { unique: true });
    
    // Index auf role für Filterung nach Benutzerrollen
    await collection.createIndex({ role: 1 });
    
    // Kombinierter Index für isAdmin/isExpert Abfragen
    await collection.createIndex({ clerkId: 1, role: 1 });
    
    // Index auf email für Suche nach E-Mail-Adressen
    await collection.createIndex({ email: 1 }, { unique: true, sparse: true });
    
    // Index auf organizationId für Filterung nach Organisationen
    await collection.createIndex({ organizationId: 1 });
    
    // Index auf lastAccess und createdAt für zeitbasierte Abfragen
    await collection.createIndex({ lastAccess: -1 });
    await collection.createIndex({ createdAt: -1 });
    
    console.log('User-Indizes erfolgreich erstellt');
  }
  
  /**
   * Findet einen Benutzer anhand seiner Clerk-ID
   */
  static async findByClerkId(clerkId: string): Promise<IUser | null> {
    const collection = await this.getUsersCollection();
    return collection.findOne({ clerkId });
  }
  
  /**
   * Findet einen Benutzer anhand seiner E-Mail-Adresse
   */
  static async findByEmail(email: string): Promise<IUser | null> {
    const collection = await this.getUsersCollection();
    return collection.findOne({ email });
  }
  
  /**
   * Erstellt einen neuen Benutzer in der Datenbank
   */
  static async createUser(userData: CreateUserData): Promise<IUser> {
    const collection = await this.getUsersCollection();
    
    const newUser: IUser = {
      ...userData,
      role: userData.role || 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastAccess: new Date()
    };
    
    const result = await collection.insertOne(newUser as any);
    return { ...newUser, _id: result.insertedId };
  }
  
  /**
   * Aktualisiert einen bestehenden Benutzer
   */
  static async updateUser(clerkId: string, userData: UpdateUserData): Promise<IUser | null> {
    const collection = await this.getUsersCollection();
    
    const updateData = {
      ...userData,
      updatedAt: new Date()
    };
    
    const result = await collection.findOneAndUpdate(
      { clerkId },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    return result;
  }
  
  /**
   * Aktualisiert das lastAccess-Datum eines Benutzers
   */
  static async updateLastAccess(clerkId: string): Promise<IUser | null> {
    const collection = await this.getUsersCollection();
    
    const result = await collection.findOneAndUpdate(
      { clerkId },
      { $set: { lastAccess: new Date() } },
      { returnDocument: 'after' }
    );
    
    return result;
  }
  
  /**
   * Löscht einen Benutzer
   */
  static async deleteUser(clerkId: string): Promise<boolean> {
    const collection = await this.getUsersCollection();
    const result = await collection.deleteOne({ clerkId });
    return result.deletedCount > 0;
  }
  
  /**
   * Holt alle Benutzer
   */
  static async getAllUsers(): Promise<IUser[]> {
    const collection = await this.getUsersCollection();
    return collection.find().sort({ createdAt: -1 }).toArray();
  }
  
  /**
   * Prüft, ob ein Benutzer Admin-Berechtigungen hat
   */
  static async isAdmin(clerkId: string): Promise<boolean> {
    const collection = await this.getUsersCollection();
    // Projektion: Nur das role-Feld zurückgeben
    const user = await collection.findOne({ clerkId }, { projection: { role: 1, _id: 0 } });
    return user?.role === 'admin' || user?.role === 'superadmin';
  }
  
  /**
   * Prüft, ob ein Benutzer Experte ist
   */
  static async isExpert(clerkId: string): Promise<boolean> {
    const collection = await this.getUsersCollection();
    // Projektion: Nur das role-Feld zurückgeben
    const user = await collection.findOne({ clerkId }, { projection: { role: 1, _id: 0 } });
    return user?.role === 'experte' || user?.role === 'admin' || user?.role === 'superadmin';
  }
} 