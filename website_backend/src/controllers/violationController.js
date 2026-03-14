const Violation = require('../models/Violation');
const Teacher = require('../models/Teacher');
const User = require('../models/User');

// Helper: Auto-complete old violations (without endTime after 2 minutes - matches frontend threshold)
async function autoCompleteOldViolations() {
  try {
    const THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes - matches frontend ONGOING_THRESHOLD_MS
    const thresholdAgo = new Date(Date.now() - THRESHOLD_MS);

    // Find violations without endTime that are older than 2 minutes
    const oldViolations = await Violation.find({
      endTime: null,
      startTime: { $lt: thresholdAgo }
    });

    if (oldViolations.length === 0) return;

    console.log(`🔄 [autoCompleteOldViolations] Found ${oldViolations.length} violations older than 5 minutes to complete`);

    // Update each violation with calculated duration
    for (const violation of oldViolations) {
      const now = Date.now();
      const duration = Math.max(0, now - new Date(violation.startTime));
      violation.endTime = new Date(now);
      violation.duration = duration;
      await violation.save();
      console.log(`✅ [autoCompleteOldViolations] Auto-completed old violation ${violation._id}: ${Math.floor(duration / 1000)}s`);
    }
  } catch (err) {
    console.error('❌ [autoCompleteOldViolations] Error:', err.message);
  }
}

// Record a violation
exports.recordViolation = async (req, res) => {
  try {
    const { reason, sessionId, startTime, endTime } = req.body;
    const userId = req.user.id;
    const username = req.user.username || "unknown";

    const violationStart = startTime ? new Date(startTime) : new Date();
    const violationEnd = endTime ? new Date(endTime) : null;
    
    // Calculate duration if both times are provided (in milliseconds)
    const duration = violationEnd ? Math.max(0, violationEnd - violationStart) : 0;

    const violation = new Violation({
      userId,
      username,
      reason: reason || 'focus_lost',
      sessionId,
      startTime: violationStart,
      endTime: violationEnd,
      duration
    });

    await violation.save();
    res.status(201).json({ message: 'Violation recorded', violation });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// End violation and calculate duration
exports.endViolation = async (req, res) => {
  try {
    const { violationId, endTime } = req.body;
    const userId = req.user.id;

    const violation = await Violation.findById(violationId);
    if (!violation) {
      return res.status(404).json({ message: 'Violation not found' });
    }

    if (violation.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const end = new Date(endTime);
    const duration = Math.max(0, end - violation.startTime);

    violation.endTime = end;
    violation.duration = duration;

    await violation.save();
    res.json({ message: 'Violation ended', violation });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all violations (admin only)
exports.getAllViolations = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Auto-complete old violations before fetching
    await autoCompleteOldViolations();

    const { page = 1, limit = 50, username } = req.query;
    
    // Admin should only see violations from their school's students
    const students = await User.find({ school: req.user.id }).distinct('_id');
    const query = { userId: { $in: students } };
    
    if (username) {
      query.username = new RegExp(username, 'i');
    }

    const violations = await Violation.find(query)
      .sort({ startTime: -1, timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Violation.countDocuments(query);

    res.json({ violations, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get violations for current user
exports.getMyViolations = async (req, res) => {
  try {
    // Auto-complete old violations before fetching
    await autoCompleteOldViolations();

    const violations = await Violation.find({ userId: req.user.id })
      .sort({ startTime: -1, timestamp: -1 })  // Sort by startTime first, then timestamp
      .limit(100);

    res.json({ violations, total: violations.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get violation stats (admin only)
exports.getStats = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Filter stats by admin's school
    const studentsInSchool = await User.find({ school: req.user.id }).distinct('_id');
    const studentUsernames = await User.find({ school: req.user.id }).distinct('name');

    const totalViolations = await Violation.countDocuments({ userId: { $in: studentsInSchool } });

    const byReason = await Violation.aggregate([
      { $match: { userId: { $in: studentsInSchool } } },
      { $group: { _id: '$reason', count: { $sum: 1 } } }
    ]);

    const byUser = await Violation.aggregate([
      { $match: { userId: { $in: studentsInSchool } } },
      { $group: { _id: '$username', count: { $sum: 1 }, totalDuration: { $sum: '$duration' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const last24h = await Violation.countDocuments({
      userId: { $in: studentsInSchool },
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    const totalDurationStats = await Violation.aggregate([
      { $match: { userId: { $in: studentsInSchool } } },
      { $group: { _id: null, totalDuration: { $sum: '$duration' }, avgDuration: { $avg: '$duration' } } }
    ]);

    const totalDuration = totalDurationStats[0]?.totalDuration || 0;
    const avgDuration = totalDurationStats[0]?.avgDuration || 0;

    res.json({ 
      totalViolations, 
      byReason, 
      byUser, 
      last24h,
      totalDurationMs: totalDuration,
      avgDurationMs: avgDuration
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get violations for teacher's students only
exports.getTeacherViolations = async (req, res) => {
  try {
    console.log('🔍 [getTeacherViolations] Start - req.user:', {
      id: req.user.id,
      role: req.user.role,
      username: req.user.username
    });

    // Check role is teacher
    if (req.user.role !== 'teacher') {
      console.log('❌ [getTeacherViolations] Not a teacher, role:', req.user.role);
      return res.status(403).json({ success: false, message: 'Forbidden: Teachers only' });
    }

    // Get teacher details
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      console.log('❌ [getTeacherViolations] Teacher not found for id:', req.user.id);
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    console.log('✅ [getTeacherViolations] Teacher found:', {
      name: teacher.name,
      school: teacher.school,
      assignedClass: teacher.assignedClass,
      assignedSection: teacher.assignedSection
    });

    // Convert teacher.assignedClass to match User.class format ("10" -> "Class 10")
    const classMatch = `Class ${teacher.assignedClass}`;

    // Build query
    const query = {
      school: teacher.school,
      class: classMatch,
      section: teacher.assignedSection,
      status: 'approved'
    };

    console.log('🔎 [getTeacherViolations] Student query:', query);

    // Find approved students in teacher's class + section + school
    const students = await User.find(query, '_id name email');

    console.log('✅ [getTeacherViolations] Found', students.length, 'students:',
      students.map(s => ({ id: s._id, name: s.name }))
    );

    const studentIds = students.map(s => s._id);

    if (studentIds.length === 0) {
      console.log('⚠️  [getTeacherViolations] No students found - returning empty violations');
      return res.json({
        success: true,
        violations: [],
        total: 0,
        page: 1,
        limit: 50,
        stats: { totalViolations: 0, byReason: [], byUser: [], last24h: 0 }
      });
    }

    // Auto-complete old violations for these students
    await autoCompleteOldViolations();

    // Query violations for these students
    const { page = 1, limit = 50 } = req.query;
    const violations = await Violation.find({ userId: { $in: studentIds } })
      .sort({ startTime: -1, timestamp: -1 })  // Sort by startTime first, then timestamp
      .skip((Number.parseInt(page) - 1) * Number.parseInt(limit))
      .limit(Number.parseInt(limit));

    console.log('✅ [getTeacherViolations] Found', violations.length, 'violations');
    console.log('📋 [getTeacherViolations] Violation details:', violations.map(v => ({
      _id: v._id,
      userId: v.userId,
      username: v.username,
      reason: v.reason,
      startTime: v.startTime,
      endTime: v.endTime,
      duration: v.duration,
      timestamp: v.timestamp
    })));

    const total = await Violation.countDocuments({ userId: { $in: studentIds } });

    // Stats for teacher's class
    const byReason = await Violation.aggregate([
      { $match: { userId: { $in: studentIds } } },
      { $group: { _id: '$reason', count: { $sum: 1 } } }
    ]);

    const byUser = await Violation.aggregate([
      { $match: { userId: { $in: studentIds } } },
      { $group: { _id: '$username', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const last24h = await Violation.countDocuments({
      userId: { $in: studentIds },
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    console.log('✅ [getTeacherViolations] Stats:', { total, last24h, byReasonCount: byReason.length });

    res.json({
      success: true,
      violations,
      total,
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      stats: { totalViolations: total, byReason, byUser, last24h }
    });
  } catch (err) {
    console.error('❌ [getTeacherViolations] Error:', err.message, err.stack);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
