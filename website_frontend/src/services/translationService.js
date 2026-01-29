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

    /**
     * Get "Language changed" message in the target language
     */
    getLanguageChangeMessage(code) {
        const messages = {
            'en': 'Language changed to English. I will now respond in English.',
            'hi': 'भाषा बदलकर हिंदी हो गई है। अब मैं हिंदी में जवाब दूँगा।',
            'ta': 'மொழி தமிழுக்கு மாற்றப்பட்டது. இனி நான் தமிழில் பதிலளிப்பேன்.',
            'te': 'భాష తెలుగులోకి మార్చబడింది. ఇకపై నేను తెలుగులో సమాధానం ఇస్తాను.',
            'kn': 'ಭಾಷೆ ಕನ್ನಡಕ್ಕೆ ಬದಲಾಗಿದೆ. ಇನ್ನು ಮುಂದೆ ನಾನು ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸುತ್ತೇನೆ.',
            'ml': 'ഭാഷ മലയാളത്തിലേക്ക് മാറ്റി. ഇനി ഞാൻ മലയാളത്തിൽ മറുപടി നൽകും.',
            'bn': 'ভাষা পরিবর্তন করে বাংলা করা হয়েছে। এখন থেকে আমি বাংলায় উত্তর দেব।',
            'mr': 'भाषा मराठीत बदलली आहे. आता मी मराठीत उत्तर देईन.',
            'gu': 'ભાષા બદલીને ગુજરાતી કરવામાં આવી છે. હવે હું ગુજરાતીમાં જવાબ આપીશ.',
            'pa': 'ਭਾਸ਼ਾ ਬਦਲ ਕੇ ਪੰਜਾਬੀ ਹੋ ਗਈ ਹੈ। ਹੁਣ ਮੈਂ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦੇਵਾਂਗਾ।'
        };
        return messages[code] || messages['en'];
    }
}

// Export singleton instance
export default new TranslationService();
