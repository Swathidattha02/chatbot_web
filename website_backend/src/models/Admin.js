const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Admin name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
        },
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
        },
        schoolSlug: {
            type: String,
            required: [true, "School slug is required"],
            unique: true,
            lowercase: true,
            trim: true,
            // e.g. "narayana_school" => route: /narayana_school
        },
        classes: {
            type: [Number],
            default: [6, 7, 8, 9, 10],
        },
        // sections per class: { "6": ["A","B"], "7": ["A","B","C"], ... }
        sectionsPerClass: {
            type: Map,
            of: [String],
            default: {},
        },
        role: {
            type: String,
            default: "admin",
        },
        isFirstLogin: {
            type: Boolean,
            default: true,
        },
        resetPasswordToken: String,
        resetPasswordExpire: Date,
    },
    { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
