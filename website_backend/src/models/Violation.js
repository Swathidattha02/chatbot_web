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
      'visibility_hidden'
    ],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  sessionId: {
    type: String
  }
});

module.exports = mongoose.model('Violation', violationSchema);
