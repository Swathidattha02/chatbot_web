# Backend Integration Guide

## API Endpoints Needed

### 1. Subjects API

#### GET `/api/subjects`
**Description**: Get all subjects for the logged-in user

**Response**:
```json
{
  "success": true,
  "subjects": [
    {
      "id": 1,
      "name": "Mathematics",
      "icon": "📐",
      "color": "#667eea",
      "totalChapters": 12,
      "completedChapters": 8,
      "progress": 65
    },
    {
      "id": 2,
      "name": "Physics",
      "icon": "⚛️",
      "color": "#764ba2",
      "totalChapters": 10,
      "completedChapters": 4,
      "progress": 45
    }
  ]
}
```

---

### 2. Chapters API

#### GET `/api/subjects/:subjectId/chapters`
**Description**: Get all chapters for a specific subject

**Response**:
```json
{
  "success": true,
  "subject": {
    "id": 1,
    "name": "Mathematics",
    "icon": "📐",
    "color": "#667eea"
  },
  "chapters": [
    {
      "id": 1,
      "title": "Algebra Basics",
      "progress": 100,
      "pdfUrl": "/pdfs/math/algebra.pdf",
      "status": "completed"
    },
    {
      "id": 2,
      "title": "Geometry",
      "progress": 80,
      "pdfUrl": "/pdfs/math/geometry.pdf",
      "status": "in_progress"
    }
  ]
}
```

---

### 3. Chapter Details API

#### GET `/api/subjects/:subjectId/chapters/:chapterId`
**Description**: Get specific chapter details

**Response**:
```json
{
  "success": true,
  "chapter": {
    "id": 1,
    "title": "Algebra Basics",
    "progress": 100,
    "pdfUrl": "/pdfs/math/algebra.pdf",
    "status": "completed",
    "timeSpent": 3600,
    "lastAccessed": "2026-01-20T15:30:00Z"
  },
  "subject": {
    "id": 1,
    "name": "Mathematics",
    "icon": "📐",
    "color": "#667eea"
  }
}
```

---

### 4. Progress Update API

#### POST `/api/progress/update`
**Description**: Update user's progress for a chapter

**Request Body**:
```json
{
  "subjectId": 1,
  "chapterId": 2,
  "progress": 85,
  "timeSpent": 1200
}
```

**Response**:
```json
{
  "success": true,
  "message": "Progress updated successfully",
  "updatedProgress": {
    "chapterProgress": 85,
    "subjectProgress": 67,
    "overallProgress": 66
  }
}
```

---

### 5. Chat with Context API

#### POST `/api/chat/message`
**Description**: Send message to AI with chapter context

**Request Body**:
```json
{
  "message": "What is algebra?",
  "sessionId": "session_123",
  "language": "en",
  "context": {
    "subjectId": 1,
    "subjectName": "Mathematics",
    "chapterId": 1,
    "chapterTitle": "Algebra Basics"
  }
}
```

**Response**:
```json
{
  "success": true,
  "response": "Algebra is a branch of mathematics...",
  "sessionId": "session_123",
  "audioUrl": "/audio/response_123.mp3"
}
```

---

## Database Schema

### Subjects Table
```sql
CREATE TABLE subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10),
  color VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chapters Table
```sql
CREATE TABLE chapters (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subject_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  pdf_url VARCHAR(500),
  order_index INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);
```

### User Progress Table
```sql
CREATE TABLE user_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  subject_id INT NOT NULL,
  chapter_id INT NOT NULL,
  progress_percentage INT DEFAULT 0,
  time_spent INT DEFAULT 0,
  status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
  last_accessed TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (chapter_id) REFERENCES chapters(id),
  UNIQUE KEY unique_user_chapter (user_id, chapter_id)
);
```

---

## Frontend Service Updates Needed

### Create `subjectService.js`

```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const subjectService = {
  // Get all subjects
  getAllSubjects: async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/subjects`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Get chapters for a subject
  getSubjectChapters: async (subjectId) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/subjects/${subjectId}/chapters`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Get chapter details
  getChapterDetails: async (subjectId, chapterId) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(
      `${API_URL}/subjects/${subjectId}/chapters/${chapterId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  // Update progress
  updateProgress: async (progressData) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/progress/update`,
      progressData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }
};
```

---

## Backend Routes Structure

### `routes/subjectRoutes.js`
```javascript
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const subjectController = require('../controllers/subjectController');

// Get all subjects
router.get('/subjects', authenticate, subjectController.getAllSubjects);

// Get chapters for a subject
router.get('/subjects/:subjectId/chapters', authenticate, subjectController.getChapters);

// Get chapter details
router.get('/subjects/:subjectId/chapters/:chapterId', authenticate, subjectController.getChapterDetails);

module.exports = router;
```

### `routes/progressRoutes.js`
```javascript
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const progressController = require('../controllers/progressController');

// Update progress
router.post('/progress/update', authenticate, progressController.updateProgress);

// Get user's overall progress
router.get('/progress/overall', authenticate, progressController.getOverallProgress);

module.exports = router;
```

---

## Controller Examples

### `controllers/subjectController.js`
```javascript
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const UserProgress = require('../models/UserProgress');

exports.getAllSubjects = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all subjects
    const subjects = await Subject.findAll();
    
    // Get user progress for each subject
    const subjectsWithProgress = await Promise.all(
      subjects.map(async (subject) => {
        const chapters = await Chapter.findAll({ 
          where: { subject_id: subject.id } 
        });
        
        const progress = await UserProgress.findAll({
          where: { 
            user_id: userId, 
            subject_id: subject.id 
          }
        });
        
        const totalChapters = chapters.length;
        const completedChapters = progress.filter(
          p => p.status === 'completed'
        ).length;
        
        const avgProgress = progress.length > 0
          ? Math.round(
              progress.reduce((sum, p) => sum + p.progress_percentage, 0) / 
              progress.length
            )
          : 0;
        
        return {
          id: subject.id,
          name: subject.name,
          icon: subject.icon,
          color: subject.color,
          totalChapters,
          completedChapters,
          progress: avgProgress
        };
      })
    );
    
    res.json({ success: true, subjects: subjectsWithProgress });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getChapters = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const userId = req.user.id;
    
    const subject = await Subject.findByPk(subjectId);
    const chapters = await Chapter.findAll({ 
      where: { subject_id: subjectId },
      order: [['order_index', 'ASC']]
    });
    
    const chaptersWithProgress = await Promise.all(
      chapters.map(async (chapter) => {
        const progress = await UserProgress.findOne({
          where: { 
            user_id: userId, 
            chapter_id: chapter.id 
          }
        });
        
        return {
          id: chapter.id,
          title: chapter.title,
          progress: progress?.progress_percentage || 0,
          pdfUrl: chapter.pdf_url,
          status: progress?.status || 'not_started'
        };
      })
    );
    
    res.json({ 
      success: true, 
      subject: {
        id: subject.id,
        name: subject.name,
        icon: subject.icon,
        color: subject.color
      },
      chapters: chaptersWithProgress 
    });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
```

---

## Integration Steps

1. **Create Backend Models**:
   - Subject.js
   - Chapter.js
   - UserProgress.js

2. **Create Backend Controllers**:
   - subjectController.js
   - progressController.js

3. **Create Backend Routes**:
   - subjectRoutes.js
   - progressRoutes.js

4. **Update Frontend**:
   - Create subjectService.js
   - Update Dashboard.js to use API
   - Update SubjectChapters.js to use API
   - Update PDFViewer.js to use API

5. **Seed Database**:
   - Add sample subjects
   - Add sample chapters
   - Link PDFs to chapters

6. **Test Flow**:
   - Login → Dashboard loads subjects from API
   - Click subject → Chapters load from API
   - Click chapter → PDF and details load from API
   - Track progress → Updates sent to API

---

**Note**: Currently using sample data in frontend. Replace with API calls when backend is ready!
