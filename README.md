# AI Educational Chatbot - Frontend

A modern React-based frontend for an AI-powered educational platform with interactive 3D avatar, multilingual support, and comprehensive learning analytics.

---

## 🚀 Project Overview
This frontend provides an engaging learning experience with an AI tutor avatar. Students can interact with the AI in multiple languages, track their progress, view analytics, and study from integrated PDF materials with real-time assistance.

---

## ✨ Features
- **3D Interactive Avatar**: Lip-synced AI tutor using Three.js and React Three Fiber
- **Real-time Streaming Chat**: Live responses with typing indicators
- **Voice Input**: Speech-to-text for hands-free interaction
- **Multilingual Support**: Switch between languages seamlessly (English, Hindi, Telugu, etc.)
- **Progress Tracking**: Granular chapter-level progress with visual indicators
- **Learning Analytics**: Weekly and monthly analytics with interactive charts
- **PDF Viewer**: Integrated PDF reader with AI assistance
- **Subject Management**: Organized curriculum with chapter locking system
- **Responsive Design**: Works on desktop and mobile devices
- **Document Upload**: Upload and chat with your own documents

---

## 🧠 Tech Stack
- **React** - UI framework
- **React Router** - Navigation
- **Three.js** & **React Three Fiber** - 3D avatar rendering
- **Web Speech API** - Voice recognition
- **Context API** - State management
- **CSS3** - Modern styling with animations
- **Fetch API** - Backend communication
- **SSE (Server-Sent Events)** - Real-time streaming

---

## 🏗️ Architecture Flow
1. User logs in → JWT stored in localStorage
2. Dashboard loads → Fetches progress from backend
3. User selects chapter → PDF viewer opens with AI chat
4. User asks question → Streaming response from AI
5. Progress auto-saved every 10 seconds
6. Analytics calculated from session history

---

## 📂 Project Structure
```
website_frontend/
├── public/
│   ├── pdfs/              # PDF materials organized by class/subject
│   └── index.html
├── src/
│   ├── components/        # Reusable components (Avatar, LanguageSelector)
│   ├── pages/             # Main pages (Dashboard, Chat, Analytics, PDFViewer)
│   ├── context/           # Auth context
│   ├── services/          # API and translation services
│   ├── config/            # Syllabus configuration
│   ├── styles/            # CSS files
│   └── App.js             # Main app component
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- Backend server running on http://localhost:5000

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

The app will open at `http://localhost:3000`

---

## 🎨 Key Pages

### Dashboard
- Subject cards with real-time progress
- Quick access to chat and analytics
- Document upload functionality
- Overall learning statistics

### Subject Chapters
- Chapter list with progress indicators
- Chapter locking system (complete previous to unlock next)
- Time tracking per chapter
- Direct access to PDF viewer

### PDF Viewer
- Integrated PDF reader
- Side-by-side AI chat
- Context-aware responses about the material
- Auto-save progress

### Chat with Avatar
- 3D animated avatar with lip-sync
- Voice and text input
- Language switching
- Conversation history

### Analytics
- Weekly view: Daily bar charts, subject progress
- Monthly view: Consistency tracking, achievements
- Subject-wise proficiency metrics
- Interactive visualizations

---

## 🔧 Configuration

### Syllabus Setup
Edit `src/config/syllabus.js` to add/modify:
- Classes (7, 8, 9, 10)
- Subjects per class
- Chapters per subject
- PDF paths

### API Endpoints
Backend URL is configured in each page. To change globally, update the fetch URLs in:
- `src/pages/Dashboard.js`
- `src/pages/ChatWithAvatar.js`
- `src/pages/Analytics.js`
- `src/pages/PDFViewer.js`

---

## 🎯 Features in Detail

### Progress Tracking
- **Granular**: Tracks time down to seconds
- **Persistent**: Saved to database every 10 seconds
- **Visual**: Progress bars show exact percentage
- **Session-based**: Daily history for accurate analytics

### Chapter Locking
- First chapter always unlocked
- Must complete 2+ minutes to unlock next
- Visual lock indicators
- Prevents skipping ahead

### AI Chat
- **Streaming**: Word-by-word response display
- **Context-aware**: Uses RAG for document-based answers
- **Multilingual**: Responds in selected language
- **Voice**: Hands-free interaction

---

## 🌐 Supported Languages
- English
- Hindi (हिंदी)
- Telugu (తెలుగు)
- Tamil (தமிழ்)
- Kannada (ಕನ್ನಡ)
- Malayalam (മലയാളം)
- Bengali (বাংলা)
- Marathi (मराठी)
- Gujarati (ગુજરાતી)

---

## 🤝 Contributing
This is an educational project. Feel free to fork and enhance!

---

## 📝 License
ISC
