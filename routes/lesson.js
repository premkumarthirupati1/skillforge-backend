const express = require('express');

const router = express.Router();

const { protect } = require('../middlewares/protect');

const { authorizeRoles } = require('../middlewares/authorizeRoles');

const lessonController = require('../controllers/lesson');

router.post('/create-lesson', protect, authorizeRoles("instructor"), lessonController.createLesson);

router.post('/:lessonId/complete', protect, authorizeRoles("student"), lessonController.completedLesson);

router.patch('/:lessonId/update-lesson', protect, authorizeRoles("instructor", "admin"), lessonController.updateLesson);

module.exports = router;