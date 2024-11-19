import type { NextApiRequest, NextApiResponse } from 'next';
import { LocationMetadata } from "@/types/nature-scout";

// Angenommen, Sie verwenden Azure Blob Storage, importieren Sie das notwendige SDK
// import { BlobServiceClient } from '@azure/storage-blob';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const metadata: LocationMetadata = req.body;

      // Konvertieren Sie die Metadaten in einen String
      const json = JSON.stringify(metadata);

      // Hier kommt die Logik zum Speichern des JSON in Ihrem Blob-Speicher
      // Zum Beispiel mit Azure Blob Storage:
      // const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
      // const containerClient = blobServiceClient.getContainerClient('your-container-name');
      // const blockBlobClient = containerClient.getBlockBlobClient('metadata.json');
      // await blockBlobClient.upload(json, json.length);

      // Senden Sie eine Erfolgsmeldung zurück
      res.status(200).json({ message: 'Metadaten wurden erfolgreich gespeichert.' });
    } catch (error) {
      // Senden Sie eine Fehlermeldung zurück
      res.status(500).json({ message: 'Fehler beim Speichern der Metadaten.', error });
    }
  } else {
    // Methode nicht erlaubt
    res.setHeader('Allow', 'POST');
    res.status(405).end('Methode nicht erlaubt');
  }
}