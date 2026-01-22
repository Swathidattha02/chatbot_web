const mongoose = require("mongoose");

const chatHistorySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        messages: [
            {
                role: {
                    type: String,
                    enum: ["user", "assistant"],
                    required: true,
                },
                content: {
                    type: String,
                    required: true,
                },
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
                audioUrl: {
                    type: String, // URL to audio file if avatar spoke
                },
            },
        ],
        sessionName: {
            type: String,
            default: "New Chat",
        },
        language: {
            type: String,
            default: "en",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("ChatHistory", chatHistorySchema);
