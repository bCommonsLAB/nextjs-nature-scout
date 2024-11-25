import { connectToDatabase } from './db';
import { AnalysisJob, NatureScoutData } from '@/types/nature-scout';
import { ObjectId } from 'mongodb';

export async function createAnalysisJob(jobId: string, metadata: NatureScoutData, status: 'pending' | 'completed' | 'failed'): Promise<AnalysisJob> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('naturescoutJobs');

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
      const collection = db.collection('naturescoutJobs');

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
    const collection = db.collection('naturescoutJobs');

    const result = await collection.findOne({ jobId: jobId });
    return result as AnalysisJob | null;
  } catch (error) {
    console.error('Fehler bei der Verbindung zur Datenbank:', error);
    throw error;
  }
}
