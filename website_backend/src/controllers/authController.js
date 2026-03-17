const User = require("../models/User");
const Teacher = require("../models/Teacher");
const Admin = require("../models/Admin");
const Violation = require("../models/Violation");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongoose").Types;
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
    try {
        const { name, email, password, class: userClass, phone,
            section, schoolId, classTeacherId, rollNumber } = req.body;
        const extraFields = { section, schoolId, classTeacherId, rollNumber };


        // Validation
        if (!name || !email || !password || !userClass) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields",
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists with this email",
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user with pending status
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            class: userClass,
            phone,
            section: extraFields?.section,
            school: extraFields?.schoolId,
            classTeacher: extraFields?.classTeacherId,
            rollNumber: extraFields?.rollNumber,
            status: "pending", // Requires teacher approval
        });

        // DO NOT return token — student must wait for teacher approval
        res.status(201).json({
            success: true,
            pending: true,
            message: "Registration submitted! Please wait for your class teacher to approve your account.",
            user: {
                name: user.name,
                email: user.email,
                class: user.class,
                section: user.section,
                status: "pending",
            },
        });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during signup",
            error: error.message,
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`[loginStudent] Attempt: ${email}`, req.body);

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password",
            });
        }

        // Check if user exists
        console.log(`[loginStudent] Attempt: ${email}`);
        const user = await User.findOne({ email });
        if (!user) {
            console.log(`[loginStudent] Failed: User not found - ${email}`);
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log(`[loginStudent] Failed: Password mismatch - ${email}`);
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Check approval status
        if (user.status === "pending") {
            return res.status(403).json({
                success: false,
                pending: true,
                message: "Your account is pending approval from your class teacher. Please wait.",
            });
        }

        if (user.status === "rejected") {
            return res.status(403).json({
                success: false,
                rejected: true,
                message: `Your registration was rejected. Reason: ${user.rejectionReason || "Contact your class teacher."}`,
            });
        }

        // Generate JWT token
        console.log(`[loginStudent] Success: ${email}`);
        const token = jwt.sign(
            {
                userId: user._id.toString(),
                role: user.role || "student",
                username: user.name,
            },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                class: user.class,
                phone: user.phone,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during login",
            error: error.message,
        });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const role = req.user.role;
        let userData;

        if (role === "teacher") {
            userData = await Teacher.findById(req.user.id).select("-password");
        } else if (role === "admin") {
            userData = await Admin.findById(req.user.id).select("-password");
        } else {
            userData = await User.findById(req.user.id).select("-password");
        }

        // Final fallback if role check didn't work as expected
        if (!userData) {
            userData = await User.findById(req.user.id).select("-password") ||
                       await Teacher.findById(req.user.id).select("-password") ||
                       await Admin.findById(req.user.id).select("-password");
        }

        if (!userData) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            user: userData,
        });
    } catch (error) {
        console.error("Get User Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

// @desc    Logout user - closes any open violations
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
    try {
        const userId = req.user.id;
        const logoutTime = new Date();
        
        console.log(`🔓 [Logout] User ${userId} logging out at ${logoutTime}`);
        console.log(`🔓 [Logout] Type of userId: ${typeof userId}, Value: ${userId}`);
        
        // Convert userId to ObjectId for proper query matching
        let userObjectId;
        try {
            userObjectId = new ObjectId(userId);
        } catch (err) {
            console.error("❌ [Logout] Invalid userId format:", userId);
            userObjectId = userId; // fallback to string comparison
        }
        
        // Find all open violations for this user (no endTime)
        const openViolations = await Violation.find({
            userId: userObjectId,
            endTime: null
        });
        
        console.log(`📌 [Logout] Found ${openViolations.length} open violations to close`);
        if (openViolations.length > 0) {
            console.log(`📜 [Logout] Violations:`, openViolations.map(v => ({ id: v._id, reason: v.reason, startTime: v.startTime })));
        }
        
        // Close each violation with logout time
        let closedCount = 0;
        for (const violation of openViolations) {
            const startTime = new Date(violation.startTime);
            const duration = logoutTime - startTime;
            
            violation.endTime = logoutTime;
            violation.duration = duration;
            const saved = await violation.save();
            closedCount++;
            
            console.log(`✅ [Logout] Closed violation ${violation._id}: ${Math.floor(duration / 1000)}s | EndTime: ${saved.endTime}`);
        }
        
        // Verify violations are closed
        const remainingOpen = await Violation.countDocuments({ userId: userObjectId, endTime: null });
        console.log(`🔍 [Logout] Verification: ${remainingOpen} violations still open | Closed: ${closedCount}`);
        
        res.status(200).json({
            success: true,
            message: `Logout successful. Closed ${closedCount} violation(s).`,
            closedViolations: closedCount
        });
    } catch (error) {
        console.error("❌ [Logout] Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during logout",
            error: error.message,
        });
    }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No user found with this email",
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(20).toString("hex");

        // Hash token and set to resetPasswordToken field
        user.resetPasswordToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        // Set expire (10 minutes)
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

        await user.save({ validateBeforeSave: false });

        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/student/${resetToken}`;

        const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

        try {
            await sendEmail({
                email: user.email,
                subject: "Password Reset Token",
                message,
                html: `
                    <h1>Password Reset Requested</h1>
                    <p>Click the link below to reset your password. This link is valid for 10 minutes.</p>
                    <a href="${resetUrl}" style="padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                    <p>If you did not request this, please ignore this email.</p>
                `,
            });

            res.status(200).json({
                success: true,
                message: "Email sent successfully",
            });
        } catch (err) {
            console.error(err);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(500).json({
                success: false,
                message: "Email could not be sent",
            });
        }
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during forgot password",
        });
    }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
    try {
        // Get hashed token
        const resetPasswordToken = crypto
            .createHash("sha256")
            .update(req.params.token)
            .digest("hex");

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired token",
            });
        }

        // Set the new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Password reset successful, you can now login",
        });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during password reset",
        });
    }
};
