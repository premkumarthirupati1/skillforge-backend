const express = require('express');
const router = express.Router();
const copilotController = require('../controllers/copilotController');
const { optionalAuth } = require('../middlewares/optionalAuth');
const { searchLimiter } = require('../middlewares/rateLimiter');

// Copilot Chat endpoint with rate limiting & optional auth
router.post('/chat', optionalAuth, searchLimiter, copilotController.handleCopilotChat);

// Copilot Catalog endpoint
router.get('/courses', optionalAuth, copilotController.getCopilotCourses);

module.exports = router;
