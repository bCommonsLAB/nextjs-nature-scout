import { connectToDatabase } from './db';
import { AnalysisJob, NatureScoutData } from '@/types/nature-scout';
import { ObjectId } from 'mongodb';

export async function createAnalysisJob(jobId: string, metadata: NatureScoutData, status: AnalysisJob['status']): Promise<AnalysisJob> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');

    const jobData: AnalysisJob = {
      _id: new ObjectId(),
      jobId: jobId,
      status: status,
      metadata,
      startTime: new Date(),
      updatedAt: new Date()
    };

    await collection.insertOne(jobData);
    return jobData;
  } catch (error) {
    console.error('Fehler bei der Verbindung zur Datenbank:', error);
    throw error;
  }
}

export async function updateAnalysisJob(
  jobId: string, 
  update: Partial<AnalysisJob>
): Promise<AnalysisJob | null> {
    
  try {

      const db = await connectToDatabase();
      const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');

      const job = await collection.findOne({ jobId: jobId });
      if (!job) return null;

      const updatedJob = {
          ...(job as AnalysisJob),
          ...update,
          updatedAt: new Date()
      };
      
      await collection.updateOne({ jobId: jobId }, { $set: updatedJob });
      return updatedJob;
    } catch (error) {
      console.error('Fehler bei der Verbindung zur Datenbank:', error);
      throw error;
    }
}

export async function getAnalysisJob(jobId: string): Promise<AnalysisJob | null> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');

    const result = await collection.findOne({ jobId: jobId });
    return result as AnalysisJob | null;
  } catch (error) {
    console.error('Fehler bei der Verbindung zur Datenbank:', error);
    throw error;
  }
}

/**
 * Legt einen Entwurf (`status: 'draft'`) mit (Teil-)Metadaten an.
 *
 * Für die ausfallsichere/offline-fähige Erfassung (Session 1.2). Entwürfe halten bewusst
 * nur Teil-Metadaten (`Partial<NatureScoutData>`), die je Erfassungsschritt ergänzt werden.
 * Eigentum/Organisation werden vom Aufrufer (API-Route) aus dem angemeldeten Benutzer gesetzt.
 * Siehe specs/regeln/offline-erfassung-und-sync.md.
 */
export async function createDraftJob(jobId: string, metadata: Partial<NatureScoutData>): Promise<AnalysisJob> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');

    const now = new Date();
    const jobData = {
      _id: new ObjectId(),
      jobId,
      status: 'draft' as const,
      metadata,
      startTime: now,
      updatedAt: now
    };

    await collection.insertOne(jobData);
    // Entwürfe halten Teil-Metadaten; der vollständige AnalysisJob-Typ wird erst beim Abschluss erfüllt.
    return jobData as unknown as AnalysisJob;
  } catch (error) {
    console.error('Fehler beim Anlegen des Entwurfs:', error);
    throw error;
  }
}

/**
 * Mergt Teil-Metadaten in einen bestehenden Entwurf (idempotent, je Schritt aufrufbar).
 *
 * Flacher Merge auf oberster Metadaten-Ebene: gesetzte Felder werden ersetzt, nicht übergebene
 * bleiben erhalten (verschachtelte Objekte wie `kataster` werden als Ganzes ersetzt). Status und
 * Eigentum bleiben unverändert; Berechtigungs-/Status-Prüfung erfolgt in der API-Route.
 */
export async function updateDraftMetadata(jobId: string, partialMetadata: Partial<NatureScoutData>): Promise<AnalysisJob | null> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');

    const job = await collection.findOne({ jobId });
    if (!job) return null;

    const mergedMetadata = { ...(job.metadata || {}), ...partialMetadata };
    const updatedAt = new Date();

    await collection.updateOne(
      { jobId },
      { $set: { metadata: mergedMetadata, updatedAt } }
    );

    return { ...(job as AnalysisJob), metadata: mergedMetadata as NatureScoutData, updatedAt };
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Entwurfs:', error);
    throw error;
  }
}
