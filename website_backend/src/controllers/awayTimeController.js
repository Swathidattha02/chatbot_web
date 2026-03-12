const AwayLog = require('../models/AwayLog');

// Record an away-time event
exports.recordAwayTime = async (req, res) => {
  try {
    const { sessionId, leftAt, returnedAt, duration } = req.body;
    const userId = req.user.id;

    if (!sessionId || !leftAt || !returnedAt || duration == null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const awayLog = new AwayLog({
      userId,
      sessionId,
      leftAt,
      returnedAt,
      duration
    });

    await awayLog.save();
    res.status(201).json({ message: 'Away time recorded', awayLog });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get away-time logs for a session
exports.getAwayTime = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const logs = await AwayLog.find({ sessionId, userId: req.user.id })
      .sort({ leftAt: -1 })
      .limit(100);

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
