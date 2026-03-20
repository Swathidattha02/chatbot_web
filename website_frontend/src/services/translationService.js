/**
 * Translation Service
 * Provides language support for the chatbot
 */

class TranslationService {
    constructor() {
        this.supportedLanguages = {
            'en': 'English',
            'hi': 'Hindi (हिंदी)',
            'te': 'Telugu (తెలుగు)'
        };
    }

    /**
     * Get supported languages
     */
    getSupportedLanguages() {
        return this.supportedLanguages;
    }

    /**
     * Get language name from code
     */
    getLanguageName(code) {
        return this.supportedLanguages[code] || 'English';
    }

    /**
     * Get "Language changed" message in the target language
     */
    getLanguageChangeMessage(code) {
        const messages = {
            'en': 'Language changed to English. I will now respond in English.',
            'hi': 'भाषा बदलकर हिंदी हो गई है। अब मैं हिंदी में जवाब दूँगा।',
            'te': 'భాష తెలుగులోకి మార్చబడింది. ఇకపై నేను తెలుగులో సమాధానం ఇస్తాను.'
        };
        return messages[code] || messages['en'];
    }

    /**
     * Translate text using local AI (llama3.2)
     */
    async translate(text, targetLang, onChunk = null) {
        if (targetLang === 'en' || !text) return text;
        
        try {
            console.log(`🌍 Translating to ${targetLang} via Backend (Stream: ${!!onChunk})...`);
            const targetName = this.supportedLanguages[targetLang] || targetLang;
            
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
            const response = await fetch(`${apiUrl}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    targetLang: targetLang,
                    targetName: targetName,
                    stream: !!onChunk
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || 'Backend translation failed');
            }

            if (onChunk) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullResult = "";

                let buffer = "";
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // Keep partial line for next chunk

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(trimmedLine.slice(6));
                                if (data.chunk) {
                                    fullResult += data.chunk;
                                    onChunk(data.chunk);
                                }
                                if (data.done) break;
                            } catch (e) {
                                // Silently skip partial/malformed JSON in buffer flow
                            }
                        }
                    }
                }
                return fullResult.trim();
            } else {
                const data = await response.json();
                return data.translatedText || text;
            }
        } catch (err) {
            console.error('❌ Translation Error:', err);
            return text; // Fallback to English
        }
    }

    /**
     * Simple script detection
     */
    detectLanguage(text) {
        if (/[\u0900-\u097F]/.test(text)) return 'hi';
        if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
        if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
        return 'en';
    }
}

// Export singleton instance
export default new TranslationService();
