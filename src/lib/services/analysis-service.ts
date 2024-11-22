import { connectToDatabase } from './db';
import { AnalysisJob, NatureScoutData } from '@/types/nature-scout';
import { ObjectId } from 'mongodb';

export async function createAnalysisJob(jobId: string, metadata: NatureScoutData, status: 'pending' | 'completed' | 'failed'): Promise<AnalysisJob> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection(process.env.MONGODB_COLLECTION_NAME || 'analyseJobs');

    const jobData: AnalysisJob = {
      _id: new ObjectId(jobId),
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

      const job = await collection.findOne({ _id: new ObjectId(jobId) });
      if (!job) return null;

      const updatedJob = {
          ...(job as AnalysisJob),
          ...update,
          updatedAt: new Date()
      };
      
      await collection.updateOne({ _id: new ObjectId(jobId) }, { $set: updatedJob });
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

    const result = await collection.findOne({ _id: new ObjectId(jobId) });
    return result as AnalysisJob | null;
  } catch (error) {
    console.error('Fehler bei der Verbindung zur Datenbank:', error);
    throw error;
  }
}
