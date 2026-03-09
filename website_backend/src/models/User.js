const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
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
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"],
        },
        avatar: {
            type: String,
            default: "https://via.placeholder.com/150",
        },
        phone: {
            type: String,
            trim: true,
        },
        rollNumber: {
            type: String,
            trim: true,
        },
        class: {
            type: String,
            required: [true, "Class is required"],
            enum: ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"],
        },
        section: {
            type: String,
            trim: true,
        },
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
        },
        schoolName: {
            type: String,
            trim: true,
        },
        classTeacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Teacher",
        },
        role: {
            type: String,
            enum: ["student", "user", "admin"],
            default: "student",
        },
        // Teacher approval workflow
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        rejectionReason: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("User", userSchema);
