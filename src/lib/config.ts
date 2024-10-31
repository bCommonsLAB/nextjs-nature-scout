interface Config {
    OPENAI_CHAT_MODEL: string;
    OPENAI_VISION_MODEL: string;
    OPENAI_TRANSCRIPTION_MODEL: string;
    OPENAI_API_KEY: string;
    STORAGE: {
        containerName: string;
        connectionString: string;
        uploadDir: string;
        type: string;
        baseUrl?: string;
    };
}

export const config: Config = {
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
            : ''
    }
};

// Validierung der Konfiguration
if (!config.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY ist nicht gesetzt');
}

if (!config.STORAGE.connectionString || 
     !config.STORAGE.containerName) {
    console.warn('Warnung: Azure Storage Konfiguration ist unvollständig');
} 