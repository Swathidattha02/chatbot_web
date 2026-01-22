const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        fileName: {
            type: String,
            required: true,
        },
        fileUrl: {
            type: String,
            required: true,
        },
        fileType: {
            type: String,
            enum: ["pdf", "doc", "txt", "other"],
            default: "pdf",
        },
        fileSize: {
            type: Number, // in bytes
        },
        processed: {
            type: Boolean,
            default: false,
        },
        vectorStoreId: {
            type: String, // ID from vector database if using RAG
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Document", documentSchema);
