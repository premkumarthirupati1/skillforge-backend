const express = require('express');

const { authorizeRoles } = require('../middlewares/authorizeRoles');

const { protect } = require('../middlewares/protect');

const enrollmentController = require('../controllers/enrollment');

const router = express.Router();

router.post('/:courseId', protect, authorizeRoles("instructor"), enrollmentController.enrollInCourse);

router.post('/enrollments', protect, authorizeRoles("instructor"), enrollmentController.getEnrollments);

module.exports = router;