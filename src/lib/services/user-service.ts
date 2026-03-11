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
  canInvite?: boolean; // Flag für Berechtigung, andere Benutzer einzuladen
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
  canInvite?: boolean;
  token: string;
  expiresAt: Date;
  used: boolean;
  usedAt?: Date;
  acceptedAt?: Date;
  reminder24hSentAt?: Date;
  reminder3dSentAt?: Date;
  lastSentAt?: Date;
  sendAttempts?: number;
  mailDeliveryStatus?: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'deferred' | 'blocked' | 'bounced' | 'spam' | 'unsub' | 'error';
  lastMailEvent?: string;
  lastMailEventAt?: Date;
  lastMailError?: string;
  revokedAt?: Date;
  archivedAt?: Date;
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
  canInvite?: boolean;
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
  canInvite?: boolean;
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
  canInvite?: boolean;
  token: string;
  expiresAt: Date;
}

interface PendingInvitationUpdateData {
  name: string;
  invitedBy: string;
  invitedByName: string;
  organizationId?: string;
  organizationName?: string;
  canInvite?: boolean;
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
   * Findet einen Benutzer anhand seiner ID
   */
  static async findById(id: string): Promise<IUser | null> {
    if (!ObjectId.isValid(id)) return null;
    const collection = await this.getUsersCollection();
    return collection.findOne({ _id: new ObjectId(id) });
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
   * Zählt die Anzahl der Administratoren
   */
  static async getAdminCount(): Promise<number> {
    const collection = await this.getUsersCollection();
    return collection.countDocuments({ 
      role: { $in: ['admin', 'superadmin'] } 
    });
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
      sendAttempts: 0,
      createdAt: new Date()
    };
    
    const result = await collection.insertOne(invitation);
    return { ...invitation, _id: result.insertedId };
  }

  /**
   * Findet eine Einladung anhand des Tokens
   * Nur aktive Einladungen sind gültig:
   * - nicht verwendet
   * - nicht widerrufen
   * - noch nicht abgelaufen
   */
  static async findInvitationByToken(token: string): Promise<IInvitation | null> {
    const db = await connectToDatabase();
    const collection = db.collection<IInvitation>('invitations');
    
    return collection.findOne({ 
      token,
      used: false,
      revokedAt: { $exists: false },
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
      { token, used: false },
      { 
        $set: { 
          used: true, 
          usedAt: new Date(),
          acceptedAt: new Date()
        } 
      }
    );
    
    return result.modifiedCount > 0;
  }

  /**
   * Markiert den erfolgreichen Versand einer Einladung/Erinnerung
   */
  static async markInvitationEmailSent(token: string): Promise<boolean> {
    const db = await connectToDatabase();
    const collection = db.collection<IInvitation>('invitations');

    const result = await collection.updateOne(
      { token },
      {
        $set: {
          lastSentAt: new Date(),
          mailDeliveryStatus: 'sent',
          lastMailEvent: 'sent',
          lastMailEventAt: new Date()
        },
        $inc: { sendAttempts: 1 }
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Markiert, dass eine Einladungserinnerung versendet wurde
   */
  static async markInvitationReminderSent(token: string, reminderType: '24h' | '3d'): Promise<boolean> {
    const db = await connectToDatabase();
    const collection = db.collection<IInvitation>('invitations');

    const reminderField = reminderType === '24h' ? 'reminder24hSentAt' : 'reminder3dSentAt';
    const result = await collection.updateOne(
      { token },
      { $set: { [reminderField]: new Date() } }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Gibt offene Einladungen zurück, die eine Erinnerung benötigen.
   */
  static async getInvitationsDueForReminder(reminderType: '24h' | '3d'): Promise<IInvitation[]> {
    const db = await connectToDatabase();
    const collection = db.collection<IInvitation>('invitations');

    const hours = reminderType === '24h' ? 24 : 72;
    const dueBefore = new Date(Date.now() - hours * 60 * 60 * 1000);
    const reminderField = reminderType === '24h' ? 'reminder24hSentAt' : 'reminder3dSentAt';

    return collection.find({
      used: false,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
      createdAt: { $lte: dueBefore },
      [reminderField]: { $exists: false }
    }).toArray();
  }

  /**
   * Findet die letzte offene Einladung einer E-Mail
   */
  static async findLatestPendingInvitationByEmail(email: string): Promise<IInvitation | null> {
    const db = await connectToDatabase();
    const collection = db.collection<IInvitation>('invitations');

    return collection.findOne(
      {
        email: email.toLowerCase().trim(),
        used: false,
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() }
      },
      { sort: { createdAt: -1 } }
    );
  }

  /**
   * Findet eine offene Einladung je operativer Einheit (E-Mail + Organisation)
   */
  static async findPendingInvitationByScope(email: string, organizationId?: string): Promise<IInvitation | null> {
    const db = await connectToDatabase();
    const collection = db.collection<IInvitation>('invitations');

    const baseQuery: Record<string, unknown> = {
      email: email.toLowerCase().trim(),
      used: false,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() }
    };

    if (organizationId) {
      baseQuery.organizationId = organizationId;
    } else {
      baseQuery.$or = [
        { organizationId: { $exists: false } },
        { organizationId: null },
        { organizationId: '' }
      ];
    }

    return collection.findOne(baseQuery, { sort: { createdAt: -1 } });
  }

  /**
   * Aktualisiert eine offene Einladung statt einen neuen Datensatz zu erzeugen
   */
  static async refreshPendingInvitation(id: string, data: PendingInvitationUpdateData): Promise<IInvitation | null> {
    if (!ObjectId.isValid(id)) return null;
    const db = await connectToDatabase();
    const collection = db.collection<IInvitation>('invitations');

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id), used: false, revokedAt: { $exists: false } },
      {
        $set: {
          name: data.name,
          invitedBy: data.invitedBy,
          invitedByName: data.invitedByName,
          organizationId: data.organizationId,
          organizationName: data.organizationName,
          canInvite: data.canInvite || false,
          token: data.token,
          expiresAt: data.expiresAt
        },
        $unset: {
          reminder24hSentAt: '',
          reminder3dSentAt: '',
          acceptedAt: '',
          usedAt: ''
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Holt alle Einladungen (neueste zuerst)
   */
  static async getAllInvitations(): Promise<IInvitation[]> {
    const db = await connectToDatabase();
    const collection = db.collection<IInvitation>('invitations');
    return collection.find({ archivedAt: { $exists: false } }).sort({ createdAt: -1 }).toArray();
  }

  /**
   * Findet eine Einladung anhand der ID
   */
  static async findInvitationById(id: string): Promise<IInvitation | null> {
    if (!ObjectId.isValid(id)) return null;
    const db = await connectToDatabase();
    const collection = db.collection<IInvitation>('invitations');
    return collection.findOne({ _id: new ObjectId(id) });
  }

  /**
   * Widerruft eine Einladung
   */
  static async revokeInvitation(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const db = await connectToDatabase();
    const collection = db.collection<IInvitation>('invitations');

    const result = await collection.updateOne(
      { _id: new ObjectId(id), used: false, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Archiviert eine Einladung (bleibt in der DB erhalten, wird aber nicht mehr gelistet)
   */
  static async archiveInvitation(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const db = await connectToDatabase();
    const collection = db.collection<IInvitation>('invitations');

    const result = await collection.updateOne(
      { _id: new ObjectId(id), archivedAt: { $exists: false } },
      { $set: { archivedAt: new Date() } }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Archiviert alle Einladungen einer operativen Einheit (E-Mail + Organisation)
   */
  static async archiveInvitationScope(email: string, organizationId?: string): Promise<number> {
    const db = await connectToDatabase();
    const collection = db.collection<IInvitation>('invitations');

    const normalizedEmail = email.toLowerCase().trim();
    const query: Record<string, unknown> = {
      email: normalizedEmail,
      archivedAt: { $exists: false }
    };

    if (organizationId) {
      query.organizationId = organizationId;
    } else {
      query.$or = [
        { organizationId: { $exists: false } },
        { organizationId: null },
        { organizationId: '' }
      ];
    }

    const result = await collection.updateMany(
      query,
      { $set: { archivedAt: new Date() } }
    );

    return result.modifiedCount;
  }

  /**
   * Verarbeitet Mailjet-Zustellereignisse für eine Einladung
   */
  static async applyInvitationMailEvent(
    token: string,
    event: string,
    eventTime: Date,
    errorMessage?: string
  ): Promise<boolean> {
    const db = await connectToDatabase();
    const collection = db.collection<IInvitation>('invitations');

    const eventToStatusMap: Record<string, IInvitation['mailDeliveryStatus']> = {
      sent: 'sent',
      delivered: 'delivered',
      open: 'opened',
      click: 'clicked',
      bounce: 'bounced',
      blocked: 'blocked',
      spam: 'spam',
      unsub: 'unsub',
      deferred: 'deferred'
    };
    const mappedStatus = eventToStatusMap[event] || 'error';
    const normalizedEvent = event === 'open' ? 'opened' : event === 'click' ? 'clicked' : event;

    const result = await collection.updateOne(
      { token },
      {
        $set: {
          mailDeliveryStatus: mappedStatus,
          lastMailEvent: normalizedEvent,
          lastMailEventAt: eventTime,
          ...(errorMessage ? { lastMailError: errorMessage } : {})
        }
      }
    );

    return result.modifiedCount > 0;
  }
} 