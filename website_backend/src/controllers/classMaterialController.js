const ClassMaterial = require("../models/ClassMaterial");
const Teacher = require("../models/Teacher");
const User = require("../models/User");
const path = require("path");
const fs = require("fs").promises;

// @desc    Teacher uploads class material or announcement
// @route   POST /api/class-materials/upload
// @access  Private (Teacher)
exports.uploadMaterial = async (req, res) => {
    try {
        const { title, description, type } = req.body;
        const teacherId = req.user.id;

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({ success: false, message: "Teacher not found" });
        }

        const materialData = {
            teacherId: teacher._id,
            teacherName: teacher.name,
            school: teacher.school,
            class: `Class ${teacher.assignedClass}`,
            section: teacher.assignedSection,
            title,
            description,
            type,
        };

        if (type === "document") {
            if (!req.file) {
                return res.status(400).json({ success: false, message: "No file uploaded for document type" });
            }
            materialData.fileUrl = `/uploads/class-materials/${req.file.filename}`;
            materialData.fileName = req.file.originalname;
            materialData.fileType = path.extname(req.file.originalname).substring(1);
        }

        const material = await ClassMaterial.create(materialData);

        res.status(201).json({
            success: true,
            message: type === "document" ? "Document uploaded successfully" : "Announcement posted successfully",
            material,
        });
    } catch (error) {
        console.error("Upload material error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// @desc    Get materials and announcements for a teacher (their own)
// @route   GET /api/class-materials/teacher
// @access  Private (Teacher)
exports.getTeacherMaterials = async (req, res) => {
    try {
        const materials = await ClassMaterial.find({ teacherId: req.user.id }).sort({ createdAt: -1 });
        res.json({ success: true, materials });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get materials for a student (based on their class and section)
// @route   GET /api/class-materials/student
// @access  Private (Student)
exports.getStudentMaterials = async (req, res) => {
    try {
        const student = await User.findById(req.user.id);
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        const materials = await ClassMaterial.find({
            school: student.school,
            class: student.class,
            section: student.section,
        }).sort({ createdAt: -1 });

        res.json({ success: true, materials });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete material
// @route   DELETE /api/class-materials/:id
// @access  Private (Teacher)
exports.deleteMaterial = async (req, res) => {
    try {
        const material = await ClassMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ success: false, message: "Material not found" });
        }

        if (material.teacherId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        // If it's a file, delete the actual file too
        if (material.fileUrl) {
            const filePath = path.join(__dirname, "../../", material.fileUrl);
            try {
                await fs.unlink(filePath);
            } catch (err) {
                console.warn("Could not delete file:", filePath);
            }
        }

        await material.deleteOne();
        res.json({ success: true, message: "Material deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// @desc    Download material file
// @route   GET /api/class-materials/download/:id
// @access  Private
exports.downloadMaterial = async (req, res) => {
    try {
        const material = await ClassMaterial.findById(req.params.id);
        if (!material || !material.fileUrl) {
            return res.status(404).json({ success: false, message: "Material not found" });
        }

        const filePath = path.join(__dirname, "../../", material.fileUrl);
        res.download(filePath, material.fileName || "download");
    } catch (error) {
        console.error("Download error:", error);
        res.status(500).json({ success: false, message: "Download failed" });
    }
};
