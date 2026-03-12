const Violation = require('../models/Violation');
const Teacher = require('../models/Teacher');
const User = require('../models/User');

// Record a violation
exports.recordViolation = async (req, res) => {
  try {
    const { reason, sessionId } = req.body;
    const userId = req.user.id;
    const username = req.user.username || "unknown";

    const violation = new Violation({
      userId,
      username,
      reason: reason || 'focus_lost',
      sessionId
    });

    await violation.save();
    res.status(201).json({ message: 'Violation recorded', violation });
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

    const { page = 1, limit = 50, username } = req.query;
    const query = username ? { username: new RegExp(username, 'i') } : {};

    const violations = await Violation.find(query)
      .sort({ timestamp: -1 })
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
    const violations = await Violation.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
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

    const totalViolations = await Violation.countDocuments();

    const byReason = await Violation.aggregate([
      { $group: { _id: '$reason', count: { $sum: 1 } } }
    ]);

    const byUser = await Violation.aggregate([
      { $group: { _id: '$username', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const last24h = await Violation.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({ totalViolations, byReason, byUser, last24h });
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

    // Query violations for these students
    const { page = 1, limit = 50 } = req.query;
    const violations = await Violation.find({ userId: { $in: studentIds } })
      .sort({ timestamp: -1 })
      .skip((Number.parseInt(page) - 1) * Number.parseInt(limit))
      .limit(Number.parseInt(limit));

    console.log('✅ [getTeacherViolations] Found', violations.length, 'violations');
    console.log('📋 [getTeacherViolations] Violation details:', violations.map(v => ({
      _id: v._id,
      userId: v.userId,
      username: v.username,
      reason: v.reason,
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
