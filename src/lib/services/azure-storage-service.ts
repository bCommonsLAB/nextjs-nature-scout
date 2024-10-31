import { BlobServiceClient } from '@azure/storage-blob';
import { config } from '../config';

export class AzureStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerName: string;
  private uploadDir: string;
  private baseUrl: string;

  constructor() {
    const { connectionString, containerName, uploadDir, baseUrl } = config.STORAGE;
    
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING ist nicht definiert');
    }

    this.containerName = containerName;
    this.uploadDir = uploadDir;
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.baseUrl = baseUrl || '';
  }

  async uploadImage(filename: string, buffer: Buffer): Promise<string> {
    const blobPath = `${this.uploadDir}/${filename}`;
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
    
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: { blobContentType: 'image/jpeg' }
    });
    
    return `${this.baseUrl}/${blobPath}`;
  }

  getImageUrl(filename: string): string {
    return `${this.baseUrl}/${this.uploadDir}/${filename}`;
  }
}
