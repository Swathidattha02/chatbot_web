const mongoose = require('mongoose');

const AwayLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  leftAt: {
    type: Date,
    required: true
  },
  returnedAt: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('AwayLog', AwayLogSchema);
