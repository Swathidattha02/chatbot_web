const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/educational-platform')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

const progressSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    subjectId: Number,
    subjectName: String,
    chapterId: Number,
    chapterName: String,
    timeSpent: Number,
    completed: Boolean,
    lastAccessed: Date,
    sessions: [{
        date: Date,
        duration: Number,
        endTime: Date
    }]
}, { timestamps: true });

const Progress = mongoose.model('Progress', progressSchema);

async function fixSessionEndTimes() {
    try {
        console.log('🔧 Starting to fix session end times...');

        // Find all progress documents
        const allProgress = await Progress.find({});
        console.log(`📊 Found ${allProgress.length} progress documents`);

        let updatedCount = 0;

        for (const progress of allProgress) {
            let needsUpdate = false;

            if (progress.sessions && progress.sessions.length > 0) {
                progress.sessions.forEach(session => {
                    // If endTime is missing, calculate it from date + duration
                    if (!session.endTime && session.date && session.duration) {
                        const startTime = new Date(session.date);
                        const endTime = new Date(startTime.getTime() + (session.duration * 60 * 1000));
                        session.endTime = endTime;
                        needsUpdate = true;
                    }
                });

                if (needsUpdate) {
                    await progress.save();
                    updatedCount++;
                    console.log(`✅ Updated ${progress.subjectName} - ${progress.chapterName}`);
                }
            }
        }

        console.log(`\n🎉 Migration complete! Updated ${updatedCount} progress documents.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing session end times:', error);
        process.exit(1);
    }
}

fixSessionEndTimes();
