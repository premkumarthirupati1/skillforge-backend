const express = require('express');
const router = express.Router();
const runnerController = require('../controllers/runnerController');

// POST /api/runner/execute
router.post('/execute', runnerController.executeCode);

// POST /api/runner/ai-assist
router.post('/ai-assist', runnerController.getAiMentorAssistance);

module.exports = router;
