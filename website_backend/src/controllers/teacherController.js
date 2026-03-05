const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Teacher = require("../models/Teacher");
const Admin = require("../models/Admin");
const User = require("../models/User");

// ─── Helper: generate JWT ─────────────────────────────────────────────────────
const generateToken = (id, role) =>
    jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

// ─── GET /api/schools ─────────────────────────────────────────────────────────
// Returns list of all schools (from admin table)
const getSchools = async (req, res) => {
    try {
        const admins = await Admin.find({}, "schoolName schoolSlug sectionsPerClass classes _id");
        const schools = admins.map((a) => ({
            _id: a._id,
            name: a.schoolName,
            slug: a.schoolSlug,
            classes: a.classes,
            sectionsPerClass: Object.fromEntries(a.sectionsPerClass),
        }));
        res.json({ success: true, schools });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET /api/schools/:schoolId/teachers?class=&section= ─────────────────────
// Returns teachers for a given school, optionally filtered by class+section
const getTeachersBySchool = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const { class: cls, section } = req.query;

        const filter = { school: schoolId };
        if (cls) filter.assignedClass = cls;
        if (section) filter.assignedSection = section;

        const teachers = await Teacher.find(filter, "name assignedClass assignedSection _id");
        res.json({ success: true, teachers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── POST /api/auth/teacher/register ─────────────────────────────────────────
const registerTeacher = async (req, res) => {
    try {
        const { name, email, phone, password, schoolId, assignedClass, assignedSection } = req.body;

        if (!name || !email || !password || !schoolId || !assignedClass || !assignedSection) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // Verify school exists
        const school = await Admin.findById(schoolId);
        if (!school) {
            return res.status(404).json({ success: false, message: "School not found" });
        }

        // Check duplicate email
        const existing = await Teacher.findOne({ email });
        if (existing) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }

        // Check if slot already taken
        const slotTaken = await Teacher.findOne({
            school: schoolId,
            assignedClass,
            assignedSection,
        });
        if (slotTaken) {
            return res.status(400).json({
                success: false,
                message: `A teacher is already assigned to Class ${assignedClass} - Section ${assignedSection} in ${school.schoolName}`,
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const teacher = await Teacher.create({
            name,
            email,
            phone,
            password: hashedPassword,
            school: schoolId,
            schoolName: school.schoolName,
            assignedClass,
            assignedSection,
        });

        const token = generateToken(teacher._id, "teacher");

        res.status(201).json({
            success: true,
            message: "Teacher registered successfully",
            token,
            user: {
                _id: teacher._id,
                name: teacher.name,
                email: teacher.email,
                role: "teacher",
                schoolName: teacher.schoolName,
                assignedClass: teacher.assignedClass,
                assignedSection: teacher.assignedSection,
            },
        });
    } catch (err) {
        console.error("Teacher register error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── POST /api/auth/teacher/login ─────────────────────────────────────────────
const loginTeacher = async (req, res) => {
    try {
        const { email, password } = req.body;

        const teacher = await Teacher.findOne({ email });
        if (!teacher) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, teacher.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const token = generateToken(teacher._id, "teacher");

        res.json({
            success: true,
            token,
            user: {
                _id: teacher._id,
                name: teacher.name,
                email: teacher.email,
                role: "teacher",
                schoolName: teacher.schoolName,
                assignedClass: teacher.assignedClass,
                assignedSection: teacher.assignedSection,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── POST /api/auth/admin/login ────────────────────────────────────────────────
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const token = generateToken(admin._id, "admin");

        res.json({
            success: true,
            token,
            user: {
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: "admin",
                schoolName: admin.schoolName,
                schoolSlug: admin.schoolSlug,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET /api/teacher/dashboard ───────────────────────────────────────────────
// Returns all students under this teacher's class+section with progress
const getTeacherDashboard = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.user.id);
        if (!teacher) {
            return res.status(404).json({ success: false, message: "Teacher not found" });
        }

        // Get all students of this teacher's school, class, section
        const students = await User.find({
            school: teacher.school,
            class: `Class ${teacher.assignedClass}`,
            section: teacher.assignedSection,
        }).select("name email phone rollNumber class section avatar");

        // Get progress for these students
        const Progress = require("../models/Progress");
        const studentIds = students.map((s) => s._id);

        const progressData = await Progress.find({
            userId: { $in: studentIds },
        });

        // Build a map of userId => progress
        const progressMap = {};
        progressData.forEach((p) => {
            const uid = p.userId.toString();
            if (!progressMap[uid]) progressMap[uid] = [];
            progressMap[uid].push(p);
        });

        // Calculate per-student subject completion
        const studentsWithProgress = students.map((student) => {
            const progs = progressMap[student._id.toString()] || [];

            const subjects = ["Mathematics", "Science", "Social", "Telugu", "English", "Hindi"];
            const subjectProgress = {};

            subjects.forEach((subj) => {
                const subjProgs = progs.filter((p) => p.subject === subj);
                const avgCompletion =
                    subjProgs.length > 0
                        ? Math.round(
                            subjProgs.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) /
                            subjProgs.length
                        )
                        : 0;

                const lastChapter =
                    subjProgs.length > 0
                        ? subjProgs.sort((a, b) => b.lastAccessed - a.lastAccessed)[0].chapterName
                        : "-";

                subjectProgress[subj] = {
                    completion: avgCompletion,
                    chapter: lastChapter,
                };
            });

            const totalCompletion =
                Object.values(subjectProgress).reduce((sum, s) => sum + s.completion, 0) /
                subjects.length;

            return {
                _id: student._id,
                name: student.name,
                rollNumber: student.rollNumber || "-",
                email: student.email,
                subjectProgress,
                totalCompletion: Math.round(totalCompletion),
            };
        });

        // Sort by total completion descending
        studentsWithProgress.sort((a, b) => b.totalCompletion - a.totalCompletion);

        const classAverage =
            studentsWithProgress.length > 0
                ? Math.round(
                    studentsWithProgress.reduce((s, st) => s + st.totalCompletion, 0) /
                    studentsWithProgress.length
                )
                : 0;

        const atRisk = studentsWithProgress.filter((s) => s.totalCompletion < 60).length;

        res.json({
            success: true,
            teacher: {
                name: teacher.name,
                schoolName: teacher.schoolName,
                assignedClass: teacher.assignedClass,
                assignedSection: teacher.assignedSection,
            },
            stats: {
                topPerformer: studentsWithProgress[0] || null,
                classAverage,
                atRiskCount: atRisk,
                totalStudents: studentsWithProgress.length,
            },
            students: studentsWithProgress,
        });
    } catch (err) {
        console.error("Teacher dashboard error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    getSchools,
    getTeachersBySchool,
    registerTeacher,
    loginTeacher,
    loginAdmin,
    getTeacherDashboard,
};
