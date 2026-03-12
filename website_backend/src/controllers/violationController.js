const Violation = require('../models/Violation');

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
