const express = require('express');

const { authorizeRoles } = require('../middlewares/authorizeRoles');

const { protect } = require('../middlewares/protect');

const enrollmentController = require('../controllers/enrollment');

const router = express.Router();

router.post('/get-courses', protect, authorizeRoles("instructor"), enrollmentController.getEnrollments);

router.post('/:courseId', protect, authorizeRoles("instructor"), enrollmentController.enrollInCourse);

module.exports = router;