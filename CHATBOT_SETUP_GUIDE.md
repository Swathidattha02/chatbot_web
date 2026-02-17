# AI Avatar Chatbot - Setup Guide

## Overview
The chatbot has been updated to match the AI_Avatar layout with the following features:
- ✅ **Voice Input** - Click the microphone button to speak your questions
- ✅ **Multi-language Support** - Support for 10+ Indian languages
- ✅ **AI-Powered Responses** - Integrated with Ollama (llama3.2) for intelligent responses
- ✅ **Modern UI** - Beautiful chat interface matching AI_Avatar design
- ✅ **Text-to-Speech** - Click the speaker icon to hear responses again

## Prerequisites

### 1. Install Ollama
Download and install Ollama from: https://ollama.ai

### 2. Pull the llama3.2 Model
After installing Ollama, open a terminal and run:
```bash
ollama pull llama3.2
```

### 3. Verify Ollama is Running
Check if Ollama is running on port 11434:
```bash
curl http://localhost:11434/api/tags
```

## How to Use

### Starting the Application

1. **Start MongoDB** (if not already running)
   ```bash
   # Windows
   net start MongoDB
   
   # Or start manually if installed without service
   mongod
   ```

2. **Start Backend** (in `website_backend` folder)
   ```bash
   cd website_backend
   npm start
   ```

3. **Start Frontend** (in `website_frontend` folder)
   ```bash
   cd website_frontend
   npm start
   ```

4. **Verify Ollama is Running**
   - Ollama should be running on http://localhost:11434
   - The backend will automatically connect to it

### Using the Chatbot

1. **Navigate to Chat Page**
   - Go to http://localhost:3000/chat (or click "Chat with Avatar" in navigation)

2. **Type Messages**
   - Type your question in the input box at the bottom
   - Press Enter or click the send button (📤)

3. **Voice Input**
   - Click the microphone button (🎙️) in the bottom-left corner
   - Speak your question
   - The chatbot will automatically process your voice input

4. **Change Language**
   - Use the language selector at the top of the chat
   - Select from English, Hindi, Tamil, Telugu, and more
   - The chatbot will respond in your selected language

5. **Listen to Responses**
   - Click the speaker icon (🔊) next to any AI response
   - The browser will read the message aloud

## Features

### Voice Input
- Uses Web Speech API (works in Chrome, Edge)
- Real-time transcription
- Automatic message sending when you finish speaking

### Multi-language Support
Supported languages:
- English
- Hindi (हिंदी)
- Tamil (தமிழ்)
- Telugu (తెలుగు)
- Kannada (ಕನ್ನಡ)
- Malayalam (മലയാളം)
- Bengali (বাংলা)
- Marathi (मराठी)
- Gujarati (ગુજરાતી)
- Punjabi (ਪੰਜਾਬੀ)

### AI Integration
- Powered by Ollama with llama3.2 model
- Maintains conversation context
- Provides intelligent, contextual responses
- Handles various topics (ML, DL, general knowledge, etc.)

## Troubleshooting

### Issue: Chatbot gives generic responses
**Solution:** Make sure Ollama is running and llama3.2 model is installed
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not, start Ollama
ollama serve

# Pull the model if not installed
ollama pull llama3.2
```

### Issue: Voice input not working
**Solution:** 
- Use Chrome or Edge browser (Safari doesn't support Web Speech API well)
- Allow microphone permissions when prompted
- Check if your microphone is working in system settings

### Issue: "I'm having trouble connecting to my AI service"
**Solution:**
- Verify Ollama is running on port 11434
- Check backend console for error messages
- Restart Ollama service

### Issue: Backend not connecting to Ollama
**Solution:**
1. Check `.env` file in `website_backend` folder has:
   ```
   OLLAMA_BASE_URL=http://localhost:11434
   LLM_MODEL=llama3.2
   ```
2. Restart the backend server

## Architecture

```
User Input (Text/Voice)
    ↓
Frontend (React)
    ↓
Backend API (Express)
    ↓
Ollama (llama3.2)
    ↓
AI Response
    ↓
Frontend Display + TTS
```

## Files Modified

### Frontend
- `src/pages/ChatWithAvatar.js` - Main chat component
- `src/components/VoiceControl.jsx` - Voice input component
- `src/components/LanguageSelector.jsx` - Language selection
- `src/services/aiService.js` - AI service integration
- `src/services/translationService.js` - Translation support
- `src/styles/Chat.css` - Chat interface styling

### Backend
- `src/controllers/chatController.js` - Ollama integration
- `.env` - Environment configuration

## Next Steps

1. **Test the chatbot** with various questions
2. **Try voice input** with different questions
3. **Switch languages** to test multi-language support
4. **Check backend logs** to see Ollama responses

## Support

If you encounter any issues:
1. Check backend console for error messages
2. Verify Ollama is running: `ollama list`
3. Test Ollama directly: `ollama run llama3.2`
4. Check browser console for frontend errors
