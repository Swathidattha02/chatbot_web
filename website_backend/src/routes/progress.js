const express = require("express");
const router = express.Router();
const {
    updateProgress,
    getUserProgress,
    getDailyAnalytics,
    getWeeklyAnalytics,
    getMonthlyAnalytics,
    getSubjectProgress,
    getUserAchievements,
    getRecommendations
} = require("../controllers/progressController");
const authMiddleware = require("../middleware/auth");

// All routes are protected
router.post("/update", authMiddleware, updateProgress);
router.get("/user", authMiddleware, getUserProgress);
router.get("/analytics/daily", authMiddleware, getDailyAnalytics);
router.get("/analytics/weekly", authMiddleware, getWeeklyAnalytics);
router.get("/analytics/monthly", authMiddleware, getMonthlyAnalytics);
router.get("/subject/:subjectId", authMiddleware, getSubjectProgress);
router.get("/achievements", authMiddleware, getUserAchievements);
router.get("/recommendations", authMiddleware, getRecommendations);

module.exports = router;
