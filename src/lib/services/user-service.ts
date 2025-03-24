import { connectToDatabase } from '@/lib/services/db';
import { ObjectId } from 'mongodb';

export interface IUser {
  _id?: string | ObjectId;
  clerkId: string;
  email: string;
  name: string;
  role: 'user' | 'experte' | 'admin' | 'superadmin';
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateUserData {
  clerkId: string;
  email: string;
  name: string;
  role?: 'user' | 'experte' | 'admin' | 'superadmin';
}

export interface UpdateUserData {
  clerkId?: string;
  email?: string;
  name?: string;
  role?: 'user' | 'experte' | 'admin' | 'superadmin';
  image?: string;
}

export class UserService {
  
  private static async getUsersCollection() {
    const db = await connectToDatabase();
    return db.collection<IUser>('users');
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
      updatedAt: new Date()
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
    const user = await this.findByClerkId(clerkId);
    return user?.role === 'admin' || user?.role === 'superadmin';
  }
  
  /**
   * Prüft, ob ein Benutzer Experte ist
   */
  static async isExpert(clerkId: string): Promise<boolean> {
    const user = await this.findByClerkId(clerkId);
    return user?.role === 'experte';
  }
  
  /**
   * Prüft, ob ein Benutzer erweiterte Rechte hat (Experte oder Admin)
   */
  static async hasAdvancedPermissions(clerkId: string): Promise<boolean> {
    const user = await this.findByClerkId(clerkId);
    return user?.role === 'experte' || user?.role === 'admin' || user?.role === 'superadmin';
  }
} 