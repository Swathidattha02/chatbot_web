# 🚀 AI Avatar Website - Complete Setup Guide

## 📋 Project Structure

```
d:\app_intern\
├── Ai_Avatar\              # ✅ Existing - AI Avatar React app with 3D avatar
├── website_backend\        # 🆕 NEW - MERN Backend (Node.js + Express + MongoDB)
├── website_frontend\       # 🆕 NEW - React Website
├── app_backend\            # Old mobile app backend
└── app_frontend\           # Old mobile app frontend
```

## ✨ What's Been Created

### Website Backend (`website_backend/`)
- ✅ Express server with MongoDB
- ✅ User authentication (JWT)
- ✅ Chat API endpoints
- ✅ Models: User, ChatHistory, Document
- ✅ Middleware: Auth protection
- ✅ Controllers: Auth, Chat
- ✅ Routes: Auth, Chat

### Website Frontend (`website_frontend/`)
- ✅ React app with routing
- ✅ Pages: Home, Login, Signup, Dashboard, Chat
- ✅ Components: Navbar
- ✅ Context: Authentication
- ✅ Services: API integration
- ✅ Styles: Modern CSS with gradients and animations
- ✅ Protected routes

## 🛠️ Setup Instructions

### Prerequisites
- ✅ Node.js installed
- ✅ MongoDB installed and running
- ✅ Git (optional)

### Step 1: Backend Setup

```bash
# Navigate to backend
cd d:\app_intern\website_backend

# Install dependencies (if not already done)
npm install

# Start the server
npm start
```

Backend will run on: `http://localhost:5000`

### Step 2: Frontend Setup

```bash
# Navigate to frontend
cd d:\app_intern\website_frontend

# Dependencies are already installed
# If needed: npm install

# Start the React app
npm start
```

Frontend will run on: `http://localhost:3000`

### Step 3: Test the Website

1. **Open browser**: `http://localhost:3000`
2. **Sign up**: Create a new account
3. **Login**: Sign in with your credentials
4. **Dashboard**: View your dashboard
5. **Chat**: Go to chat page and talk with AI avatar

## 🔧 Configuration

### Backend (.env)
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/ai_avatar_website
JWT_SECRET=your_jwt_secret_key_here_change_in_production
AI_AVATAR_SERVICE_URL=http://localhost:3000
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Chat
- `POST /api/chat/message` - Send message to AI (Protected)
- `GET /api/chat/history` - Get chat history (Protected)
- `DELETE /api/chat/:sessionId` - Delete chat session (Protected)

## 🎨 Features

### Implemented ✅
- User authentication (Signup/Login)
- JWT token-based auth
- Protected routes
- Beautiful landing page
- Dashboard
- Chat interface (basic)
- Responsive design
- Modern UI with gradients

### To Be Integrated 🔄
- 3D AI Avatar from `Ai_Avatar` folder
- Voice input/output
- Document upload
- Chat history persistence
- User settings
- Analytics

## 🔗 Integrating AI Avatar

To integrate the 3D avatar from `Ai_Avatar`:

### Option 1: Copy Components
```bash
# Copy avatar component
cp d:\app_intern\Ai_Avatar\src\LipSyncAvatar.js d:\app_intern\website_frontend\src\components\

# Copy required assets
cp -r d:\app_intern\Ai_Avatar\src\assets d:\app_intern\website_frontend\src\
```

### Option 2: Use as Module
```javascript
// In website_frontend/src/pages/ChatWithAvatar.js
import LipSyncAvatar from '../../../Ai_Avatar/src/LipSyncAvatar';
```

### Update ChatWithAvatar.js
Replace the `AvatarPlaceholder` component with the actual avatar:

```javascript
import LipSyncAvatar from '../components/LipSyncAvatar';

// In the render:
<div className="avatar-section">
  <LipSyncAvatar />
</div>
```

## 🚀 Running Everything Together

### Terminal 1: Backend
```bash
cd d:\app_intern\website_backend
npm start
```

### Terminal 2: Frontend
```bash
cd d:\app_intern\website_frontend
npm start
```

### Terminal 3: AI Avatar Service (if separate)
```bash
cd d:\app_intern\Ai_Avatar\ai_vector_server
# Run the Python service
python app.py
```

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
# Windows: Services -> MongoDB

# Or start manually
mongod
```

### Port Already in Use
```bash
# Backend (5000)
# Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <process_id> /F

# Frontend (3000)
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <process_id> /F
```

### CORS Errors
- Backend already has CORS enabled with `origin: "*"`
- If issues persist, check browser console

### Authentication Issues
- Clear localStorage: `localStorage.clear()`
- Check if JWT_SECRET is set in backend `.env`
- Verify token is being sent in headers

## 📊 Database

### MongoDB Collections

**users**
- name, email, password (hashed)
- avatar, role
- timestamps

**chathistories**
- userId, messages[], sessionName
- language
- timestamps

**documents**
- userId, fileName, fileUrl
- fileType, fileSize
- processed, vectorStoreId
- timestamps

### View Database
```bash
# Open MongoDB shell
mongosh

# Use database
use ai_avatar_website

# View collections
show collections

# View users
db.users.find()

# View chat history
db.chathistories.find()
```

## 🎯 Next Steps

1. **Test the website** - Sign up, login, navigate
2. **Integrate AI Avatar** - Copy components from Ai_Avatar
3. **Connect to AI service** - Link chat to actual AI responses
4. **Add features** - Document upload, voice, etc.
5. **Deploy** - Vercel (frontend) + Render/Railway (backend)

## 📁 File Structure

### Backend
```
website_backend/
├── src/
│   ├── config/db.js
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   └── server.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

### Frontend
```
website_frontend/
├── src/
│   ├── components/
│   ├── context/
│   ├── pages/
│   ├── services/
│   ├── styles/
│   ├── App.js
│   └── index.js
├── public/
├── .env
├── package.json
└── README.md
```

## 🎨 Design System

### Colors
- Primary: `#667eea` (Purple)
- Secondary: `#764ba2` (Deep Purple)
- Background: `#f7fafc`
- Text: `#1a202c`

### Components
- Buttons: Primary, Secondary, Small, Large
- Cards: Dashboard, Feature cards
- Forms: Modern inputs with validation
- Chat: Message bubbles with avatars

## 🚢 Deployment

### Frontend (Vercel)
```bash
cd website_frontend
npm run build
vercel
```

### Backend (Render/Railway)
1. Push to GitHub
2. Connect to Render/Railway
3. Set environment variables
4. Deploy

### Database (MongoDB Atlas)
1. Create cluster on MongoDB Atlas
2. Get connection string
3. Update MONGO_URI in backend .env

## ✅ Checklist

- [x] Backend created with Express + MongoDB
- [x] Frontend created with React
- [x] Authentication implemented
- [x] Chat interface created
- [x] Beautiful UI designed
- [x] Responsive layout
- [ ] AI Avatar integrated
- [ ] AI service connected
- [ ] Document upload added
- [ ] Deployed to production

---

## 🎉 You're All Set!

Your MERN stack website is ready! 

**Start both servers and visit `http://localhost:3000` to see your website!**

For questions or issues, check the individual READMEs in `website_backend/` and `website_frontend/`.
