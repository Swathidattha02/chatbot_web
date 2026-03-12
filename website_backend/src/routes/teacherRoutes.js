const express = require("express");
const router = express.Router();
const {
    getSchools,
    getTeachersBySchool,
    registerTeacher,
    loginTeacher,
    loginAdmin,
    getTeacherDashboard,
    getPendingTeachers,
    getPendingStudentsForAdmin,
    approveTeacher,
    rejectTeacher,
    getPendingStudents,
    approveStudent,
    rejectStudent,
    approveStudentForAdmin,
    rejectStudentForAdmin,
    getStudentsBySchool,
    deleteTeacher,
    deleteStudent,
    changeAdminPassword,
} = require("../controllers/teacherController");
const { protect } = require("../middleware/auth");

// ── Public routes ───────────────────────────────────────────────────────────────
router.get("/schools", getSchools);
router.get("/schools/:schoolId/teachers", getTeachersBySchool);
router.post("/auth/teacher/register", registerTeacher);
router.post("/auth/teacher/login", loginTeacher);
router.post("/auth/admin/login", loginAdmin);

// ── Protected: Teacher routes ───────────────────────────────────────────────────
router.get("/teacher/dashboard", protect, getTeacherDashboard);
router.get("/teacher/pending-students", protect, getPendingStudents);
router.post("/teacher/approve-student/:studentId", protect, approveStudent);
router.post("/teacher/reject-student/:studentId", protect, rejectStudent);

// ── Protected: Admin routes ─────────────────────────────────────────────────────
router.get("/admin/pending-teachers", protect, getPendingTeachers);
router.post("/admin/approve-teacher/:teacherId", protect, approveTeacher);
router.post("/admin/reject-teacher/:teacherId", protect, rejectTeacher);
router.get("/admin/pending-students", protect, getPendingStudentsForAdmin);
router.post("/admin/approve-student/:studentId", protect, approveStudentForAdmin);
router.post("/admin/reject-student/:studentId", protect, rejectStudentForAdmin);
router.get("/admin/students", protect, getStudentsBySchool);
router.post("/admin/change-password", protect, changeAdminPassword);
router.delete("/admin/delete-teacher/:teacherId", protect, deleteTeacher);
router.delete("/admin/delete-student/:studentId", protect, deleteStudent);

module.exports = router;
