import { connectToDatabase } from '@/lib/services/db';
import { ObjectId } from 'mongodb';
import { MailjetService } from './mailjet-service';

export interface ILoginCode {
  _id?: string | ObjectId;
  email: string;
  code: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  usedAt?: Date;
}

export interface CreateLoginCodeData {
  email: string;
  code: string;
}

export class LoginCodeService {
  
  private static async getLoginCodesCollection() {
    const db = await connectToDatabase();
    return db.collection<ILoginCode>('loginCodes');
  }
  
  /**
   * Erstellt die benötigten Indizes für die loginCodes-Collection
   */
  static async createLoginCodeIndexes(): Promise<void> {
    const collection = await this.getLoginCodesCollection();
    
    // Grundlegende Indizes
    await collection.createIndex({ email: 1 });
    await collection.createIndex({ code: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ expiresAt: 1 });
    await collection.createIndex({ used: 1 });
    await collection.createIndex({ createdAt: -1 });
    
    // Verbundindizes für häufige Abfragen
    await collection.createIndex({ email: 1, used: 1 });
    await collection.createIndex({ email: 1, expiresAt: 1 });
    await collection.createIndex({ code: 1, used: 1 });
    
    // TTL-Index für automatisches Löschen abgelaufener Codes
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    
    console.log('LoginCode-Indizes erfolgreich erstellt');
  }
  
  /**
   * Generiert einen 6-stelligen numerischen Code
   */
  static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  /**
   * Erstellt einen neuen Login-Code
   */
  static async createLoginCode(email: string): Promise<{ code: string; expiresAt: Date }> {
    const collection = await this.getLoginCodesCollection();
    
    // Generiere einen eindeutigen Code
    let code: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      code = this.generateCode();
      
      // Prüfe, ob der Code bereits existiert
      const existingCode = await collection.findOne({ code });
      if (!existingCode) {
        isUnique = true;
      } else {
        attempts++;
      }
    }
    
    if (!isUnique) {
      throw new Error('Konnte keinen eindeutigen Code generieren');
    }
    
    // Setze Ablaufzeit (15 Minuten)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    // Erstelle den Login-Code
    const loginCode: ILoginCode = {
      email: email.toLowerCase().trim(),
      code: code!,
      expiresAt,
      used: false,
      createdAt: new Date()
    };
    
    await collection.insertOne(loginCode as any);
    
    return { code: code!, expiresAt };
  }
  
  /**
   * Validiert einen Login-Code
   */
  static async validateCode(email: string, code: string): Promise<boolean> {
    const collection = await this.getLoginCodesCollection();
    
    const loginCode = await collection.findOne({
      email: email.toLowerCase().trim(),
      code,
      used: false,
      expiresAt: { $gt: new Date() }
    });
    
    return !!loginCode;
  }
  
  /**
   * Markiert einen Login-Code als verwendet
   */
  static async markCodeAsUsed(email: string, code: string): Promise<void> {
    const collection = await this.getLoginCodesCollection();
    
    await collection.updateOne(
      {
        email: email.toLowerCase().trim(),
        code,
        used: false
      },
      {
        $set: {
          used: true,
          usedAt: new Date()
        }
      }
    );
  }
  
  /**
   * Löscht alle abgelaufenen oder verwendeten Codes für eine E-Mail
   */
  static async cleanupOldCodes(email: string): Promise<void> {
    const collection = await this.getLoginCodesCollection();
    
    await collection.deleteMany({
      email: email.toLowerCase().trim(),
      $or: [
        { used: true },
        { expiresAt: { $lt: new Date() } }
      ]
    });
  }
  
  /**
   * Sendet einen Login-Code per E-Mail
   */
  static async sendLoginCodeEmail(email: string, code: string, userName: string): Promise<boolean> {
    try {
      // Erstelle ein E-Mail-Template für Login-Codes
      const emailData = {
        to: email,
        name: userName,
        subject: 'Ihr Anmelde-Code für NatureScout',
        code: code
      };
      
      // Verwende den bestehenden MailjetService mit einem neuen Template
      return await MailjetService.sendLoginCodeEmail(emailData);
    } catch (error) {
      console.error('Fehler beim Senden der Login-Code-E-Mail:', error);
      return false;
    }
  }
  
  /**
   * Prüft, ob zu viele Code-Anfragen in kurzer Zeit gemacht wurden (Rate Limiting)
   */
  static async checkRateLimit(email: string): Promise<boolean> {
    const collection = await this.getLoginCodesCollection();
    
    // Prüfe, ob in den letzten 5 Minuten bereits ein Code angefordert wurde
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const recentCodes = await collection.countDocuments({
      email: email.toLowerCase().trim(),
      createdAt: { $gt: fiveMinutesAgo }
    });
    
    // Maximal 3 Codes in 5 Minuten erlauben
    return recentCodes < 3;
  }
} 