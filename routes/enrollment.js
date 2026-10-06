const express = require('express');
const { authorizeRoles } = require('../middlewares/authorizeRoles');
const { protect } = require('../middlewares/protect');
const enrollmentController = require('../controllers/enrollment');

const router = express.Router();

router.post(
  '/get-courses',
  protect,
  authorizeRoles("student"),
  enrollmentController.getEnrollments
);

router.post(
  '/:courseId/enroll',
  protect,
  authorizeRoles("student"),
  enrollmentController.enrollInCourse
);

router.get(
  '/:courseId/progress',
  protect,
  authorizeRoles("student"),
  enrollmentController.getSingleCourseProgress
);
router.patch(
  '/:courseId/toggle-lesson',
  protect,
  authorizeRoles("student"),
  enrollmentController.toggleLessonCompletion
);

module.exports = router;