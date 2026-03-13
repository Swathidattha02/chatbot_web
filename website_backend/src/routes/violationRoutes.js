const express = require('express');
const router = express.Router();
const { recordViolation, getAllViolations, getMyViolations, getStats, endViolation } = require('../controllers/violationController');
const { authenticate } = require('../middleware/auth');

router.post('/violation', authenticate, recordViolation);
router.post('/violation/end', authenticate, endViolation);
router.get('/violations', authenticate, getAllViolations);
router.get('/my-violations', authenticate, getMyViolations);
router.get('/stats', authenticate, getStats);

module.exports = router;
