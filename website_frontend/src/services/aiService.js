/**
 * AI Service for handling chat responses
 * Connects to the backend API which integrates with Ollama/LLM
 */

class AIService {
    constructor() {
        this.conversationHistory = [];
    }

    /**
     * Get response from backend AI service
     * @param {string} userMessage - The user's message
     * @param {string} language - Language code (en, hi, ta, etc.)
     * @param {function} onChunk - Optional callback for streaming chunks
     */
    async getResponse(userMessage, language = 'en', onChunk = null) {
        try {
            // For now, return a simple response structure
            // The backend will handle the actual AI integration
            return {
                message: userMessage, // This will be replaced by backend response
                expression: 'neutral',
                language: language
            };
        } catch (error) {
            console.error('Error getting AI response:', error);
            throw error;
        }
    }

    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
    }

    /**
     * Get conversation history
     */
    getHistory() {
        return this.conversationHistory;
    }
}

// Export singleton instance
export default new AIService();
