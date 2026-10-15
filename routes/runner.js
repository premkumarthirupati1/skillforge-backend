const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/protect');
const runnerController = require('../controllers/runnerController');

// POST /api/runner/execute (Authentication required)
router.post('/execute', protect, runnerController.executeCode);

// POST /api/runner/ai-assist (Authentication required)
router.post('/ai-assist', protect, runnerController.getAiMentorAssistance);

module.exports = router;
