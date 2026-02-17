const authRoutes = require("./routes/authRoutes");
const ragRoutes = require("./routes/ragRoutes");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/rag", ragRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Backend server is running");
});

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
