interface Config {
    OPENAI_CHAT_MODEL: string;
    OPENAI_TRANSCRIPTION_MODEL: string;
    OPENAI_API_KEY: string;
    STORAGE: {
        type: 'filesystem' | 'azure';
        uploadDir: string;
        azure?: {
            connectionString: string;
            containerName: string;
        };
    };
}

export const config: Config = {
    OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL || '',
    OPENAI_TRANSCRIPTION_MODEL: process.env.OPENAI_TRANSCRIPTION_MODEL || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    STORAGE: {
        type: (process.env.STORAGE_TYPE as 'filesystem' | 'azure') || 'filesystem',
        uploadDir: process.env.UPLOAD_DIR || 'uploads',
        azure: process.env.STORAGE_TYPE === 'azure' ? {
            connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
            containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'images',
        } : undefined,
    }
};

// Validierung der Konfiguration
Object.entries(config).forEach(([key, value]) => {
    if (!value) {
        console.warn(`Warnung: ${key} ist nicht gesetzt`);
    }
});

if (!config.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY ist nicht gesetzt');
}

if (config.STORAGE.type === 'azure' && !config.STORAGE.azure?.connectionString) {
    console.warn('Warnung: Azure Storage Connection String ist nicht gesetzt');
} 