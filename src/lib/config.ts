interface Config {
    OPENAI_CHAT_MODEL: string;
    OPENAI_TRANSCRIPTION_MODEL: string;
    OPENAI_API_KEY: string;
}

export const config: Config = {
    OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL || '',
    OPENAI_TRANSCRIPTION_MODEL: process.env.OPENAI_TRANSCRIPTION_MODEL || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
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