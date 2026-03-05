const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        subjectId: { type: Number, required: true },
        subjectName: { type: String, required: true },
        chapterId: { type: Number, required: true },
        chapterName: { type: String, required: true },

        // Did the student pass this quiz?
        passed: { type: Boolean, default: false },

        // Score details
        score: { type: Number, default: 0 }, // number of correct answers
        totalQ: { type: Number, default: 10 },
        percentage: { type: Number, default: 0 }, // 0-100

        // Attempt history
        attempts: [
            {
                score: Number,
                percentage: Number,
                passed: Boolean,
                takenAt: { type: Date, default: Date.now },
            }
        ],

        lastAttempt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

quizSchema.index({ userId: 1, subjectId: 1, chapterId: 1 }, { unique: true });

module.exports = mongoose.model("Quiz", quizSchema);
