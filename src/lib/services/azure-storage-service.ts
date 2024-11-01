import { BlobServiceClient } from '@azure/storage-blob';
import { serverConfig } from '../config';

export class AzureStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient;
  private uploadDir: string;
  private baseUrl: string;

  constructor() {
    if (!serverConfig.STORAGE.connectionString) {
      throw new Error('Azure Storage connection string ist nicht konfiguriert');
    }

    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      serverConfig.STORAGE.connectionString
    );
    
    this.containerClient = this.blobServiceClient.getContainerClient(
      serverConfig.STORAGE.containerName
    );
    
    this.uploadDir = serverConfig.STORAGE.uploadDir;
    this.baseUrl = serverConfig.STORAGE.baseUrl || '';
  }

  async uploadImage(filename: string, buffer: Buffer): Promise<string> {
    const blobPath = `${this.uploadDir}/${filename}`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath);
    
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: { blobContentType: 'image/jpeg' }
    });
    
    return `${this.baseUrl}/${blobPath}`;
  }

  getImageUrl(filename: string): string {
    return `${this.baseUrl}/${this.uploadDir}/${filename}`;
  }
}
