const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    enum: [
      'tab_switch',
      'focus_lost',
      'window_blur',
      'visibility_hidden',
      'window_resize'
    ],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  sessionId: {
    type: String
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Violation', violationSchema);
