// Public (client-side) Konfiguration
export const publicConfig = {
    imageSettings: {
        maxWidth: Number(process.env.NEXT_PUBLIC_MAX_IMAGE_WIDTH) || 2000,
        maxHeight: Number(process.env.NEXT_PUBLIC_MAX_IMAGE_HEIGHT) || 2000,
        quality: Number(process.env.NEXT_PUBLIC_MAX_IMAGE_QUALITY) || 0.8
    }
};

// Private (server-side) Konfiguration
export const serverConfig = {
    OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL || '',
    OPENAI_VISION_MODEL: process.env.OPENAI_VISION_MODEL || '',
    OPENAI_TRANSCRIPTION_MODEL: process.env.OPENAI_TRANSCRIPTION_MODEL || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    STORAGE: {
        containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || '',
        connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
        uploadDir: process.env.UPLOAD_DIR || 'naturescout',
        type: 'azure',
        baseUrl: process.env.AZURE_STORAGE_CONNECTION_STRING 
            ? `https://${process.env.AZURE_STORAGE_CONNECTION_STRING.match(/AccountName=([^;]+)/)?.[1]}.blob.core.windows.net/${process.env.AZURE_STORAGE_CONTAINER_NAME}`
            : '',
    }
};

// Validierung nur auf Server-Seite
if (typeof window === 'undefined') {
    if (!serverConfig.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY ist nicht gesetzt');
    }

    if (!serverConfig.STORAGE.connectionString || 
         !serverConfig.STORAGE.containerName) {
        console.warn('Warnung: Azure Storage Konfiguration ist unvollständig');
    } 

    if(!process.env.NEXT_PUBLIC_MAX_IMAGE_WIDTH) {
        console.warn('Warnung: NEXT_PUBLIC_MAX_IMAGE_WIDTH ist nicht gesetzt');
    }
    else {
        console.log('NEXT_PUBLIC_MAX_IMAGE_WIDTH ist gesetzt:', process.env.NEXT_PUBLIC_MAX_IMAGE_WIDTH);
    }
} 