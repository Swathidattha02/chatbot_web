const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { protect } = require("../middleware/auth");
const {
    uploadMaterial,
    getTeacherMaterials,
    getStudentMaterials,
    deleteMaterial,
    downloadMaterial
} = require("../controllers/classMaterialController");

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, "../../uploads/class-materials");
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "CLASS-" + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx|png|jpg|jpeg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb(new Error("Only PDF, documents and images are allowed"));
    }
});

router.post("/upload", protect, upload.single("file"), uploadMaterial);
router.get("/teacher", protect, getTeacherMaterials);
router.get("/student", protect, getStudentMaterials);
router.delete("/:id", protect, deleteMaterial);
router.get("/download/:id", downloadMaterial);

module.exports = router;
