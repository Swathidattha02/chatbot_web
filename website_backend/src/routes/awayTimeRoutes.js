const express = require('express');
const router = express.Router();
const { recordAwayTime, getAwayTime } = require('../controllers/awayTimeController');
const { authenticate } = require('../middleware/auth');

router.post('/away-time', authenticate, recordAwayTime);
router.get('/away-time/:sessionId', authenticate, getAwayTime);

module.exports = router;
