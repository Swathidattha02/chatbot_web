const express = require("express");
const router = express.Router();
const { generateQuiz, submitQuiz, getQuizStatus, getSubjectQuizStatus } = require("../controllers/quizController");
const authMiddleware = require("../middleware/auth");

router.post("/generate", authMiddleware, generateQuiz);
router.post("/submit", authMiddleware, submitQuiz);
router.get("/status/:subjectId/:chapterId", authMiddleware, getQuizStatus);
router.get("/subject/:subjectId", authMiddleware, getSubjectQuizStatus);

module.exports = router;
