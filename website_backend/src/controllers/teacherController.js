const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Teacher = require("../models/Teacher");
const Admin = require("../models/Admin");
const User = require("../models/User");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

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

        const teachers = await Teacher.find(filter, "name email phone assignedClass assignedSection status _id");
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
            status: "pending", // Needs admin approval
        });

        // DO NOT return a token — teacher must wait for admin approval
        res.status(201).json({
            success: true,
            pending: true,
            message: `Registration submitted! Please wait for ${school.schoolName} admin to approve your account.`,
            teacher: {
                name: teacher.name,
                email: teacher.email,
                schoolName: teacher.schoolName,
                assignedClass: teacher.assignedClass,
                assignedSection: teacher.assignedSection,
                status: "pending",
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
        console.log(`[loginTeacher] Attempt: ${email}`, req.body);
        const teacher = await Teacher.findOne({ email });
        if (!teacher) {
            console.log(`[loginTeacher] Failed: User not found - ${email}`);
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, teacher.password);
        if (!isMatch) {
            console.log(`[loginTeacher] Failed: Password mismatch - ${email}`);
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        // Check approval status
        if (teacher.status === "pending") {
            return res.status(403).json({
                success: false,
                pending: true,
                message: `Your account is pending approval from ${teacher.schoolName} admin. Please wait.`,
            });
        }

        if (teacher.status === "rejected") {
            return res.status(403).json({
                success: false,
                rejected: true,
                message: `Your registration was rejected. Reason: ${teacher.rejectionReason || "Contact your school admin."}`,
            });
        }

        const token = generateToken(teacher._id, "teacher");
        console.log(`[loginTeacher] Success: ${email}`);

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
        console.log(`[loginAdmin] Attempt: ${email}`, req.body);

        const admin = await Admin.findOne({ email });
        if (!admin) {
            console.log(`[loginAdmin] Failed: Admin not found - ${email}`);
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            console.log(`[loginAdmin] Failed: Password mismatch - ${email}`);
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const token = generateToken(admin._id, "admin");
        console.log(`[loginAdmin] Success: ${email}`);

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
                isFirstLogin: admin.isFirstLogin,
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

        // Get only approved students of this teacher's school, class, section
        const students = await User.find({
            school: teacher.school,
            class: `Class ${teacher.assignedClass}`,
            section: teacher.assignedSection,
            role: "student",
            status: "approved"
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

            const subjects = ["Mathematics", "Science", "Biology", "Social Studies", "Telugu", "English", "Hindi"];
            const subjectProgress = {};

            subjects.forEach((subj) => {
                const subjProgs = progs.filter((p) => p.subjectName === subj);
                const avgCompletion =
                    subjProgs.length > 0
                        ? Math.round(
                            subjProgs.reduce((sum, p) => {
                                // 2 minutes = 100%, scale accordingly
                                const completion = p.completed ? 100 : Math.min((p.timeSpent / 2) * 100, 99);
                                return sum + completion;
                            }, 0) /
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
                class: student.class,
                section: student.section,
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

// ─── GET /api/admin/pending-teachers ─────────────────────────────────────────
// Get all pending teacher registrations for this admin's school
const getPendingTeachers = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

        const pending = await Teacher.find({ school: admin._id, status: "pending" })
            .select("name email phone assignedClass assignedSection createdAt status")
            .sort({ createdAt: -1 });

        res.json({ success: true, teachers: pending });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET /api/admin/pending-students ─────────────────────────────────────────
// Get all pending student registrations for this admin's school
const getPendingStudentsForAdmin = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

        const pending = await User.find({ school: admin._id, status: "pending", role: "student" })
            .select("name email phone rollNumber class section createdAt status")
            .sort({ createdAt: -1 });

        res.json({ success: true, students: pending });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// ─── POST /api/admin/approve-teacher/:teacherId ───────────────────────────────
const approveTeacher = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

        const teacher = await Teacher.findOne({ _id: req.params.teacherId, school: admin._id });
        if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

        teacher.status = "approved";
        await teacher.save();

        console.log(`✅ Teacher approved: ${teacher.name} by admin: ${admin.name}`);
        res.json({ success: true, message: `${teacher.name} has been approved successfully.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── POST /api/admin/reject-teacher/:teacherId ────────────────────────────────
const rejectTeacher = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

        const teacher = await Teacher.findOne({ _id: req.params.teacherId, school: admin._id });
        if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

        teacher.status = "rejected";
        teacher.rejectionReason = req.body.reason || "Not approved by school admin.";
        await teacher.save();

        console.log(`❌ Teacher rejected: ${teacher.name} by admin: ${admin.name}`);
        res.json({ success: true, message: `${teacher.name} has been rejected.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── POST /api/admin/approve-student/:studentId ───────────────────────────────
const approveStudentForAdmin = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

        const student = await User.findOne({ _id: req.params.studentId, school: admin._id });
        if (!student) return res.status(404).json({ success: false, message: "Student not found in your school" });

        student.status = "approved";
        
        // Find if there's a class teacher for this student's class and section to assign them to
        const classTeacher = await Teacher.findOne({
            school: admin._id,
            assignedClass: student.class.replace("Class ", ""),
            assignedSection: student.section,
        });
        if (classTeacher) {
            student.classTeacher = classTeacher._id;
        }

        await student.save();

        console.log(`✅ Student approved: ${student.name} by admin: ${admin.name}`);
        res.json({ success: true, message: `${student.name} has been approved successfully.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── POST /api/admin/reject-student/:studentId ────────────────────────────────
const rejectStudentForAdmin = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

        const student = await User.findOne({ _id: req.params.studentId, school: admin._id });
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        student.status = "rejected";
        student.rejectionReason = req.body.reason || "Not approved by school admin.";
        await student.save();

        console.log(`❌ Student rejected: ${student.name} by admin: ${admin.name}`);
        res.json({ success: true, message: `${student.name} has been rejected.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET /api/teacher/pending-students ────────────────────────────────────────
// Returns students pending approval for this teacher's class+section
const getPendingStudents = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.user.id);
        if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

        const students = await User.find({
            school: teacher.school,
            class: `Class ${teacher.assignedClass}`,
            section: teacher.assignedSection,
            status: "pending",
        }).select("name email phone rollNumber class section createdAt status").sort({ createdAt: -1 });

        res.json({ success: true, students });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── POST /api/teacher/approve-student/:studentId ─────────────────────────────
const approveStudent = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.user.id);
        if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

        // Only approve students in this teacher's class+section
        const student = await User.findOne({
            _id: req.params.studentId,
            school: teacher.school,
            class: `Class ${teacher.assignedClass}`,
            section: teacher.assignedSection,
        });
        if (!student) return res.status(404).json({ success: false, message: "Student not found in your class" });

        student.status = "approved";
        student.classTeacher = teacher._id;   // ← link to teacher for quiz tracking
        await student.save();

        console.log(`✅ Student approved: ${student.name} by teacher: ${teacher.name} (classTeacher set)`);
        res.json({ success: true, message: `${student.name} has been approved successfully.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── POST /api/teacher/reject-student/:studentId ──────────────────────────────
const rejectStudent = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.user.id);
        if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

        const student = await User.findOne({
            _id: req.params.studentId,
            school: teacher.school,
            class: `Class ${teacher.assignedClass}`,
            section: teacher.assignedSection,
        });
        if (!student) return res.status(404).json({ success: false, message: "Student not found in your class" });

        student.status = "rejected";
        student.rejectionReason = req.body.reason || "Not approved by class teacher.";
        await student.save();

        console.log(`❌ Student rejected: ${student.name} by teacher: ${teacher.name}`);
        res.json({ success: true, message: `${student.name} has been rejected.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET /api/admin/students ───────────────────────────────────────────────────
// Returns all students for this admin's school
const getStudentsBySchool = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

        const students = await User.find({ school: admin._id })
            .select("name email phone rollNumber class section status createdAt")
            .sort({ createdAt: -1 });

        res.json({ success: true, students });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── DELETE /api/admin/delete-teacher/:teacherId ───────────────────────────────
// Permanently deletes a teacher from the database
const deleteTeacher = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

        const teacher = await Teacher.findOne({ _id: req.params.teacherId, school: admin._id });
        if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found in your school" });

        await Teacher.findByIdAndDelete(req.params.teacherId);
        console.log(`🗑️ Teacher deleted: ${teacher.name} by admin: ${admin.name}`);
        res.json({ success: true, message: `${teacher.name} has been permanently removed.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── DELETE /api/admin/delete-student/:studentId ───────────────────────────────
// Permanently deletes a student from the database
const deleteStudent = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

        const student = await User.findOne({ _id: req.params.studentId, school: admin._id });
        if (!student) return res.status(404).json({ success: false, message: "Student not found in your school" });

        await User.findByIdAndDelete(req.params.studentId);
        console.log(`🗑️ Student deleted: ${student.name} by admin: ${admin.name}`);
        res.json({ success: true, message: `${student.name} has been permanently removed.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const changeAdminPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const admin = await Admin.findById(req.user.id);

        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid current password" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        admin.password = hashedPassword;
        admin.isFirstLogin = false;
        await admin.save();

        res.json({ success: true, message: "Password updated successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── Forgot Password (Teacher & Admin) ─────────────────────────────────────────
const forgotPasswordTeacherAdmin = async (req, res) => {
    try {
        const { email, role } = req.body; // role: "teacher" | "admin"
        
        let Model;
        if (role === 'admin') Model = Admin;
        else if (role === 'teacher') Model = Teacher;
        else return res.status(400).json({ success: false, message: "Invalid role" });

        const user = await Model.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: `No ${role} found with this email`,
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(20).toString("hex");

        // Hash token and set to resetPasswordToken field
        user.resetPasswordToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        // Set expire (10 minutes)
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

        await user.save({ validateBeforeSave: false });

        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${role}/${resetToken}`;

        try {
            await sendEmail({
                email: user.email,
                subject: "Password Reset Token",
                message: `Password reset link: ${resetUrl}`,
                html: `
                    <h1>Password Reset Requested</h1>
                    <p>Click the link below to reset your ${role} account password. This link is valid for 10 minutes.</p>
                    <a href="${resetUrl}" style="padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                    <p>If you did not request this, please ignore this email.</p>
                `,
            });

            res.status(200).json({
                success: true,
                message: "Email sent successfully",
            });
        } catch (err) {
            console.error(err);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(500).json({
                success: false,
                message: "Email could not be sent",
            });
        }
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ─── Reset Password (Teacher & Admin) ──────────────────────────────────────────
const resetPasswordTeacherAdmin = async (req, res) => {
    try {
        const { role } = req.body; // role: "teacher" | "admin"
        
        let Model;
        if (role === 'admin') Model = Admin;
        else if (role === 'teacher') Model = Teacher;
        else return res.status(400).json({ success: false, message: "Invalid role" });

        // Get hashed token
        const resetPasswordToken = crypto
            .createHash("sha256")
            .update(req.params.token)
            .digest("hex");

        const user = await Model.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired token",
            });
        }

        // Set the new password
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(req.body.password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Password reset successful",
        });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

module.exports = {
    getSchools,
    getTeachersBySchool,
    registerTeacher,
    loginTeacher,
    loginAdmin,
    changeAdminPassword,
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
    forgotPasswordTeacherAdmin,
    resetPasswordTeacherAdmin,
};
