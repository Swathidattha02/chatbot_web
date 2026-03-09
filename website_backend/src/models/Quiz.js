const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        studentName: { type: String, default: "" },
        school: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
        studentClass: { type: String, default: "" },
        section: { type: String, default: "" },
        classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },

        subjectId: { type: Number, required: true },
        subjectName: { type: String, required: true },
        chapterId: { type: Number, required: true },
        chapterName: { type: String, required: true },

        // Best attempt
        passed: { type: Boolean, default: false },
        score: { type: Number, default: 0 },
        totalQ: { type: Number, default: 10 },
        percentage: { type: Number, default: 0 },

        // All attempts
        attempts: [
            {
                score: Number,
                percentage: Number,
                passed: Boolean,
                takenAt: { type: Date, default: Date.now },
            },
        ],

        lastAttempt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

quizSchema.index({ userId: 1, subjectId: 1, chapterId: 1 }, { unique: true });

module.exports = mongoose.model("Quiz", quizSchema);

