import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

interface AzureStorageConfig {
  connectionString: string;
  containerName: string;
}

export class AzureStorageService {
  private containerClient: ContainerClient;

  constructor(config: AzureStorageConfig) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
    this.containerClient = blobServiceClient.getContainerClient(config.containerName);
  }

  async uploadImage(filename: string, buffer: Buffer): Promise<string> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(filename);
    
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: this.getContentType(filename)
      }
    });

    return blockBlobClient.url;
  }

  async getImage(filename: string): Promise<Buffer | null> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(filename);
      const downloadResponse = await blockBlobClient.download(0);
      
      if (!downloadResponse.readableStreamBody) {
        return null;
      }

      // Stream in Buffer umwandeln
      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.from(chunk));
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Fehler beim Abrufen des Bildes:', error);
      return null;
    }
  }

  private getContentType(filename: string): string {
    return filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  }
} 