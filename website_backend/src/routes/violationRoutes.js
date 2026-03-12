const express = require('express');
const router = express.Router();
const { recordViolation, getAllViolations, getMyViolations, getStats } = require('../controllers/violationController');
const { authenticate } = require('../middleware/auth');

router.post('/violation', authenticate, recordViolation);
router.get('/violations', authenticate, getAllViolations);
router.get('/my-violations', authenticate, getMyViolations);
router.get('/stats', authenticate, getStats);

module.exports = router;
