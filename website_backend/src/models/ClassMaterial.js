const mongoose = require("mongoose");

const classMaterialSchema = new mongoose.Schema(
    {
        teacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Teacher",
            required: true,
        },
        teacherName: {
            type: String,
            required: true,
        },
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            required: true,
        },
        class: {
            type: String, // e.g., "Class 10" or "10"
            required: true,
        },
        section: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        type: {
            type: String,
            enum: ["document", "announcement"],
            required: true,
        },
        fileUrl: {
            type: String, // URL to the uploaded file
        },
        fileName: {
            type: String,
        },
        fileType: {
            type: String, // e.g., "pdf"
        },
        isReadBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            }
        ]
    },
    { timestamps: true }
);

module.exports = mongoose.model("ClassMaterial", classMaterialSchema);
