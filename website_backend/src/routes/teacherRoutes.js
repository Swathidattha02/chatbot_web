const express = require("express");
const router = express.Router();
const {
    getSchools,
    getTeachersBySchool,
    registerTeacher,
    loginTeacher,
    loginAdmin,
    getTeacherDashboard,
} = require("../controllers/teacherController");
const { protect } = require("../middleware/auth");

// ── Public routes ──────────────────────────────────────────────────────────────
// Get all schools (for dropdown)
router.get("/schools", getSchools);

// Get teachers by school (optionally filter by class+section)
router.get("/schools/:schoolId/teachers", getTeachersBySchool);

// Teacher registration
router.post("/auth/teacher/register", registerTeacher);

// Teacher login
router.post("/auth/teacher/login", loginTeacher);

// Admin login
router.post("/auth/admin/login", loginAdmin);

// ── Protected routes ───────────────────────────────────────────────────────────
// Teacher dashboard (requires teacher JWT)
router.get("/teacher/dashboard", protect, getTeacherDashboard);

module.exports = router;
