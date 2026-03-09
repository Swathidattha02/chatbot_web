const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password",
            });
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
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
        const token = jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, {
            expiresIn: "30d",
        });

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
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            user,
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
