import { connectToDatabase } from '@/lib/services/db';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface IUser {
  _id?: string | ObjectId;
  email: string; // Primärer Identifier für alle Benutzeraktivitäten
  password?: string; // Für Auth.js - gehashtes Passwort
  name: string;
  role: 'user' | 'experte' | 'admin' | 'superadmin';
  image?: string;
  organizationId?: string;
  organizationName?: string;
  organizationLogo?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastAccess?: Date;
  consent_data_processing?: boolean;
  consent_image_ccby?: boolean;
  habitat_name_visibility?: 'public' | 'members' | null;
  // Felder für E-Mail-Verifizierung und Passwort-Reset
  emailVerified?: Date;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
}

export interface IInvitation {
  _id?: string | ObjectId;
  email: string;
  name: string;
  invitedBy: string;
  invitedByName: string;
  organizationId?: string;
  organizationName?: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  usedAt?: Date;
  createdAt: Date;
}

export interface CreateUserData {
  email: string;
  password?: string; // Optional - für Einladungen kann es automatisch generiert werden
  name: string;
  role?: 'user' | 'experte' | 'admin' | 'superadmin';
  organizationId?: string;
  organizationName?: string;
  organizationLogo?: string;
  consent_data_processing?: boolean;
  consent_image_ccby?: boolean;
  habitat_name_visibility?: 'public' | 'members' | null;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  password?: string;
  role?: 'user' | 'experte' | 'admin' | 'superadmin';
  image?: string;
  organizationId?: string;
  organizationName?: string;
  organizationLogo?: string;
  consent_data_processing?: boolean;
  consent_image_ccby?: boolean;
  habitat_name_visibility?: 'public' | 'members' | null;
}

export interface CreateInvitationData {
  email: string;
  name: string;
  invitedBy: string;
  invitedByName: string;
  organizationId?: string;
  organizationName?: string;
  token: string;
  expiresAt: Date;
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
    
    // Grundlegende Indizes für Einzelfelder
    await collection.createIndex({ email: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ role: 1 });
    await collection.createIndex({ organizationId: 1 });
    await collection.createIndex({ habitat_name_visibility: 1 });
    await collection.createIndex({ lastAccess: -1 });
    await collection.createIndex({ createdAt: -1 });
    
    // Verbundindizes für häufige Abfragen
    await collection.createIndex({ email: 1, role: 1 });
    await collection.createIndex({ organizationId: 1, role: 1 });
    await collection.createIndex({ organizationId: 1, habitat_name_visibility: 1 });
    
    // Für Namenssuche und Sortierung
    await collection.createIndex({ name: 1 });
    
    console.log('User-Indizes erfolgreich erstellt');
  }
  
  /**
   * Findet einen Benutzer anhand seiner E-Mail (primärer Identifier)
   */
  static async findByEmail(email: string): Promise<IUser | null> {
    const collection = await this.getUsersCollection();
    return collection.findOne({ email: email.toLowerCase().trim() });
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
   * Aktualisiert einen bestehenden Benutzer anhand seiner E-Mail
   */
  static async updateUser(email: string, userData: UpdateUserData): Promise<IUser | null> {
    const collection = await this.getUsersCollection();
    
    const updateData = {
      ...userData,
      updatedAt: new Date()
    };
    
    const result = await collection.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    return result;
  }
  
  /**
   * Aktualisiert das lastAccess-Datum eines Benutzers anhand seiner E-Mail
   */
  static async updateLastAccess(email: string): Promise<IUser | null> {
    const collection = await this.getUsersCollection();
    
    const result = await collection.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { $set: { lastAccess: new Date() } },
      { returnDocument: 'after' }
    );
    
    return result;
  }

  /**
   * Generiert ein sicheres 8-stelliges Passwort
   */
  static generateSecurePassword(): string {
    // Einfaches aber sicheres 8-stelliges Passwort
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Hasht ein Passwort mit bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12; // Sicher aber nicht zu langsam
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Erstellt einen neuen Benutzer mit gehashtem Passwort
   */
  static async createUserWithPassword(userData: CreateUserData): Promise<IUser> {
    const collection = await this.getUsersCollection();
    
    // Passwort hashen falls vorhanden, ansonsten generieren
    let hashedPassword: string;
    if (userData.password) {
      hashedPassword = await this.hashPassword(userData.password);
    } else {
      const tempPassword = this.generateSecurePassword();
      hashedPassword = await this.hashPassword(tempPassword);
    }
    
    const newUser: IUser = {
      ...userData,
      password: hashedPassword,
      role: userData.role || 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastAccess: new Date()
    };
    
    const result = await collection.insertOne(newUser as any);
    return { ...newUser, _id: result.insertedId };
  }

  /**
   * Setzt ein Passwort-Reset-Token
   */
  static async setPasswordResetToken(email: string): Promise<{ token: string; user: IUser } | null> {
    const collection = await this.getUsersCollection();
    
    const user = await collection.findOne({ email });
    if (!user) return null;
    
    // Token generieren (32 Zeichen hex)
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde
    
    const result = await collection.findOneAndUpdate(
      { email },
      { 
        $set: { 
          passwordResetToken: token,
          passwordResetExpires: expires,
          updatedAt: new Date()
        } 
      },
      { returnDocument: 'after' }
    );
    
    return result ? { token, user: result } : null;
  }

  /**
   * Validiert einen Passwort-Reset-Token (ohne ihn zu löschen)
   */
  static async validatePasswordResetToken(token: string): Promise<IUser | null> {
    const collection = await this.getUsersCollection();
    
    // Token prüfen und noch gültig?
    const user = await collection.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });
    
    return user;
  }

  /**
   * Setzt ein neues Passwort mit Reset-Token
   */
  static async resetPasswordWithToken(token: string, newPassword: string): Promise<IUser | null> {
    const collection = await this.getUsersCollection();
    
    // Token prüfen und noch gültig?
    const user = await collection.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });
    
    if (!user) return null;
    
    // Neues Passwort hashen
    const hashedPassword = await this.hashPassword(newPassword);
    
    // Passwort aktualisieren und Token entfernen
    const result = await collection.findOneAndUpdate(
      { _id: user._id },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        },
        $unset: {
          passwordResetToken: "",
          passwordResetExpires: ""
        }
      },
      { returnDocument: 'after' }
    );
    
    return result;
  }
  
  /**
   * Löscht einen Benutzer anhand seiner E-Mail
   */
  static async deleteUser(email: string): Promise<boolean> {
    const collection = await this.getUsersCollection();
    const result = await collection.deleteOne({ email: email.toLowerCase().trim() });
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
  static async isAdmin(email: string): Promise<boolean> {
    const collection = await this.getUsersCollection();
    // Projektion: Nur das role-Feld zurückgeben
    const user = await collection.findOne({ email: email.toLowerCase().trim() }, { projection: { role: 1, _id: 0 } });
    return user?.role === 'admin' || user?.role === 'superadmin';
  }
  
  /**
   * Prüft, ob ein Benutzer Experte ist
   */
  static async isExpert(email: string): Promise<boolean> {
    const collection = await this.getUsersCollection();
    // Projektion: Nur das role-Feld zurückgeben
    const user = await collection.findOne({ email: email.toLowerCase().trim() }, { projection: { role: 1, _id: 0 } });
    return user?.role === 'experte' || user?.role === 'admin' || user?.role === 'superadmin';
  }

  /**
   * Generiert einen sicheren Einladungs-Token
   */
  static generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Erstellt eine neue Einladung in der Datenbank
   */
  static async createInvitation(invitationData: CreateInvitationData): Promise<IInvitation> {
    const db = await connectToDatabase();
    const collection = db.collection<IInvitation>('invitations');
    
    const invitation: IInvitation = {
      ...invitationData,
      used: false,
      createdAt: new Date()
    };
    
    const result = await collection.insertOne(invitation);
    return { ...invitation, _id: result.insertedId };
  }

  /**
   * Findet eine Einladung anhand des Tokens
   */
  static async findInvitationByToken(token: string): Promise<IInvitation | null> {
    const db = await connectToDatabase();
    const collection = db.collection<IInvitation>('invitations');
    
    return collection.findOne({ 
      token, 
      used: false, 
      expiresAt: { $gt: new Date() } 
    });
  }

  /**
   * Markiert eine Einladung als verwendet
   */
  static async markInvitationAsUsed(token: string): Promise<boolean> {
    const db = await connectToDatabase();
    const collection = db.collection<IInvitation>('invitations');
    
    const result = await collection.updateOne(
      { token },
      { 
        $set: { 
          used: true, 
          usedAt: new Date() 
        } 
      }
    );
    
    return result.modifiedCount > 0;
  }
} 