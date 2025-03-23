import { connectToDatabase } from '@/lib/db/mongodb';
import { User, IUser } from '@/lib/db/models/user';

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
  
  /**
   * Findet einen Benutzer anhand seiner Clerk-ID
   */
  static async findByClerkId(clerkId: string): Promise<IUser | null> {
    await connectToDatabase();
    const user = await (User.findOne({ clerkId }) as any).exec();
    return user;
  }
  
  /**
   * Findet einen Benutzer anhand seiner E-Mail-Adresse
   */
  static async findByEmail(email: string): Promise<IUser | null> {
    await connectToDatabase();
    const user = await (User.findOne({ email }) as any).exec();
    return user;
  }
  
  /**
   * Erstellt einen neuen Benutzer in der Datenbank
   */
  static async createUser(userData: CreateUserData): Promise<IUser> {
    await connectToDatabase();
    const user = new User(userData);
    await user.save();
    return user;
  }
  
  /**
   * Aktualisiert einen bestehenden Benutzer
   */
  static async updateUser(clerkId: string, userData: UpdateUserData): Promise<IUser | null> {
    await connectToDatabase();
    const updatedUser = await (User.findOneAndUpdate(
      { clerkId },
      { $set: userData },
      { new: true }
    ) as any).exec();
    return updatedUser;
  }
  
  /**
   * Löscht einen Benutzer
   */
  static async deleteUser(clerkId: string): Promise<boolean> {
    await connectToDatabase();
    const result = await (User.deleteOne({ clerkId }) as any).exec();
    return result.deletedCount > 0;
  }
  
  /**
   * Holt alle Benutzer
   */
  static async getAllUsers(): Promise<IUser[]> {
    await connectToDatabase();
    const users = await (User.find().sort({ createdAt: -1 }) as any).exec();
    return users;
  }
  
  /**
   * Prüft, ob ein Benutzer Admin-Berechtigungen hat
   */
  static async isAdmin(clerkId: string): Promise<boolean> {
    await connectToDatabase();
    const user = await (User.findOne({ clerkId }) as any).exec();
    return user?.role === 'admin' || user?.role === 'superadmin';
  }
  
  /**
   * Prüft, ob ein Benutzer Experte ist
   */
  static async isExpert(clerkId: string): Promise<boolean> {
    await connectToDatabase();
    const user = await (User.findOne({ clerkId }) as any).exec();
    return user?.role === 'experte';
  }
  
  /**
   * Prüft, ob ein Benutzer erweiterte Rechte hat (Experte oder Admin)
   */
  static async hasAdvancedPermissions(clerkId: string): Promise<boolean> {
    await connectToDatabase();
    const user = await (User.findOne({ clerkId }) as any).exec();
    return user?.role === 'experte' || user?.role === 'admin' || user?.role === 'superadmin';
  }
} 