const express = require('express');
const { authorizeRoles } = require('../middlewares/authorizeRoles');
const { protect } = require('../middlewares/protect');
const enrollmentController = require('../controllers/enrollment');

const router = express.Router();

router.post(
  '/get-courses',
  protect,
  authorizeRoles("student", "instructor"),
  enrollmentController.getEnrollments
);

router.post(
  '/:courseId/enroll',
  protect,
  authorizeRoles("student", "instructor"),
  enrollmentController.enrollInCourse
);

router.get(
  '/:courseId/progress',
  protect,
  authorizeRoles("student", "instructor"),
  enrollmentController.getSingleCourseProgress
);
router.patch(
  '/:courseId/toggle-lesson',
  protect,
  authorizeRoles("student", "instructor"),
  enrollmentController.toggleLessonCompletion
);

module.exports = router;
