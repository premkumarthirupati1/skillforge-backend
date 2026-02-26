const express = require('express');

const router = express.Router();

const courseController = require('../controllers/course');

const { protect } = require('../middlewares/protect');

const { authorizeRoles } = require('../middlewares/authorizeRoles');

router.post('/create-course', protect, authorizeRoles("admin", "instructor"), courseController.createCourse);

router.get('/:courseId/full', protect, authorizeRoles("student", "admin"), courseController.getCourseInfo);

router.patch('/:courseId/publish', protect, authorizeRoles("instructor"), courseController.publishCourse);

router.delete('/:courseId/delete', protect, authorizeRoles("instructor", "admin"), courseController.deleteCourse);
module.exports = router;

