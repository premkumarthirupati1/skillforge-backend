const express = require('express');

const router = express.Router();

const { protect } = require('../middlewares/protect');

const { authorizeRoles } = require('../middlewares/authorizeRoles');

const { upload } = require('../middlewares/upload');

const lessonController = require('../controllers/lesson');

router.post('/create-lesson', protect, authorizeRoles("instructor"), upload.single('lessonFile'), lessonController.createLesson);


router.patch('/:lessonId/complete', protect, authorizeRoles("student"), lessonController.completedLesson);

router.patch('/:lessonId/update-lesson', protect, authorizeRoles("instructor", "admin"), lessonController.updateLesson);

router.get('/get-lesson/:lessonId', protect, authorizeRoles("instructor", "admin", "student"), lessonController.getLesson);

router.get('/:moduleId', protect, authorizeRoles("instructor", "admin"),
    lessonController.fetchLessons)

module.exports = router;