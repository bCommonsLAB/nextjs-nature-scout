"use client";

import { useState } from 'react';
import { BlobServiceClient } from '@azure/storage-blob';

export function ImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      setProgress(0);

      // 1. Get SAS URL for upload
      const filename = `${Date.now()}-${file.name}`;
      const sasResponse = await fetch(`/api/storage-sas?filename=${encodeURIComponent(filename)}&operation=write`);
      const { sasUrl } = await sasResponse.json();

      // 2. Upload directly to Blob Storage
      const blockBlobClient = new BlobServiceClient(sasUrl)
        .getContainerClient('')
        .getBlockBlobClient('');

      await blockBlobClient.uploadData(file, {
        blobHTTPHeaders: { blobContentType: file.type },
        onProgress: (progress) => {
          setProgress(Math.round((progress.loadedBytes / file.size) * 100));
        },
      });

      return filename;
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            await uploadFile(file);
          }
        }}
      />
      {isUploading && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded">
            <div 
              className="bg-blue-600 h-2 rounded" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Upload: {progress}%
          </p>
        </div>
      )}
    </div>
  );
} 