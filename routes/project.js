const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/protect');
const projectController = require('../controllers/projectController');

// All project workspace operations require user authentication
router.post('/progress', protect, projectController.saveProjectProgress);
router.get('/progress/:projectId', protect, projectController.getProjectProgress);
router.get('/builds', protect, projectController.getUserBuilds);

module.exports = router;
