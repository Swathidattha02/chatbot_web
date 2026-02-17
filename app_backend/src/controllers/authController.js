const Student = require("../models/Student");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const emailRegex = /^[a-z0-9._%+-]+@gmail\.com$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}$/;

exports.signupStudent = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, classLevel } = req.body;
    if (!emailRegex.test(email)) {
  return res.status(400).json({
    message: "Email must be lowercase and end with @gmail.com",
  });
}
    // 1️⃣ Check all fields
    if (!name || !email || !password || !confirmPassword || !classLevel) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!passwordRegex.test(password)) {
  return res.status(400).json({
    message:
      "Password must be at least 6 characters and include uppercase, lowercase, number & special character",
  });
}

    // 3️⃣ Check existing student
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ message: "Student already exists" });
    }

    // 4️⃣ Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5️⃣ Save student
    const student = await Student.create({
      name,
      email,
      password: hashedPassword,
      classLevel,
    });

    // 6️⃣ Create token
    const token = jwt.sign(
      { id: student._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Signup successful",
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        classLevel: student.classLevel,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
exports.loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Check fields
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // 2️⃣ Check student exists
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 3️⃣ Compare password
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 4️⃣ Create token
    const token = jwt.sign(
      { id: student._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5️⃣ Send response
    res.status(200).json({
      message: "Login successful",
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        classLevel: student.classLevel,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
