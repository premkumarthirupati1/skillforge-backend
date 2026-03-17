const express = require('express');

const router = express.Router();

const courseController = require('../controllers/course');

const { protect } = require('../middlewares/protect');

const { upload } = require('../middlewares/upload');

const { authorizeRoles } = require('../middlewares/authorizeRoles');

router.get('/public', protect, authorizeRoles("admin", "instructor", "student"), courseController.showCourses);

router.post('/create-course', protect, authorizeRoles("admin", "instructor"), upload.single('thumbnail'), courseController.createCourse);

router.get('/:courseId/full', protect, authorizeRoles("student", "instructor", "admin"), courseController.getCourseInfo);

router.patch('/:courseId/publish', protect, authorizeRoles("instructor"), courseController.publishCourse);

router.delete('/:courseId/delete',
    protect,
    authorizeRoles("instructor", "admin"),
    courseController.deleteCourse
);

router.patch('/:courseId/restore',
    protect,
    authorizeRoles("instructor", "admin"),
    courseController.restoreCourse
);

router.get('/instructor', protect, authorizeRoles("instructor", "admin"), courseController.getCourses);

// router.patch('/:courseId/restore-enrollments', protect, authorizeRoles("instructor", "admin"), courseController.restoreCourseEnrollments);

router.patch('/:courseId/update-course', protect, authorizeRoles("admin", "instructor"), upload.single('thumbnail'), courseController.updateCourse);
module.exports = router;

