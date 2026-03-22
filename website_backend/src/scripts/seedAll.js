/**
 * seedAll.js: Seeds Admin, Teacher, Student, and Quiz results for testing.
 * Run with: node src/scripts/seedAll.js
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const Admin = require("../models/Admin");
const Teacher = require("../models/Teacher");
const User = require("../models/User");
const Quiz = require("../models/Quiz");

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // 1. Clear existing data (Optional, but good for clean test)
        // await Admin.deleteMany({});
        // await Teacher.deleteMany({});
        // await User.deleteMany({});
        // await Quiz.deleteMany({});

        // 2. Seed Admin
        const adminEmail = "admin@chaitanya.com";
        let admin = await Admin.findOne({ email: adminEmail });
        if (!admin) {
            const hashedPassword = await bcrypt.hash("chaitanya@123", 12);
            admin = await Admin.create({
                name: "Principal Sita Devi",
                email: adminEmail,
                password: hashedPassword,
                schoolName: "Chaitanya School",
                schoolSlug: "chaitanya_school",
                classes: [6, 7, 8, 9, 10],
                sectionsPerClass: { "6": ["A", "B"] }
            });
            console.log("✅ Created Admin");
        }

        // 3. Seed Teacher
        const teacherEmail = "pavan@gmail.com";
        let teacher = await Teacher.findOne({ email: teacherEmail });
        if (!teacher) {
            const hashedPass = await bcrypt.hash("Pavan123@", 12);
            teacher = await Teacher.create({
                name: "Pavan Kumar",
                email: teacherEmail,
                password: hashedPass,
                school: admin._id,
                schoolName: admin.schoolName,
                assignedClass: "6",
                assignedSection: "A",
                status: "approved"
            });
            console.log("✅ Created Teacher");
        }

        // 4. Seed Student
        const studentEmail = "abcd@gmail.com";
        let student = await User.findOne({ email: studentEmail });
        if (!student) {
            const hashedPass = await bcrypt.hash("Abcd02@", 12);
            student = await User.create({
                name: "Abcd Student",
                email: studentEmail,
                password: hashedPass,
                class: "Class 6",
                section: "A",
                school: admin._id,
                schoolName: admin.schoolName,
                classTeacher: teacher._id,
                role: "student",
                status: "approved"
            });
            console.log("✅ Created Student");
        }

        // 5. Seed some Quiz Results for "Abcd Student"
        const existingQuiz = await Quiz.findOne({ userId: student._id });
        if (!existingQuiz) {
            // Math Quiz (Passed)
            await Quiz.create({
                userId: student._id,
                studentName: student.name,
                school: admin._id,
                studentClass: "Class 6",
                section: "A",
                classTeacher: teacher._id,
                subjectId: 1,
                subjectName: "Mathematics",
                chapterId: 1,
                chapterName: "Fractions",
                passed: true,
                score: 8,
                totalQ: 10,
                percentage: 80,
                attempts: [
                    { score: 6, percentage: 60, passed: true },
                    { score: 8, percentage: 80, passed: true }
                ]
            });

            // Science Quiz (Failed)
            await Quiz.create({
                userId: student._id,
                studentName: student.name,
                school: admin._id,
                studentClass: "Class 6",
                section: "A",
                classTeacher: teacher._id,
                subjectId: 2,
                subjectName: "Science",
                chapterId: 1,
                chapterName: "Components in Food",
                passed: false,
                score: 3,
                totalQ: 10,
                percentage: 30,
                attempts: [
                    { score: 3, percentage: 30, passed: false }
                ]
            });
            console.log("✅ Created Sample Quiz Results");
        }

        console.log("🎉 Seeding complete!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Seeding error:", err);
        process.exit(1);
    }
}

seed();
