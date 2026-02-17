const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    classLevel: {
      type: Number,
      required: true,
      enum: [6, 7, 8, 9, 10],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);
