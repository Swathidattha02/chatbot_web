const express = require("express");
const router = express.Router();
const { signupStudent, loginStudent } = require("../controllers/authController");

// Signup route
router.post("/signup", signupStudent);

// Login route
router.post("/login", loginStudent);

module.exports = router;
