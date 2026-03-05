const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Teacher name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
        },
        phone: {
            type: String,
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"],
        },
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            required: [true, "School is required"],
        },
        schoolName: {
            type: String,
            required: true,
        },
        assignedClass: {
            type: String,
            required: [true, "Class is required"],
            enum: ["6", "7", "8", "9", "10"],
        },
        assignedSection: {
            type: String,
            required: [true, "Section is required"],
        },
        role: {
            type: String,
            default: "teacher",
        },
        avatar: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

// Unique constraint: one teacher per school+class+section
teacherSchema.index(
    { school: 1, assignedClass: 1, assignedSection: 1 },
    { unique: true }
);

module.exports = mongoose.model("Teacher", teacherSchema);
