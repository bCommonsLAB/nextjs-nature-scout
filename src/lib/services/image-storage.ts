import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

interface AzureConfig {
  connectionString: string;
  containerName: string;
}

interface ImageStorageConfig {
  storageType: 'filesystem' | 'azure';
  uploadDir?: string;
  azureConfig?: AzureConfig;
}

export class ImageStorage {
  private static instance: ImageStorage;
  private containerClient?: ContainerClient;
  private config: ImageStorageConfig;

  private constructor(config: ImageStorageConfig) {
    this.config = {
      ...config,
      uploadDir: config.storageType === 'filesystem' 
        ? (config.uploadDir || join(process.cwd(), 'uploads'))
        : undefined
    };
    this.initStorage();
  }

  private async initStorage() {
    if (this.config.storageType === 'filesystem') {
      try {
        await mkdir(this.config.uploadDir!, { recursive: true });
      } catch (error) {
        console.error('Fehler beim Erstellen des Upload-Verzeichnisses:', error);
        throw error;
      }
    } else if (this.config.storageType === 'azure') {
      if (!this.config.azureConfig) {
        throw new Error('Azure Konfiguration fehlt');
      }
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        this.config.azureConfig.connectionString
      );
      this.containerClient = blobServiceClient.getContainerClient(
        this.config.azureConfig.containerName
      );
    }
  }

  public static getInstance(config: ImageStorageConfig): ImageStorage {
    if (!ImageStorage.instance) {
      ImageStorage.instance = new ImageStorage(config);
    }
    return ImageStorage.instance;
  }

  async saveImage(filename: string, buffer: Buffer): Promise<void> {
    if (this.config.storageType === 'filesystem') {
      const filepath = join(this.config.uploadDir!, filename);
      await writeFile(filepath, buffer);
    } else {
      if (!this.containerClient) {
        throw new Error('Azure Container Client nicht initialisiert');
      }
      const blockBlobClient = this.containerClient.getBlockBlobClient(filename);
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: this.getContentType(filename)
        }
      });
    }
  }

  async getImage(filename: string): Promise<Buffer | null> {
    try {
      if (this.config.storageType === 'filesystem') {
        const filepath = join(this.config.uploadDir!, filename);
        return await readFile(filepath);
      } else {
        if (!this.containerClient) {
          throw new Error('Azure Container Client nicht initialisiert');
        }
        const blockBlobClient = this.containerClient.getBlockBlobClient(filename);
        const downloadResponse = await blockBlobClient.download(0);
        
        if (!downloadResponse.readableStreamBody) {
          return null;
        }

        const chunks: Buffer[] = [];
        for await (const chunk of downloadResponse.readableStreamBody) {
          chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
      }
    } catch (error) {
      console.error('Fehler beim Lesen des Bildes:', error);
      return null;
    }
  }

  private getContentType(filename: string): string {
    return filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  }
} 