const Progress = require("../models/Progress");

// @desc    Update chapter progress
// @route   POST /api/progress/update
// @access  Private
exports.updateProgress = async (req, res) => {
    try {
        const { subjectId, subjectName, chapterId, chapterName, timeSpent } = req.body;
        const userId = req.user.id;

        // Find existing progress or create new
        let progress = await Progress.findOne({ userId, subjectId, chapterId });

        if (progress) {
            // Update existing progress
            progress.timeSpent += timeSpent;
            progress.lastAccessed = Date.now();

            // Add session to history
            if (!progress.sessions) {
                progress.sessions = [];
            }
            progress.sessions.push({
                date: new Date(),
                duration: timeSpent
            });

            // Mark as completed if spent at least 2 minutes (total)
            if (progress.timeSpent >= 2) {
                progress.completed = true;
            }

            await progress.save();
        } else {
            // Create new progress entry
            progress = await Progress.create({
                userId,
                subjectId,
                subjectName,
                chapterId,
                chapterName,
                timeSpent,
                completed: timeSpent >= 2,
                sessions: [{
                    date: new Date(),
                    duration: timeSpent
                }]
            });
        }

        res.status(200).json({
            success: true,
            progress,
        });
    } catch (error) {
        console.error("Update Progress Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error updating progress",
            error: error.message,
        });
    }
};

// @desc    Get user's progress for all subjects
// @route   GET /api/progress/user
// @access  Private
exports.getUserProgress = async (req, res) => {
    try {
        const userId = req.user.id;
        const progress = await Progress.find({ userId }).sort({ lastAccessed: -1 });

        res.status(200).json({
            success: true,
            progress,
        });
    } catch (error) {
        console.error("Get Progress Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching progress",
            error: error.message,
        });
    }
};

// @desc    Get weekly analytics
// @route   GET /api/progress/analytics/weekly
// @access  Private
exports.getWeeklyAnalytics = async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const progress = await Progress.find({
            userId,
            lastAccessed: { $gte: weekAgo },
        });

        // Calculate daily time spent using precise sessions
        const dailyData = {};
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        // Initialize all days with 0
        days.forEach(day => {
            dailyData[day] = 0;
        });

        const subjectProgress = {};
        let totalTimeThisWeek = 0;

        // Iterate through all progress documents
        progress.forEach(p => {
            // Check sessions for accurate daily breakdown
            if (p.sessions && p.sessions.length > 0) {
                p.sessions.forEach(session => {
                    const sessionDate = new Date(session.date);

                    // Only include sessions from the last week
                    if (sessionDate >= weekAgo) {
                        const dayIndex = sessionDate.getDay();
                        const dayName = days[dayIndex === 0 ? 6 : dayIndex - 1]; // Convert Sunday (0) to index 6

                        const duration = session.duration || 0;
                        dailyData[dayName] += duration;
                        totalTimeThisWeek += duration;

                        // Add to subject progress
                        if (!subjectProgress[p.subjectName]) {
                            subjectProgress[p.subjectName] = {
                                name: p.subjectName,
                                timeSpent: 0,
                                topicsCompleted: 0,
                                totalTopics: 0,
                            };
                        }
                        subjectProgress[p.subjectName].timeSpent += duration;
                    }
                });
            } else {
                // Fallback for old data without sessions (use lastAccessed if within week)
                // This prevents zeroing out data before the update
                if (new Date(p.lastAccessed) >= weekAgo) {
                    const dayIndex = new Date(p.lastAccessed).getDay();
                    const dayName = days[dayIndex === 0 ? 6 : dayIndex - 1];
                    // We can't know the exact duration of "this session" for old data, 
                    // but we assume a portion or just don't count it to avoid inflation.
                    // Better to rely on new data, but maybe add p.timeSpent if it's small?
                    // Let's safe-guard: if sessions are missing, we skip granular tracking or accept inaccuracy
                    // user wants RELIABLE. Sticking to sessions is reliable for FUTURE.
                    // For now, let's just use the old logic ONLY IF sessions array is empty
                    const duration = p.timeSpent || 0;
                    // Only count if it seems reasonable (e.g. < 4 hours single session implies recent update)
                    // Actually, simply adding it to the day of lastAccessed is the best fallback
                    const dayVal = dailyData[dayName];
                    // We add it, but don't duplicate if sessions exist
                    // sessions array check is already done above.
                    dailyData[dayName] += duration;
                    totalTimeThisWeek += duration;

                    if (!subjectProgress[p.subjectName]) {
                        subjectProgress[p.subjectName] = {
                            name: p.subjectName,
                            timeSpent: 0,
                            topicsCompleted: 0,
                            totalTopics: 0,
                        };
                    }
                    subjectProgress[p.subjectName].timeSpent += duration;
                }
            }

            // Always update topic counts (independent of time)
            if (subjectProgress[p.subjectName]) { // Only if we tracked time or activity
                if (p.completed) {
                    subjectProgress[p.subjectName].topicsCompleted += 1;
                }
                subjectProgress[p.subjectName].totalTopics += 1;
            } else {
                // E.g. completed topic but 0 time this week?
                // Logic: "Subject Progress" usually implies "Activity this week".
                // If I completed it last week, should it show?
                // Standard analytics show "Activity + Status".
                // Let's leave it strict to activity.
            }
        });

        // Normalize data for frontend
        // Ensure even if a subject had 0 time but was accessed, it exists?
        // Logic above creates entry only on time addition.

        // Pass 2: ensure we count topics correctly for subjects that were touched
        // Actually, let's keep it simple. Only subjects with active time show up in "Weekly Growth".

        res.status(200).json({
            success: true,
            analytics: {
                totalTime: Math.round(totalTimeThisWeek), // Round to minutes
                dailyData,
                subjectProgress: Object.values(subjectProgress),
            },
        });
    } catch (error) {
        console.error("Get Weekly Analytics Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching analytics",
            error: error.message,
        });
    }
};

// @desc    Get monthly analytics
// @route   GET /api/progress/analytics/monthly
// @access  Private
exports.getMonthlyAnalytics = async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const progress = await Progress.find({
            userId,
            lastAccessed: { $gte: monthAgo },
        });

        // Calculate weekly consistency and subject growth using sessions
        const weeklyData = [0, 0, 0, 0]; // 4 weeks
        const subjectGrowth = {};
        let totalMinutesSpent = 0;
        let activeDaysSet = new Set(); // For consistency calculation

        progress.forEach(p => {
            // Check sessions for accurate breakdown
            if (p.sessions && p.sessions.length > 0) {
                p.sessions.forEach(session => {
                    const sessionDate = new Date(session.date);

                    // Only include sessions from the last 30 days
                    if (sessionDate >= monthAgo) {
                        const daysAgo = Math.floor((now - sessionDate) / (24 * 60 * 60 * 1000));
                        const weekIndex = Math.floor(daysAgo / 7);

                        const duration = session.duration || 0;

                        if (weekIndex < 4) {
                            weeklyData[3 - weekIndex] += duration;
                        }

                        totalMinutesSpent += duration;
                        activeDaysSet.add(sessionDate.toDateString());

                        // Subject Growth
                        if (!subjectGrowth[p.subjectName]) {
                            subjectGrowth[p.subjectName] = {
                                name: p.subjectName,
                                topicsCompleted: 0,
                                totalTopics: 0,
                                proficiency: 0,
                            };
                        }
                    }
                });
            } else {
                // Fallback for old data
                if (new Date(p.lastAccessed) >= monthAgo) {
                    const daysAgo = Math.floor((now - new Date(p.lastAccessed)) / (24 * 60 * 60 * 1000));
                    const weekIndex = Math.floor(daysAgo / 7);

                    const duration = p.timeSpent || 0;
                    if (weekIndex < 4) {
                        weeklyData[3 - weekIndex] += duration;
                    }
                    totalMinutesSpent += duration;
                    activeDaysSet.add(new Date(p.lastAccessed).toDateString());

                    if (!subjectGrowth[p.subjectName]) {
                        subjectGrowth[p.subjectName] = {
                            name: p.subjectName,
                            topicsCompleted: 0,
                            totalTopics: 0,
                            proficiency: 0,
                        };
                    }
                }
            }

            // Always update topic counts if subject exists in growth
            // (meaning it was active or fallback active)
            // But wait, "Monthly" usually also shows proficiency regardless of activity?
            // Original code showed all active subjects.
            if (!subjectGrowth[p.subjectName]) {
                // Even if no time spent this month, maybe we want to show it exists?
                // But "Growth" implies change. Let's stick to active ones or initialize all?
                // Let's initialize if it was found in query (lastAccessed within month)
                if (new Date(p.lastAccessed) >= monthAgo) {
                    subjectGrowth[p.subjectName] = {
                        name: p.subjectName,
                        topicsCompleted: 0,
                        totalTopics: 0,
                        proficiency: 0,
                    };
                }
            }

            if (subjectGrowth[p.subjectName]) {
                if (p.completed) {
                    subjectGrowth[p.subjectName].topicsCompleted += 1;
                }
                subjectGrowth[p.subjectName].totalTopics += 1;
            }
        });

        // Calculate proficiency percentage
        Object.values(subjectGrowth).forEach(subject => {
            subject.proficiency = Math.round((subject.topicsCompleted / subject.totalTopics) * 100) || 0;
        });

        const chaptersCompleted = progress.filter(p => p.completed).length;
        const consistency = Math.round((activeDaysSet.size / 30) * 100);

        // Count AI tutor interactions (user queries) from ChatHistory
        const ChatHistory = require("../models/ChatHistory");
        const chatSessions = await ChatHistory.find({
            userId,
            createdAt: { $gte: monthAgo },
        });

        // Count total user messages across all sessions
        let totalQueries = 0;
        chatSessions.forEach(session => {
            if (session.messages && Array.isArray(session.messages)) {
                totalQueries += session.messages.filter(msg => msg.role === 'user').length;
            }
        });

        res.status(200).json({
            success: true,
            analytics: {
                totalTime: Math.floor(totalMinutesSpent / 60), // Convert to hours
                totalMinutes: Math.round(totalMinutesSpent % 60), // Remaining minutes
                totalMinutesSpent, // Also send total minutes for debugging
                chaptersCompleted,
                consistency,
                aiTutorQueries: totalQueries, // Dynamic count
                weeklyData,
                subjectGrowth: Object.values(subjectGrowth),
            },
        });
    } catch (error) {
        console.error("Get Monthly Analytics Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching analytics",
            error: error.message,
        });
    }
};

// @desc    Get subject-specific progress
// @route   GET /api/progress/subject/:subjectId
// @access  Private
exports.getSubjectProgress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { subjectId } = req.params;

        const progress = await Progress.find({ userId, subjectId });

        res.status(200).json({
            success: true,
            progress,
        });
    } catch (error) {
        console.error("Get Subject Progress Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching subject progress",
            error: error.message,
        });
    }
};
