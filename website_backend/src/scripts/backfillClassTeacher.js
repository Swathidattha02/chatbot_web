/**
 * Backfill classTeacher for all already-approved students.
 * Run once: node src/scripts/backfillClassTeacher.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Teacher = require('../models/Teacher');

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const students = await User.find({ status: 'approved', classTeacher: { $exists: false } });
    console.log(`Found ${students.length} approved students without classTeacher`);

    let fixed = 0;
    for (const student of students) {
        // Find teacher matching this student's school + class + section
        const classNum = student.class?.replace('Class ', '').trim(); // "Class 6" → "6"
        const teacher = await Teacher.findOne({
            school: student.school,
            assignedClass: classNum,
            assignedSection: student.section,
            status: 'approved',
        }).lean();

        if (teacher) {
            student.classTeacher = teacher._id;
            await student.save();
            console.log(`  ✅ ${student.name} → teacher: ${teacher.name}`);
            fixed++;
        } else {
            console.log(`  ⚠️  No teacher found for ${student.name} (${student.class}-${student.section})`);
        }
    }

    console.log(`\n🎉 Done. Fixed ${fixed}/${students.length} students.`);
    await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
