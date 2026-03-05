/**
 * Seed script: Pre-populates Admin accounts in the database.
 * Run with: node src/scripts/seedAdmins.js
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const Admin = require("../models/Admin");

const admins = [
    {
        name: "Principal Ravi Kumar",
        email: "admin@narayana.com",
        password: "narayana@123",
        schoolName: "Narayana School",
        schoolSlug: "narayana_school",
        classes: [6, 7, 8, 9, 10],
        sectionsPerClass: {
            "6": ["A", "B"],
            "7": ["A", "B"],
            "8": ["A", "B", "C"],
            "9": ["A", "B", "C"],
            "10": ["A", "B", "C"],
        },
    },
    {
        name: "Principal Sita Devi",
        email: "admin@chaitanya.com",
        password: "chaitanya@123",
        schoolName: "Chaitanya School",
        schoolSlug: "chaitanya_school",
        classes: [6, 7, 8, 9, 10],
        sectionsPerClass: {
            "6": ["A", "B"],
            "7": ["A", "B"],
            "8": ["A", "B"],
            "9": ["A", "B"],
            "10": ["A", "B"],
        },
    },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB");

        for (const adminData of admins) {
            const exists = await Admin.findOne({ email: adminData.email });
            if (exists) {
                console.log(`⚠️  Admin already exists: ${adminData.email}`);
                continue;
            }
            const hashedPassword = await bcrypt.hash(adminData.password, 12);
            await Admin.create({ ...adminData, password: hashedPassword });
            console.log(`✅ Created admin: ${adminData.email}`);
        }

        console.log("🎉 Seed complete!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Seed error:", err);
        process.exit(1);
    }
}

seed();
