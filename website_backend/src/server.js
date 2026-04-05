const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL || 'https://chatbot-cwhbnsauy-pavansivasairahulbabu-7076s-projects.vercel.app/'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const documentRoutes = require("./routes/documentRoutes");
const progressRoutes = require("./routes/progress");
const teacherRoutes = require("./routes/teacherRoutes");
const quizRoutes = require("./routes/quizRoutes");
const violationRoutes = require("./routes/violationRoutes");
const awayTimeRoutes = require("./routes/awayTimeRoutes");
const ttsRoutes = require("./routes/ttsRoutes");
const translationRoutes = require("./routes/translationRoutes");
const classMaterialRoutes = require("./routes/classMaterialRoutes");

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api", teacherRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api", violationRoutes);
app.use("/api", awayTimeRoutes);
app.use("/api", ttsRoutes);
app.use("/api", translationRoutes);
app.use("/api/class-materials", classMaterialRoutes);

// Static files
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check route
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "AI Avatar Website Backend API is running",
        version: "1.0.0",
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error("Server Error:", err);
    res.status(500).json({
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
});

// Connect to MongoDB
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 API URL: http://localhost:${PORT}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/`);
});
