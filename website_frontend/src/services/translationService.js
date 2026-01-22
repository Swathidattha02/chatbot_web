/**
 * Translation Service
 * Provides language support for the chatbot
 */

class TranslationService {
    constructor() {
        this.supportedLanguages = {
            'en': 'English',
            'hi': 'Hindi (हिंदी)',
            'ta': 'Tamil (தமிழ்)',
            'te': 'Telugu (తెలుగు)',
            'kn': 'Kannada (ಕನ್ನಡ)',
            'ml': 'Malayalam (മലയാളം)',
            'bn': 'Bengali (বাংলা)',
            'mr': 'Marathi (मराठी)',
            'gu': 'Gujarati (ગુજરાતી)',
            'pa': 'Punjabi (ਪੰਜਾਬੀ)'
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
}

// Export singleton instance
export default new TranslationService();
