const express = require('express');

const router = express.Router();

const courseController = require('../controllers/course');

const { protect } = require('../middlewares/protect');

const { authorizeRoles } = require('../middlewares/authorizeRoles');

router.post('/create-course', protect, authorizeRoles("admin", "instructor"), courseController.createCourse);

module.exports = router;

