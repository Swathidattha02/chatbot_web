const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        subjectId: {
            type: Number,
            required: true,
        },
        subjectName: {
            type: String,
            required: true,
        },
        chapterId: {
            type: Number,
            required: true,
        },
        chapterName: {
            type: String,
            required: true,
        },
        timeSpent: {
            type: Number, // in minutes
            default: 0,
        },
        completed: {
            type: Boolean,
            default: false,
        },
        lastAccessed: {
            type: Date,
            default: Date.now,
        },
        sessions: [
            {
                date: {
                    type: Date,
                    default: Date.now,
                },
                duration: {
                    type: Number, // duration of this specific session
                    required: true,
                }
            }
        ]
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
progressSchema.index({ userId: 1, subjectId: 1, chapterId: 1 });

module.exports = mongoose.model("Progress", progressSchema);
