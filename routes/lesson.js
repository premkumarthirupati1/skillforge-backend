const express = require('express');
const { protect } = require('../middlewares/protect');
const { authorizeRoles } = require('../middlewares/authorizeRoles');
const { upload } = require('../middlewares/upload');
const lessonController = require('../controllers/lesson');

const router = express.Router();

router.post(
  '/create-lesson',
  protect,
  authorizeRoles("instructor"),
  upload.single('lessonFile'),
  lessonController.createLesson
);

router.patch(
  '/:lessonId/complete',
  protect,
  authorizeRoles("student"),
  lessonController.completedLesson
);

router.patch(
  '/:lessonId/update-lesson',
  protect,
  authorizeRoles("instructor", "admin"),
  lessonController.updateLesson
);

router.get(
  '/get-lesson/:lessonId',
  protect,
  authorizeRoles("instructor", "admin", "student"),
  lessonController.getLesson
);

router.get(
  '/:moduleId',
  protect,
  authorizeRoles("instructor", "admin"),
  lessonController.fetchLessons
);

module.exports = router;